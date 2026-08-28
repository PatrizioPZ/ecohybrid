const express = require('express');
const path = require('path');
const config = require('./config.json');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const HA = config.homeassistant;

// Client HA
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

// Legge stato reale da HA
async function getRealState() {
  const states = await haFetch('states');
  if (!states) return null;
  
  const climates = states.filter(e => e.entity_id.startsWith('climate.'));
  const sensors = states.filter(e => 
    e.entity_id.startsWith('sensor.') && 
    (e.entity_id.includes('temperatura') || e.entity_id.includes('temperature') || e.entity_id.includes('humidity'))
  );
  
  const main = climates.find(c => c.entity_id === HA.entityId) || climates[0];
  if (!main) return null;
  
  let indoorTemp = main.attributes.current_temperature || 20;
  let humidity = 50;
  
  for (const s of sensors) {
    try {
      const val = parseFloat(s.state);
      if (!isNaN(val)) {
        if (s.entity_id.includes('humidity')) humidity = val;
        else if (!indoorTemp) indoorTemp = val;
      }
    } catch(e) {}
  }
  
  return {
    power: main.state !== 'off' && main.state !== 'unavailable',
    currentTemp: indoorTemp,
    targetTemp: main.attributes.temperature || 22,
    humidity: humidity,
    mode: main.attributes.hvac_mode || 'cool',
    lastUpdate: Date.now(),
    entityId: main.entity_id,
    climates: climates.map(c => ({
      entity_id: c.entity_id,
      friendly_name: c.attributes.friendly_name || c.entity_id,
      state: c.state,
      current_temperature: c.attributes.current_temperature,
      temperature: c.attributes.temperature,
      hvac_mode: c.attributes.hvac_mode
    }))
  };
}

// Stato runtime
let state = { power: false, currentTemp: 20, targetTemp: 22, humidity: 50, mode: 'cool', lastUpdate: Date.now() };

async function getState() {
  if (HA.enabled) {
    const real = await getRealState();
    if (real) { state = real; return real; }
  }
  return state;
}

// API Routes
app.get('/api/status', async (req, res) => {
  const s = await getState();
  res.json({ success: true, ...s, haConnected: HA.enabled && s.entityId !== undefined });
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
  res.json({ success: true, app: config.app, mode: config.app.mode, ha: HA.enabled });
});

app.listen(config.server.port, config.server.host, () => {
  console.log(`EcoHybrid v2.1 - Mode: ${config.app.mode}`);
  console.log(`HA: ${HA.enabled ? HA.url : 'disabled'}`);
  console.log(`Server: http://${config.server.host}:${config.server.port}`);
});
