const express = require('express');
const path = require('path');
const config = require('./config.json');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Stato runtime
let state = {
  power: false,
  currentTemp: 24.5,
  targetTemp: 22,
  humidity: 58,
  mode: 'cool',
  fanSpeed: 'auto',
  swing: false,
  lastUpdate: Date.now()
};

// Helpers
function getFascia() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const t = h * 60 + m;
  const f1s = 8 * 60, f1e = 19 * 60;
  const f2s = 19 * 60, f2e = 23 * 60;
  if (t >= f1s && t < f1e) return config.energy.fasciaF1;
  if (t >= f2s && t < f2e) return config.energy.fasciaF2;
  return config.energy.fasciaF3;
}

function getSuggestion() {
  const f = getFascia();
  const { currentTemp, targetTemp, power, mode } = state;
  const p = config.pilastri;

  // Pilastro 1: Riciclo Termico Invernale
  if (p.ricicloTermico.enabled && currentTemp < targetTemp && !power && f.prezzo > 0.25) {
    return { action: 'fan_recycle', mode: 'fan_only', reason: 'Pilastro 1: Destratificazione invernale, consumo 15W', pilastro: 1 };
  }

  // Pilastro 2: Meteo Predittivo
  if (p.meteoPredittivo.enabled && f.prezzo <= 0.20 && currentTemp > targetTemp + 1 && !power) {
    return { action: 'on', mode: 'cool', reason: 'Pilastro 2: Anticipo raffreddamento in fascia economica', pilastro: 2 };
  }

  // Fascia economica standard
  if (f.prezzo <= 0.20) {
    if (currentTemp > targetTemp && !power) return { action: 'on', mode: 'cool', reason: `Fascia economica (${f.nome}), raffreddamento`, pilastro: 0 };
    if (currentTemp < targetTemp - 2 && !power) return { action: 'on', mode: 'heat', reason: `Fascia economica (${f.nome}), riscaldamento`, pilastro: 0 };
    return { action: 'none', reason: `Fascia economica (${f.nome}), nessun intervento`, pilastro: 0 };
  }

  // Fascia cara
  if (f.prezzo > 0.30 && currentTemp > 24) {
    return { action: 'off', reason: `Fascia cara (${f.nome}), temperatura sopra soglia`, pilastro: 0 };
  }

  return { action: 'none', reason: `Condizioni stabili in ${f.nome}`, pilastro: 0 };
}

function getPilastriStatus() {
  const p = config.pilastri;
  return [
    { id: 1, nome: 'Riciclo Termico Invernale', desc: 'Destratificazione a costo zero (FAN mode)', attivo: p.ricicloTermico.enabled, icona: 'recycle' },
    { id: 2, nome: 'Meteo Predittivo', desc: 'Raffreddamento preventivo mattutino', attivo: p.meteoPredittivo.enabled, icona: 'sun' },
    { id: 3, nome: 'Schermatura Solare Passiva', desc: 'Tapparelle motorizzate anti-effetto serra', attivo: p.schermaturaSolare.enabled, icona: 'shield' },
    { id: 4, nome: 'Riciclo Aria (CO2/VOC)', desc: 'VMC nelle ore più fresche', attivo: p.ricicloAria.enabled, icona: 'wind' },
    { id: 5, nome: 'Geofencing Dinamico', desc: 'Rilevamento distanza smartphone', attivo: p.geofencing.enabled, icona: 'map-pin' }
  ];
}

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    ...state,
    fascia: getFascia(),
    suggestion: getSuggestion(),
    pilastri: getPilastriStatus(),
    mode: config.app.mode
  });
});

app.post('/api/power/:state', (req, res) => {
  state.power = req.params.state === 'on';
  state.lastUpdate = Date.now();
  res.json({ success: true, power: state.power });
});

app.post('/api/temp/:value', (req, res) => {
  state.targetTemp = parseInt(req.params.value);
  state.lastUpdate = Date.now();
  res.json({ success: true, targetTemp: state.targetTemp });
});

app.post('/api/mode/:mode', (req, res) => {
  state.mode = req.params.mode;
  state.lastUpdate = Date.now();
  res.json({ success: true, mode: state.mode });
});

app.post('/api/fan/:speed', (req, res) => {
  state.fanSpeed = req.params.speed;
  res.json({ success: true, fanSpeed: state.fanSpeed });
});

app.post('/api/swing/:state', (req, res) => {
  state.swing = req.params.state === 'on';
  res.json({ success: true, swing: state.swing });
});

app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    app: config.app,
    energy: config.energy,
    pilastri: getPilastriStatus()
  });
});

app.listen(config.server.port, config.server.host, () => {
  console.log(`\n========================================`);
  console.log(`  ${config.app.name} v${config.app.version}`);
  console.log(`  Mode: ${config.app.mode.toUpperCase()}`);
  console.log(`========================================`);
  console.log(`Server: http://${config.server.host}:${config.server.port}`);
  console.log(`Dashboard: http://localhost:${config.server.port}`);
  console.log(`========================================\n`);
});
