const express = require('express');
const path = require('path');
const config = require('./config.json');
const energy = require('./energy-prices');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const HA = config.homeassistant;

// =============================================================================
// CONFIGURAZIONE
// =============================================================================
const STRATIFICAZIONE = {
  deltaMin: 1.0, durataMin: 5, pausaMin: 10,
  consumoW: 15, risparmio: '88%'
};

let stratState = { attivo: false, ultimoAvvio: null, ultimoStop: null, motivo: '' };

// =============================================================================
// HA CLIENT
// =============================================================================
async function haFetch(endpoint, options = {}) {
  if (!HA.enabled) return null;
  try {
    const resp = await fetch(`${HA.url}/api/${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${HA.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    console.error('HA Error:', e.message);
    return null;
  }
}

// =============================================================================
// LETTURA METEO DA HA (weather.casa)
// =============================================================================
async function getWeatherHA() {
  const states = await haFetch('states');
  if (!states) return null;

  const weather = states.find(e => e.entity_id === 'weather.casa');
  if (!weather) return null;

  return {
    tempExt: weather.attributes.temperature,
    humidityExt: weather.attributes.humidity,
    condition: weather.state,
    pressure: weather.attributes.pressure,
    windSpeed: weather.attributes.wind_speed,
    forecast: weather.attributes.forecast ? weather.attributes.forecast[0] : null
  };
}

// =============================================================================
// LETTURA STATO HA (sensori + climate)
// =============================================================================
async function getRealState() {
  const states = await haFetch('states');
  if (!states) return null;

  const climates = states.filter(e => e.entity_id.startsWith('climate.'));
  const sensors = states.filter(e => e.entity_id.startsWith('sensor.'));

  const helperEffettiva = sensors.find(s => 
    s.entity_id.includes('temperatura') && 
    (s.entity_id.includes('effettiva') || s.entity_id.includes('reale'))
  );
  const helperDesiderata = sensors.find(s => 
    s.entity_id.includes('temperatura') && 
    (s.entity_id.includes('desiderata') || s.entity_id.includes('target'))
  );
  const humiditySensor = sensors.find(s => s.entity_id.includes('humidity'));

  const termostato = climates.find(c => c.entity_id === HA.entityId) || climates[0];
  const climaSala = climates.find(c => c.entity_id.includes('air_conditioner') || c.entity_id.includes('clima'));

  if (!termostato) return null;

  let indoorTemp, targetTemp;
  if (helperEffettiva && helperDesiderata) {
    indoorTemp = parseFloat(helperEffettiva.state) || termostato.attributes.current_temperature || 20;
    targetTemp = parseFloat(helperDesiderata.state) || termostato.attributes.temperature || 22;
  } else {
    indoorTemp = termostato.attributes.current_temperature || 20;
    targetTemp = termostato.attributes.temperature || 22;
  }

  let humidity = 50;
  if (humiditySensor) humidity = parseFloat(humiditySensor.state) || 50;

  const tempClima = climaSala ? (climaSala.attributes.current_temperature || indoorTemp) : indoorTemp;

  return {
    power: termostato.state !== 'off' && termostato.state !== 'unavailable',
    currentTemp: indoorTemp,
    targetTemp: targetTemp,
    humidity: humidity,
    mode: termostato.attributes.hvac_mode || 'cool',
    lastUpdate: Date.now(),
    entityId: termostato.entity_id,
    climaSalaId: climaSala ? climaSala.entity_id : null,
    tempClima: tempClima,
    climates: climates.map(c => ({
      entity_id: c.entity_id,
      friendly_name: c.attributes.friendly_name || c.entity_id,
      state: c.state,
      current_temperature: c.attributes.current_temperature,
      temperature: c.attributes.temperature,
      hvac_mode: c.attributes.hvac_mode,
      hvac_modes: c.attributes.hvac_modes || []
    })),
    sensors: sensors.filter(s => 
      s.entity_id.includes('temperatura') || 
      s.entity_id.includes('temperature') || 
      s.entity_id.includes('humidity')
    ).map(s => ({
      entity_id: s.entity_id,
      friendly_name: s.attributes.friendly_name || s.entity_id,
      state: s.state,
      unit: s.attributes.unit_of_measurement || '°C'
    }))
  };
}

let state = { power: false, currentTemp: 20, targetTemp: 22, humidity: 50, mode: 'cool', tempClima: 20, lastUpdate: Date.now() };

async function getState() {
  if (HA.enabled) {
    const real = await getRealState();
    if (real) { state = real; return real; }
  }
  return state;
}

// =============================================================================
// ALGORITMI COMFORT E DEUMIDIFICA (ASHRAE 55 Inspired)
// =============================================================================

// Umidita assoluta (g/m3) da temperatura e umidita relativa
function umiditaAssoluta(tempC, rh) {
  // Formula semplificata: 216.7 * (rh/100 * 6.112 * exp(17.62*tempC/(243.12+tempC))) / (273.15+tempC)
  const es = 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
  const ea = (rh / 100) * es;
  return (216.7 * ea) / (273.15 + tempC);
}

// Zona comfort semplificata (ASHRAE 55 inspired)
function comfortZone(tInt, rh, tExt) {
  const stagione = tExt > 20 ? 'estate' : 'inverno';

  // Limiti comfort
  let tMin, tMax, rhMin, rhMax;

  if (stagione === 'estate') {
    tMin = 23; tMax = 26;
    rhMin = 30; rhMax = 60;
  } else {
    tMin = 20; tMax = 23;
    rhMin = 30; rhMax = 60;
  }

  const inComfort = (tInt >= tMin && tInt <= tMax && rh >= rhMin && rh <= rhMax);

  return {
    stagione,
    inComfort,
    tMin, tMax, rhMin, rhMax,
    suggestion: inComfort ? 'mantieni' : (tInt > tMax ? 'raffreddare' : (tInt < tMin ? 'riscaldare' : (rh > rhMax ? 'deumidifica' : 'umidifica')))
  };
}

// Decisione deumidifica vs areazione
function deumidificaDecision(tInt, rhInt, tExt, rhExt) {
  if (rhExt === null || tExt === null) {
    // Senza dati esterni: usa solo umidita interna
    return {
      action: rhInt > 60 ? 'deumidifica' : 'mantieni',
      reason: 'Solo dati interni',
      umiditaInt: rhInt,
      umiditaExt: null
    };
  }

  const uaInt = umiditaAssoluta(tInt, rhInt);
  const uaExt = umiditaAssoluta(tExt, rhExt);

  // Se umidita assoluta esterna < interna → areazione possibile
  // Se umidita assoluta esterna > interna → deumidifica (non areare)

  if (rhInt > 65) {
    if (uaExt < uaInt * 0.9) {
      return {
        action: 'areazione',
        reason: `Aria esterna piu secca (${uaExt.toFixed(1)} vs ${uaInt.toFixed(1)} g/m3). Convienee areare.`,
        umiditaInt: rhInt,
        umiditaExt: rhExt,
        uaInt: uaInt.toFixed(1),
        uaExt: uaExt.toFixed(1)
      };
    } else {
      return {
        action: 'deumidifica',
        reason: `Aria esterna troppo umida (${uaExt.toFixed(1)} vs ${uaInt.toFixed(1)} g/m3). Deumidifica interno.`,
        umiditaInt: rhInt,
        umiditaExt: rhExt,
        uaInt: uaInt.toFixed(1),
        uaExt: uaExt.toFixed(1)
      };
    }
  }

  return {
    action: 'mantieni',
    reason: `Umidita interna OK (${rhInt}%).`,
    umiditaInt: rhInt,
    umiditaExt: rhExt,
    uaInt: uaInt.toFixed(1),
    uaExt: uaExt.toFixed(1)
  };
}

// =============================================================================
// STRATIFICAZIONE
// =============================================================================
function calcolaStratificazione(st) {
  const now = Date.now();
  const minMs = 60 * 1000;
  const delta = Math.abs(st.tempClima - st.currentTemp);

  if (delta < STRATIFICAZIONE.deltaMin) {
    return { attivo: false, motivo: 'Delta insufficiente', delta: delta.toFixed(1), consumoW: 0, risparmio: '0%' };
  }

  if (stratState.attivo && stratState.ultimoAvvio) {
    const durata = (now - stratState.ultimoAvvio) / minMs;
    if (durata < STRATIFICAZIONE.durataMin) {
      return { attivo: true, motivo: 'Ciclo in corso', delta: delta.toFixed(1), durata: Math.floor(durata), consumoW: STRATIFICAZIONE.consumoW, risparmio: STRATIFICAZIONE.risparmio };
    }
    stratState.attivo = false;
    stratState.ultimoStop = now;
    return { attivo: false, motivo: 'Ciclo completato', delta: delta.toFixed(1), consumoW: 0, risparmio: '0%' };
  }

  if (stratState.ultimoStop) {
    const pausa = (now - stratState.ultimoStop) / minMs;
    if (pausa < STRATIFICAZIONE.pausaMin) {
      return { attivo: false, motivo: 'Pausa tra cicli', delta: delta.toFixed(1), pausa: Math.floor(pausa), consumoW: 0, risparmio: '0%' };
    }
  }

  stratState.attivo = true;
  stratState.ultimoAvvio = now;
  stratState.motivo = `Delta ${delta.toFixed(1)}C: destratificazione necessaria`;

  return { attivo: true, motivo: stratState.motivo, delta: delta.toFixed(1), consumoW: STRATIFICAZIONE.consumoW, risparmio: STRATIFICAZIONE.risparmio };
}

async function applicaStratificazione(st, decisione) {
  if (!st.climaSalaId || !HA.enabled) return;
  if (decisione.attivo) {
    await haFetch('services/climate/set_hvac_mode', {
      method: 'POST',
      body: JSON.stringify({ entity_id: st.climaSalaId, hvac_mode: 'fan_only' })
    });
  } else if (stratState.attivo === false && stratState.ultimoAvvio) {
    await haFetch('services/climate/turn_off', {
      method: 'POST',
      body: JSON.stringify({ entity_id: st.climaSalaId })
    });
    stratState.ultimoAvvio = null;
  }
}

// =============================================================================
// API ROUTES
// =============================================================================

app.get('/api/status', async (req, res) => {
  const s = await getState();
  const weather = await getWeatherHA();
  const strat = calcolaStratificazione(s);
  await applicaStratificazione(s, strat);

  const comfort = comfortZone(s.currentTemp, s.humidity, weather ? weather.tempExt : 20);
  const deumidifica = deumidificaDecision(s.currentTemp, s.humidity, weather ? weather.tempExt : null, weather ? weather.humidityExt : null);

  res.json({ 
    success: true, 
    ...s, 
    haConnected: HA.enabled && s.entityId !== undefined,
    weather: weather || { tempExt: null, humidityExt: null, condition: 'non disponibile' },
    comfort: {
      ...comfort,
      note: 'ASHRAE 55 Inspired - Calcolo semplificato basato su temperatura e umidita'
    },
    deumidifica,
    stratificazione: { ...strat, config: STRATIFICAZIONE }
  });
});

app.post('/api/power/:st', async (req, res) => {
  const on = req.params.st === 'on';
  if (HA.enabled && state.entityId) {
    const service = on ? 'climate/turn_on' : 'climate/turn_off';
    await haFetch(`services/${service}`, { method: 'POST', body: JSON.stringify({ entity_id: state.entityId }) });
  }
  state.power = on;
  res.json({ success: true, power: on });
});

app.post('/api/temp/:val', async (req, res) => {
  const temp = parseInt(req.params.val);
  if (HA.enabled && state.entityId) {
    await haFetch('services/climate/set_temperature', {
      method: 'POST',
      body: JSON.stringify({ entity_id: state.entityId, temperature: temp })
    });
  }
  state.targetTemp = temp;
  res.json({ success: true, targetTemp: temp });
});

app.post('/api/mode/:mode', async (req, res) => {
  const mode = req.params.mode;
  if (HA.enabled && state.entityId) {
    await haFetch('services/climate/set_hvac_mode', {
      method: 'POST',
      body: JSON.stringify({ entity_id: state.entityId, hvac_mode: mode })
    });
  }
  state.mode = mode;
  res.json({ success: true, mode });
});

app.get('/api/config', (req, res) => {
  res.json({ 
    success: true, 
    app: config.app, 
    mode: config.app.mode, 
    ha: HA.enabled,
    percorso_a: { enabled: true, description: 'Cloud-to-Cloud (Tuya/SmartThings)' },
    percorso_b: { enabled: HA.enabled, description: 'Edge Tiny + Home Assistant' },
    features: {
      weather: true,
      comfort: 'ASHRAE 55 Inspired',
      deumidifica: true,
      stratificazione: true,
      algorithm: true
    }
  });
});


// =============================================================================
// ENERGY PRICES + ALGORITMO CONVENIENZA
// =============================================================================

app.get('/api/energy-prices', async (req, res) => {
  try {
    const prices = await energy.aggiornaPrezzi(req.query.refresh === 'true');
    res.json({
      success: true,
      pun: {
        latest: prices.pun.latest,
        unit: 'EUR/kWh',
        source: 'abbassalebollette.it',
        stale: prices.pun.stale || false,
        updated: prices.pun.fetchedAt,
      },
      psv: {
        latest: prices.psv.latest,
        unit: 'EUR/Smc',
        source: 'abbassalebollette.it',
        stale: prices.psv.stale || false,
        updated: prices.psv.fetchedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/convenienza', async (req, res) => {
  try {
    let prices = energy.getCache();
    const oneHourAgo = new Date(Date.now() - 3600000);

    if (!prices.lastUpdate || new Date(prices.lastUpdate) < oneHourAgo) {
      prices = await energy.aggiornaPrezzi();
    }

    const result = energy.calcolaConvenienza(prices.pun.latest, prices.psv.latest, {
      cop: parseFloat(req.query.cop) || 3.5,
      boilerEff: parseFloat(req.query.boilerEff) || 0.90,
      taxElec: parseFloat(req.query.taxElec) || 1.48,
      taxGas: parseFloat(req.query.taxGas) || 1.38,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(config.server.port, config.server.host, () => {
  console.log(`\n========================================`);
  console.log(`  ${config.app.name} v${config.app.version}`);
  console.log(`  Mode: ${config.app.mode.toUpperCase()}`);
  console.log(`  Comfort: ASHRAE 55 Inspired (semplificato)`);
  console.log(`  Meteo: weather.casa (HA) + fallback`);
  console.log(`  Deumidifica: umidita assoluta interna vs esterna`);
  console.log(`========================================`);
  console.log(`Server: http://${config.server.host}:${config.server.port}`);
  console.log(`========================================\n`);
});
