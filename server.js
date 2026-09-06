require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
app.use(cors());
app.use(express.json());

// --- ECOHYBRID v2.5 — Sensori reali multi + Bollette + Flight Recorder + Poll HA ---
const { 
  router: sensoriRouter, 
  CONFIG_SENSORI, 
  storicoSensori, 
  getFattore,
  getSensoriAttivi,
  mediaSensori 
} = require('./server-sensori');
const bolletteRouter = require('./router-bollette');
const flightRecorder = require('./flight-recorder');

app.use('/api/sensori', sensoriRouter);
app.use('/api/bollette', bolletteRouter);
flightRecorder.attach(app);

const HA_URL = process.env.HA_URL || 'http://192.168.1.21';
const HA_TOKEN = process.env.HA_TOKEN || '';
const PUN_FALLBACK = parseFloat(process.env.PUN_FALLBACK || '0.125');
const PSV_FALLBACK = parseFloat(process.env.PSV_FALLBACK || '0.38');
const HOME_LAT = parseFloat(process.env.HOME_LAT || '45.8107');
const HOME_LON = parseFloat(process.env.HOME_LON || '8.2675');

const SOGLIE_MESE = [21,21,22,23,23.5,24,25,26,24,23,22,21];
const FLOOR = 20, TRIGGER = 3, OFFSET = 1, T_GIORNO = 21, T_NOTTE = 18, T_AWAY = 16;
const ORA_GIORNO = 6, ORA_NOTTE = 22, OVERRIDE_MS = 24*60*60*1000;
const DRY_SOGLIA = 65;

let autopilotEnabled = false, lastManualOverride = null, presenceStatus = 'home';
let outdoorTemp = null, indoorTemp = null, targetTemp = null, faseAttiva = 'giorno';
let outdoorHum = null, indoorHum = null, thi = null, comfortLevel = 'ok';
let autopilotError = null, lastCycleLog = [], tierLevel = 0;
let haConnected = false;
let indoorHumSource = 'stimata';

const HA_HEADERS = { 'Authorization': `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' };

async function haGet(path) {
  try { const res = await axios.get(`${HA_URL}${path}`, { headers: HA_HEADERS, timeout: 8000 }); haConnected = true; return res.data; }
  catch(e) { haConnected = false; return null; }
}
async function haPost(path, body) {
  try { return (await axios.post(`${HA_URL}${path}`, body, { headers: HA_HEADERS, timeout: 8000 })).data; }
  catch(e) { return null; }
}

// --- AVVIA POLL HA (legge sensori autonomamente da HA) ---
require('./poll-ha').start(haGet, storicoSensori, CONFIG_SENSORI);

async function getOutdoorFromMeteo() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${HOME_LAT}&longitude=${HOME_LON}&current=temperature_2m,relative_humidity_2m`;
    const res = await axios.get(url, { timeout: 10000 });
    if (res.data && res.data.current) {
      outdoorTemp = parseFloat(res.data.current.temperature_2m);
      outdoorHum = parseFloat(res.data.current.relative_humidity_2m);
      console.log(`[OUTDOOR] Open-Meteo fallback: ${outdoorTemp}C | UR ${outdoorHum}%`);
      return { temp: outdoorTemp, hum: outdoorHum };
    }
  } catch(e) { console.log('[OUTDOOR] Meteo errore:', e.message); }
  outdoorTemp = null; outdoorHum = null; return null;
}

async function getOutdoorTemp() {
  const states = await haGet('/api/states');
  if (states) {
    const weather = states.find(s => s.entity_id.startsWith('weather.'));
    if (weather && weather.attributes) {
      const attrs = weather.attributes;
      const temp = attrs.temperature ?? attrs.native_temperature ?? attrs.temp;
      const hum = attrs.humidity ?? attrs.relative_humidity;
      if (temp !== undefined && !isNaN(parseFloat(temp))) {
        outdoorTemp = parseFloat(temp);
        if (hum !== undefined && !isNaN(parseFloat(hum))) outdoorHum = parseFloat(hum);
        console.log(`[OUTDOOR] HA weather (${weather.entity_id}): ${outdoorTemp}C | UR ${outdoorHum || 'N/D'}%`);
        return { temp: outdoorTemp, hum: outdoorHum };
      }
    }
  }
  console.log('[OUTDOOR] HA weather non disp., uso Open-Meteo fallback...');
  return await getOutdoorFromMeteo();
}

// === v2.5: Temperatura interna — PRIORITA sensori ZHA reali ===
async function getIndoorTemp() {
  const states = await haGet('/api/states');
  if (!states) { indoorTemp = null; return null; }

  // PRIORITA 1: Sensori ZHA tarati (bagno, sonoff)
  const tZHA = mediaSensori('sala', 'temperatura', 30);
  if (tZHA !== null) {
    indoorTemp = tZHA;
    console.log(`[INDOOR] Sensore ZHA tarato: ${indoorTemp}C`);
    return indoorTemp;
  }

  // PRIORITA 2: Helper esistenti (fallback, ma logghiamo avviso)
  const helperKeywords = ['reale', 'effettiva', 'temperatura_sala', 'sala_reale', 'indoor_temp', 'temp_reale'];
  const helper = states.find(s =>
    s.entity_id.startsWith('sensor.') &&
    helperKeywords.some(k => s.entity_id.toLowerCase().includes(k) || (s.attributes.friendly_name || '').toLowerCase().includes(k)) &&
    !isNaN(parseFloat(s.state))
  );
  if (helper) { 
    indoorTemp = parseFloat(helper.state); 
    console.log(`[INDOOR] WARNING: uso helper ${helper.entity_id} = ${indoorTemp}C (nessun sensore ZHA attivo)`); 
    return indoorTemp; 
  }

  // PRIORITA 3: Media clima (no thermostat)
  const climates = states.filter(s =>
    s.entity_id.startsWith('climate.') && s.attributes && !isNaN(parseFloat(s.attributes.current_temperature)) &&
    !(s.attributes.friendly_name || s.entity_id).toLowerCase().includes('thermostat') &&
    !(s.attributes.friendly_name || s.entity_id).toLowerCase().includes('caldaia') &&
    !(s.attributes.friendly_name || s.entity_id).toLowerCase().includes('termostato')
  );
  if (climates.length > 0) {
    const temps = climates.map(s => parseFloat(s.attributes.current_temperature));
    indoorTemp = Math.round(temps.reduce((a,b) => a+b, 0) / temps.length * 10) / 10;
    console.log(`[INDOOR] Media clima (no thermostat): ${indoorTemp}C da ${climates.length} disp.`);
    return indoorTemp;
  }

  const allClimates = states.filter(s => s.entity_id.startsWith('climate.') && s.attributes && !isNaN(parseFloat(s.attributes.current_temperature)));
  if (allClimates.length > 0) {
    const temps = allClimates.map(s => parseFloat(s.attributes.current_temperature));
    indoorTemp = Math.round(temps.reduce((a,b) => a+b, 0) / temps.length * 10) / 10;
    console.log(`[INDOOR] WARNING: tutti i climate (incl. thermostat): ${indoorTemp}C`);
    return indoorTemp;
  }
  indoorTemp = null; console.log('[INDOOR] Nessun sensore trovato'); return null;
}

// === v2.5: Umidita — PRIORITA sensori ZHA reali ===
function calcolaUmiditaInterna(tEst, urEst, tInt) {
  // PRIORITA 1: media sensori reali ZHA
  const urMedia = mediaSensori('sala', 'umidita', 30);
  if (urMedia !== null) {
    indoorHumSource = 'reale';
    const attivi = getSensoriAttivi('sala', 30);
    console.log(`[INDOOR] Media ${attivi.length} sensori ZHA: UR ${urMedia}%`);
    return Math.round(urMedia);
  }

  // FALLBACK: formula stimata
  indoorHumSource = 'stimata';
  if (tEst === null || urEst === null || tInt === null) return null;
  const fattore = getFattore();
  const delta = tInt - tEst;
  let urInt = urEst - (delta * fattore);
  urInt = Math.max(15, Math.min(95, urInt));
  console.log(`[INDOOR] Formula stimata: UR ${Math.round(urInt)}% (fattore ${fattore})`);
  return Math.round(urInt);
}

function calcolaTHI(tInt, urInt) {
  if (tInt === null || urInt === null) return null;
  return Math.round((tInt + (urInt / 10)) * 10) / 10;
}

function calcolaComfortLevel(thiVal) {
  if (thiVal === null) return 'sconosciuto';
  if (thiVal < 26) return 'ok';
  if (thiVal <= 28) return 'leggermente_fastidioso';
  return 'fastidioso';
}

function calcolaFase() { const ora = new Date().getHours(); if (presenceStatus === 'away') return 'away'; if (ora >= ORA_GIORNO && ora < ORA_NOTTE) return 'giorno'; return 'notte'; }
function targetInverno(fase) { if (fase === 'away') return T_AWAY; if (fase === 'notte') return T_NOTTE; return T_GIORNO; }
function targetEstate(tEst, tInt) { const mese = new Date().getMonth(), soglia = SOGLIE_MESE[mese]; if (tEst === null) return Math.max(FLOOR, soglia); if (tEst < 15) return Math.max(FLOOR, T_GIORNO); if (tEst < 18) { const grad = FLOOR + (18 - tEst) * 0.33; return Math.max(FLOOR, Math.min(T_GIORNO, grad)); } if (tInt === null) return Math.max(FLOOR, soglia); const forteCaldo = tEst > (tInt + TRIGGER); if (forteCaldo) return Math.max(soglia, tEst - OFFSET, FLOOR); return Math.max(FLOOR, soglia); }

function decidiAutopilot(tEst, tInt, fase, urInt, thiVal) {
  const mese = new Date().getMonth(), soglia = SOGLIE_MESE[mese], isInv = tEst !== null && tEst < 18;
  if (fase === 'away') return { action: 'eco', target: T_AWAY, mode: 'off', reason: 'Eco mode — fuori casa', inviaComando: true, gerarchia: 0 };
  if (isInv) {
    const target = targetInverno(fase);
    if (tInt === null) return { action: 'heat', target, mode: 'heat', reason: `Inverno ${fase}: ${target}C`, inviaComando: true, gerarchia: 4 };
    if (tInt < target - 0.5) return { action: 'heat', target, mode: 'heat', reason: `Inverno: ${tInt}C < ${target}C`, inviaComando: true, gerarchia: 4 };
    return { action: 'off', target, mode: 'off', reason: `Inverno: ${tInt}C >= ${target}C`, inviaComando: false, gerarchia: 0 };
  }
  if (tEst === null) return { action: 'skip', target: null, mode: null, reason: 'Temp esterna non disponibile', inviaComando: false, gerarchia: 0 };
  const target = targetEstate(tEst, tInt);
  if (tInt === null) return { action: 'skip', target, mode: null, reason: 'Temp interna non disponibile', inviaComando: false, gerarchia: 0 };
  if (tInt <= target + 0.5) return { action: 'off', target, mode: 'off', reason: `Estate: ${tInt}C <= target ${target}C. Nessun intervento.`, inviaComando: false, gerarchia: 0 };

  const diff = tInt - target;
  const forteCaldo = tEst > (tInt + TRIGGER);

  if (urInt !== null && urInt > DRY_SOGLIA) {
    if (indoorHumSource !== 'reale') {
      return { action: 'skip', target, mode: null, reason: `Umidita ${urInt}% > ${DRY_SOGLIA}% ma fonte=stimata — DRY BLOCCATO, attendo sensore reale`, inviaComando: false, gerarchia: 0 };
    }
    return { action: 'dry', target, mode: 'dry', reason: `Umidita ${urInt}% > ${DRY_SOGLIA}%. Deumidifico a ${target}C (sensore reale)`, inviaComando: true, gerarchia: 2 };
  }
  if (diff <= 1.5 && (urInt === null || urInt < DRY_SOGLIA)) {
    return { action: 'fan', target, mode: 'fan_only', reason: `Diff ${diff.toFixed(1)}C, umidita ${urInt || 'N/D'}%. Ventilo (consumo minimo)`, inviaComando: true, gerarchia: 1 };
  }
  if (forteCaldo) {
    return { action: 'cool', target, mode: 'cool', reason: `Forte caldo: T_est ${tEst}C >> T_int ${tInt}C. Raffreddo a ${target}C (consumo alto)`, inviaComando: true, gerarchia: 3 };
  }
  return { action: 'cool', target, mode: 'cool', reason: `Estate: ${tInt}C > soglia ${soglia}C (${['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][mese]}). Raffreddo a ${target}C`, inviaComando: true, gerarchia: 3 };
}

async function verificaEInvia(dev, decisione) {
  const eid = dev.entity_id, attrs = dev.attributes || {};
  const friendly = (attrs.friendly_name || eid).toLowerCase();
  const isTerm = friendly.includes('thermostat') || friendly.includes('caldaia') || friendly.includes('termostato');
  if (dev.state === 'unavailable') return { sent: false, reason: 'unavailable' };

  if (decisione.action === 'eco') {
    if (isTerm) { const ct = attrs.temperature; if (ct !== undefined && Math.abs(ct - T_AWAY) < 0.5) return { sent: false, reason: 'gia 16C' }; await haPost('/api/services/climate/set_temperature', { entity_id: eid, temperature: T_AWAY }); return { sent: true, reason: 'eco 16C' }; }
    else { if (dev.state === 'off') return { sent: false, reason: 'gia spento' }; await haPost('/api/services/climate/turn_off', { entity_id: eid }); return { sent: true, reason: 'eco spento' }; }
  }
  if (decisione.mode === 'heat') {
    if (isTerm) { const ct = attrs.temperature; if (ct !== undefined && Math.abs(ct - decisione.target) < 0.5) return { sent: false, reason: `gia ${decisione.target}C` }; await haPost('/api/services/climate/set_temperature', { entity_id: eid, temperature: decisione.target }); return { sent: true, reason: `heat ${decisione.target}C` }; }
    else { const ct = attrs.temperature, cm = dev.state; if (cm === 'heat' && ct !== undefined && Math.abs(ct - decisione.target) < 0.5) return { sent: false, reason: `gia heat ${decisione.target}C` }; if (dev.state === 'off') { await haPost('/api/services/climate/turn_on', { entity_id: eid }); await new Promise(r => setTimeout(r, 1000)); } await haPost('/api/services/climate/set_temperature', { entity_id: eid, temperature: decisione.target, hvac_mode: 'heat' }); return { sent: true, reason: `clima heat ${decisione.target}C` }; }
  }
  if (decisione.mode === 'cool') {
    const ct = attrs.temperature, cm = dev.state;
    if (cm === 'cool' && ct !== undefined && Math.abs(ct - decisione.target) < 0.5) return { sent: false, reason: `gia cool ${decisione.target}C` };
    if (dev.state === 'off') { await haPost('/api/services/climate/turn_on', { entity_id: eid }); await new Promise(r => setTimeout(r, 1000)); }
    await haPost('/api/services/climate/set_temperature', { entity_id: eid, temperature: decisione.target, hvac_mode: 'cool' });
    return { sent: true, reason: `cool ${decisione.target}C` };
  }
  if (decisione.mode === 'dry') {
    if (isTerm) return { sent: false, reason: 'termostato non supporta DRY' };
    const cm = dev.state; if (cm === 'dry') return { sent: false, reason: `gia dry` }; if (dev.state === 'off') { await haPost('/api/services/climate/turn_on', { entity_id: eid }); await new Promise(r => setTimeout(r, 1000)); }
    await haPost('/api/services/climate/set_temperature', { entity_id: eid, temperature: decisione.target, hvac_mode: 'dry' });
    return { sent: true, reason: `dry ${decisione.target}C` };
  }
  if (decisione.mode === 'fan_only') {
    if (isTerm) return { sent: false, reason: 'termostato non supporta FAN' };
    const cm = dev.state; if (cm === 'fan_only') return { sent: false, reason: `gia fan` }; if (dev.state === 'off') { await haPost('/api/services/climate/turn_on', { entity_id: eid }); await new Promise(r => setTimeout(r, 1000)); }
    await haPost('/api/services/climate/set_temperature', { entity_id: eid, temperature: decisione.target, hvac_mode: 'fan_only' });
    return { sent: true, reason: `fan_only` };
  }
  if (decisione.mode === 'off') { if (dev.state === 'off') return { sent: false, reason: 'gia spento' }; await haPost('/api/services/climate/turn_off', { entity_id: eid }); return { sent: true, reason: 'spento' }; }
  return { sent: false, reason: 'nessuna azione' };
}

async function autopilotCycle() {
  if (!autopilotEnabled) return;
  if (lastManualOverride && (Date.now() - lastManualOverride) < OVERRIDE_MS) {
    const rim = Math.ceil((OVERRIDE_MS - (Date.now() - lastManualOverride)) / 3600000);
    console.log(`[AUTOPILOT] Override attivo, ${rim}h rimanenti`);
    lastCycleLog.push({ time: new Date().toISOString(), action: 'skip', reason: `Override ${rim}h`, inviati: 0 });
    if (lastCycleLog.length > 20) lastCycleLog.shift(); return;
  }
  if (lastManualOverride && (Date.now() - lastManualOverride) >= OVERRIDE_MS) { console.log('[AUTOPILOT] Override scaduto, riattivo'); lastManualOverride = null; }

  const outData = await getOutdoorTemp();
  await getIndoorTemp();
  faseAttiva = calcolaFase();

  indoorHum = calcolaUmiditaInterna(outdoorTemp, outdoorHum, indoorTemp);
  thi = calcolaTHI(indoorTemp, indoorHum);
  comfortLevel = calcolaComfortLevel(thi);

  const d = decidiAutopilot(outdoorTemp, indoorTemp, faseAttiva, indoorHum, thi);
  targetTemp = d.target;
  autopilotError = d.action === 'skip' ? d.reason : null;

  console.log(`[AUTOPILOT] Fase:${faseAttiva} Est:${outdoorTemp}C/${outdoorHum}% Int:${indoorTemp}C/${indoorHum}% THI:${thi} Comfort:${comfortLevel} Target:${d.target} Action:${d.action} Ger:${d.gerarchia} FonteUR:${indoorHumSource}`);

  let inviati = 0, saltati = 0;
  if (d.inviaComando) {
    const states = await haGet('/api/states');
    if (!states) { autopilotError = 'HA non raggiungibile'; lastCycleLog.push({ time: new Date().toISOString(), action: 'skip', reason: 'HA down', inviati: 0 }); if (lastCycleLog.length > 20) lastCycleLog.shift(); return; }
    const climates = states.filter(s => s.entity_id.startsWith('climate.'));
    for (const dev of climates) { const r = await verificaEInvia(dev, d); if (r.sent) inviati++; else saltati++; }
  }

  const cycleData = { 
    time: new Date().toISOString(), 
    esterna: outdoorTemp, 
    ur_est: outdoorHum, 
    interna: indoorTemp, 
    ur_int: indoorHum, 
    ur_fonte: indoorHumSource, 
    thi, 
    comfort: comfortLevel, 
    fase: faseAttiva, 
    action: d.action, 
    gerarchia: d.gerarchia, 
    target: d.target, 
    reason: d.reason, 
    inviati, 
    saltati 
  };

  lastCycleLog.push(cycleData);
  if (lastCycleLog.length > 20) lastCycleLog.shift();

  // Flight Recorder
  flightRecorder.recordCycle(cycleData);

  console.log(`[AUTOPILOT] Inv:${inviati} Skip:${saltati}`);
}

setInterval(autopilotCycle, 15 * 60 * 1000);

async function keepaliveCycle() {
  const states = await haGet('/api/states'); if (!states) return;
  const unav = states.filter(s => s.entity_id.startsWith('climate.') && s.state === 'unavailable');
  for (const dev of unav) { console.log(`[KEEPALIVE] ${dev.entity_id}`); await haPost('/api/services/climate/turn_on', { entity_id: dev.entity_id }); await new Promise(r => setTimeout(r, 2000)); const cur = await haGet(`/api/states/${dev.entity_id}`); if (cur && cur.attributes && cur.attributes.temperature) await haPost('/api/services/climate/set_temperature', { entity_id: dev.entity_id, temperature: cur.attributes.temperature }); }
}
setInterval(keepaliveCycle, 10 * 60 * 1000);

app.get('/api/convenienza', (req, res) => { const pun = PUN_FALLBACK, psv = PSV_FALLBACK, cop = 3, ce = pun / cop, cg = psv / 10, risp = Math.abs(ce - cg) / Math.max(ce, cg) * 100, conv = ce < cg ? 'ELETTRICO' : 'GAS'; res.json({ convenienza: conv, risparmio_circa: `circa ${Math.round(risp)}%`, risparmio_percento: Math.round(risp), prezzi: { pun, psv, costo_elettrico_kwh_termico: ce, costo_gas_kwh_termico: cg }, cop, nota: 'Stima fallback. Carica bollette per dati reali.' }); });
app.get('/api/energy-prices', (req, res) => res.json({ pun: PUN_FALLBACK, psv: PSV_FALLBACK, fonte: 'fallback' }));
app.get('/v1/ha/climate', async (req, res) => { const s = await haGet('/api/states'); if (!s) return res.status(503).json({ error: 'HA down' }); res.json(s.filter(x => x.entity_id.startsWith('climate.'))); });
app.get('/v1/ha/sensors', async (req, res) => { const s = await haGet('/api/states'); if (!s) return res.status(503).json({ error: 'HA down' }); res.json(s.filter(x => x.entity_id.startsWith('sensor.'))); });

app.post('/v1/ha/command', async (req, res) => {
  const { entity_id, command, temperature, hvac_mode } = req.body;
  if (!entity_id) return res.status(400).json({ error: 'entity_id richiesto' });
  lastManualOverride = Date.now();
  let service = 'climate/turn_on', payload = { entity_id };
  if (command === 'power_off' || command === 'turn_off') service = 'climate/turn_off';
  else if (command === 'set_temperature' && temperature !== undefined) { service = 'climate/set_temperature'; payload.temperature = parseFloat(temperature); }
  else if (command === 'set_hvac_mode' && hvac_mode) { service = 'climate/set_hvac_mode'; payload.hvac_mode = hvac_mode; }
  else if (command === 'turn_on') service = 'climate/turn_on';
  const result = await haPost(`/api/services/${service}`, payload);
  res.json({ success: !!result, override_tracked: true, override_durata_h: 24, timestamp: lastManualOverride, message: 'Autopilot in pausa 24h' });
});

app.post('/api/presence', (req, res) => { const { status, lat, lon } = req.body; if (status === 'home' || status === 'away') { presenceStatus = status; if (status === 'away') tierLevel = Math.max(tierLevel, 1); } if (lat && lon && HOME_LAT && HOME_LON) { const R = 6371000, dLat = (lat - HOME_LAT) * Math.PI / 180, dLon = (lon - HOME_LON) * Math.PI / 180, a = Math.sin(dLat / 2) ** 2 + Math.cos(HOME_LAT * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2, dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)), ns = dist < 200 ? 'home' : 'away'; if (presenceStatus !== ns) { presenceStatus = ns; console.log(`[PRESENZA] ${ns} (${Math.round(dist)}m)`); } } res.json({ presence: presenceStatus, outdoor_temp: outdoorTemp, target_temp: targetTemp }); });
app.get('/api/presence', (req, res) => res.json({ presence: presenceStatus, outdoor_temp: outdoorTemp, target_temp: targetTemp }));
app.post('/api/ha/wake', async (req, res) => { const { entity_id } = req.body; if (!entity_id) return res.status(400).json({ error: 'entity_id richiesto' }); await haPost('/api/services/climate/turn_on', { entity_id }); res.json({ success: true, message: `Wake ${entity_id}` }); });
app.post('/api/ha/keepalive', async (req, res) => { const { entity_id } = req.body; if (entity_id) { await haPost('/api/services/climate/turn_on', { entity_id }); await new Promise(r => setTimeout(r, 2000)); const cur = await haGet(`/api/states/${entity_id}`); if (cur && cur.attributes && cur.attributes.temperature) await haPost('/api/services/climate/set_temperature', { entity_id, temperature: cur.attributes.temperature }); res.json({ success: true, message: `Keepalive ${entity_id}` }); } else { await keepaliveCycle(); res.json({ success: true, message: 'Keepalive globale' }); } });
app.post('/api/autopilot', (req, res) => { const { enabled } = req.body; if (typeof enabled === 'boolean') { autopilotEnabled = enabled; console.log(`[AUTOPILOT] ${enabled ? 'ON' : 'OFF'}`); } res.json({ enabled: autopilotEnabled, target_temp: targetTemp, outdoor_temp: outdoorTemp, error: autopilotError }); });
app.get('/api/autopilot', (req, res) => res.json({ enabled: autopilotEnabled, target_temp: targetTemp, outdoor_temp: outdoorTemp, error: autopilotError }));

app.get('/api/status', async (req, res) => {
  await getOutdoorTemp(); await getIndoorTemp();
  faseAttiva = calcolaFase();
  indoorHum = calcolaUmiditaInterna(outdoorTemp, outdoorHum, indoorTemp);
  thi = calcolaTHI(indoorTemp, indoorHum);
  comfortLevel = calcolaComfortLevel(thi);
  const mese = new Date().getMonth(), soglia = SOGLIE_MESE[mese], isInv = outdoorTemp !== null && outdoorTemp < 18, fc = !isInv && indoorTemp !== null && outdoorTemp !== null && outdoorTemp > (indoorTemp + TRIGGER);
  let or = null; if (lastManualOverride && (Date.now() - lastManualOverride) < OVERRIDE_MS) or = Math.ceil((OVERRIDE_MS - (Date.now() - lastManualOverride)) / 3600000);
  const sensoriAttivi = getSensoriAttivi ? getSensoriAttivi('sala', 30) : [];
  res.json({ autopilot: autopilotEnabled, presence: presenceStatus, fase: faseAttiva, outdoor_temp: outdoorTemp, outdoor_hum: outdoorHum, indoor_temp: indoorTemp, indoor_hum: indoorHum, indoor_hum_source: indoorHumSource, sensori_attivi: sensoriAttivi.length, thi, comfort: comfortLevel, target_temp: targetTemp, soglia_mese: soglia, mese: mese + 1, is_inverno: isInv, forte_caldo: fc, override_attivo: !!or, override_rimanente_h: or, autopilot_error: autopilotError, ha_connected: haConnected, tier_level: tierLevel, cycle_log: lastCycleLog.slice(-5) });
});

app.get('/api/config', (req, res) => { const mese = new Date().getMonth(); res.json({ versione: '2.5-FaseA-v3', filosofia: 'Installa e non ci pensi piu', override_durata_h: 24, soglie_mese: SOGLIE_MESE, mese_corrente: mese + 1, soglia_corrente: SOGLIE_MESE[mese], orari: { giorno: `${ORA_GIORNO}:00`, notte: `${ORA_NOTTE}:00` }, target_giorno: T_GIORNO, target_notte: T_NOTTE, target_away: T_AWAY, floor: FLOOR, dry_soglia: DRY_SOGLIA, tier_levels: { 0: 'Base', 1: 'Smart', 2: 'Ottimizzato' }, note: ['Fonte meteo: HA weather (Meteo.it/Met.no) > Open-Meteo fallback (solo temp)', 'Soglia DRY: 65% — ATTIVA solo con sensore reale, BLOCCATA su stimata', 'Thermostat escluso da calcolo T_int', 'Umidita: media sensori ZHA attivi (<30min), altrimenti formula stimata', 'Temperatura: PRIORITA sensori ZHA tarati, fallback helper/clima', 'Calibrazione umidita: raccogliere 7-14 giorni con sensori reali'] }); });
app.post('/api/bolletta', (req, res) => { tierLevel = 2; res.json({ success: true, tier_level: tierLevel, message: 'Bolletta ricevuta. Ottimizzato attivato.', nota: 'Usa /api/bollette/upload per PDF parser' }); });

// --- SIMULAZIONE SENSORE (per test senza hardware) ---
app.post('/api/sensori/simula', (req, res) => {
  const { temperatura, umidita, sensore_id } = req.body;
  if (temperatura === undefined || umidita === undefined) {
    return res.status(400).json({ errore: 'Servono temperatura e umidita' });
  }
  const record = {
    stanza: 'sala',
    sensore_id: sensore_id || 'simulato',
    temperatura: parseFloat(temperatura),
    umidita: parseFloat(umidita),
    timestamp: new Date().toISOString(),
    fonte: 'simulazione'
  };
  if (storicoSensori) storicoSensori.push(record);
  res.json({ ok: true, messaggio: 'Dato simulato registrato', record, fonte_attiva: 'reale' });
});

app.use(express.static('public'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`========================================`); console.log(` EcoHybrid v2.5-FaseA-v3 | Port ${PORT}`); console.log(` HA weather > Open-Meteo fallback (temp only)`); console.log(` Soglia DRY: ${DRY_SOGLIA}% | DRY BLOCCATO su umidita stimata`); console.log(` Autopilot: OFF (default sicurezza)`); console.log(` Sensori: ZHA tarati > helper > clima`); console.log(` Poll HA: attivo (legge ogni 5 min)`); console.log(` Flight Recorder: /api/flight/*`); console.log(` Bollette: /api/bollette/* pronto`); console.log(`========================================`); });
