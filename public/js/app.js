// EcoHybrid Frontend v2.0
// Connette a Render (cloud) o locale
// Legge dati reali da Home Assistant

// ==================== CONFIGURAZIONE ====================
const API_MODE = 'render'; // 'render' per cloud, 'local' per test locale

const API_BASE = API_MODE === 'render' 
    ? 'https://ecohybrid-api.onrender.com' 
    : '';

const API_KEY = 'EHY_PATRIZIO_TEST_2026'; // Chiave di test (cambiala in produzione)

const HA_ENTITY_MAIN = 'climate.thermostat'; // Entita principale (termostato)

// ==================== STATO ====================
let state = {
    power: false,
    currentTemp: 20.0,
    targetTemp: 22.0,
    humidity: 50,
    mode: 'cool',
    fanSpeed: 'auto',
    swing: false,
    lastUpdate: Date.now(),
    climates: [],
    sensors: [],
    haConnected: false,
    suggestion: null
};

// ==================== HELPER API ====================
async function apiGet(endpoint) {
    const headers = { 'Content-Type': 'application/json' };
    if (API_MODE === 'render') {
        headers['X-EcoHybrid-Key'] = API_KEY;
    }
    try {
        const resp = await fetch(`${API_BASE}${endpoint}`, { headers });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } catch (e) {
        console.error(`API GET ${endpoint} error:`, e);
        return null;
    }
}

async function apiPost(endpoint, data = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (API_MODE === 'render') {
        headers['X-EcoHybrid-Key'] = API_KEY;
    }
    try {
        const resp = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } catch (e) {
        console.error(`API POST ${endpoint} error:`, e);
        return null;
    }
}

// ==================== LETTURA HA ====================
async function fetchHAData() {
    // Verifica connessione HA
    const status = await apiGet('/v1/ha/status');
    state.haConnected = status && status.connected;

    if (!state.haConnected) {
        console.warn('HA non connesso, uso dati mock');
        updateUI();
        return;
    }

    // Leggi climate
    const climateData = await apiGet('/v1/ha/climate');
    if (climateData && climateData.climates) {
        state.climates = climateData.climates;

        // Trova entita principale
        const main = climateData.climates.find(c => c.entity_id === HA_ENTITY_MAIN) 
                   || climateData.climates[0];

        if (main) {
            state.power = main.state !== 'off' && main.state !== 'unavailable';
            state.currentTemp = main.current_temperature || 20;
            state.targetTemp = main.temperature || 22;
            state.mode = main.hvac_mode || 'cool';
        }
    }

    // Leggi sensori
    const sensorData = await apiGet('/v1/ha/sensors');
    if (sensorData && sensorData.sensors) {
        state.sensors = sensorData.sensors;

        // Trova umidita
        const humSensor = sensorData.sensors.find(s => s.entity_id.includes('humidity'));
        if (humSensor) {
            state.humidity = humSensor.state;
        }
    }

    state.lastUpdate = Date.now();
    updateUI();
}

// ==================== COMANDI HA ====================
async function sendHACommand(entityId, command, value = null) {
    const result = await apiPost('/v1/ha/command', {
        entity_id: entityId,
        command: command,
        value: value
    });
    if (result && result.success) {
        setTimeout(fetchHAData, 1000); // Aggiorna dopo 1 secondo
    } else {
        alert('Errore comando HA. Verifica connessione.');
    }
}

// ==================== CONTROLLI UI ====================
function togglePower() {
    const main = state.climates.find(c => c.entity_id === HA_ENTITY_MAIN) || state.climates[0];
    if (!main) return;
    const cmd = state.power ? 'power_off' : 'power_on';
    sendHACommand(main.entity_id, cmd);
}

function setTemp(delta) {
    const main = state.climates.find(c => c.entity_id === HA_ENTITY_MAIN) || state.climates[0];
    if (!main) return;
    const newTemp = (main.temperature || 20) + delta;
    sendHACommand(main.entity_id, 'set_temp', newTemp.toString());
}

function setMode(mode) {
    const main = state.climates.find(c => c.entity_id === HA_ENTITY_MAIN) || state.climates[0];
    if (!main) return;
    sendHACommand(main.entity_id, 'set_mode', mode);
}

function setFan(speed) {
    state.fanSpeed = speed;
    updateUI();
}

function toggleSwing() {
    state.swing = !state.swing;
    updateUI();
}

// ==================== AGGIORNA UI ====================
function updateUI() {
    // Stato connessione
    const connStatus = document.getElementById('connection-status');
    if (connStatus) {
        connStatus.textContent = state.haConnected ? 'HA Connesso' : 'HA Offline';
        connStatus.className = state.haConnected ? 'status-badge online' : 'status-badge offline';
    }

    // Temperatura attuale
    const currentTempEl = document.getElementById('current-temp');
    if (currentTempEl) currentTempEl.textContent = `${state.currentTemp.toFixed(1)}°C`;

    // Temperatura target
    const targetTempEl = document.getElementById('target-temp');
    if (targetTempEl) targetTempEl.textContent = `${state.targetTemp.toFixed(1)}°C`;

    // Umidita
    const humidityEl = document.getElementById('humidity');
    if (humidityEl) humidityEl.textContent = `${state.humidity}%`;

    // Stato power
    const powerBtn = document.getElementById('btn-power');
    if (powerBtn) {
        powerBtn.textContent = state.power ? 'SPEGNI' : 'ACCENDI';
        powerBtn.className = state.power ? 'btn btn-danger' : 'btn btn-primary';
    }

    // Modalita
    const modeEl = document.getElementById('current-mode');
    if (modeEl) modeEl.textContent = state.mode.toUpperCase();

    // Lista climate
    const climateList = document.getElementById('climate-list');
    if (climateList && state.climates.length > 0) {
        climateList.innerHTML = state.climates.map(c => `
            <div class="climate-card ${c.state !== 'off' ? 'active' : ''}">
                <div class="climate-name">${c.friendly_name}</div>
                <div class="climate-info">
                    <span class="climate-state">${c.state}</span>
                    <span class="climate-temp">${c.current_temperature != null ? c.current_temperature + '°C' : '--'}</span>
                    <span class="climate-target">target: ${c.temperature != null ? c.temperature + '°C' : '--'}</span>
                </div>
                <div class="climate-modes">
                    ${(c.hvac_modes || []).map(m => `
                        <button class="mode-btn ${c.hvac_mode === m ? 'active' : ''}" 
                                onclick="sendHACommand('${c.entity_id}', 'set_mode', '${m}')">
                            ${m === 'heat' ? 'Caldo' : m === 'cool' ? 'Freddo' : m === 'dry' ? 'Deumidifica' : m === 'auto' ? 'Auto' : m === 'fan_only' ? 'Ventilatore' : m}
                        </button>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    // Lista sensori
    const sensorList = document.getElementById('sensor-list');
    if (sensorList && state.sensors.length > 0) {
        sensorList.innerHTML = state.sensors.map(s => `
            <div class="sensor-card">
                <div class="sensor-value">${s.state}${s.unit}</div>
                <div class="sensor-name">${s.friendly_name}</div>
            </div>
        `).join('');
    }

    // Timestamp
    const tsEl = document.getElementById('last-update');
    if (tsEl) {
        const d = new Date(state.lastUpdate);
        tsEl.textContent = `Aggiornato: ${d.toLocaleTimeString('it-IT')}`;
    }
}

// ==================== INIZIALIZZAZIONE ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('EcoHybrid v2.0 - Modalita:', API_MODE);

    // Collega eventi
    const btnPower = document.getElementById('btn-power');
    if (btnPower) btnPower.addEventListener('click', togglePower);

    const btnTempDown = document.getElementById('btn-temp-down');
    if (btnTempDown) btnTempDown.addEventListener('click', () => setTemp(-1));

    const btnTempUp = document.getElementById('btn-temp-up');
    if (btnTempUp) btnTempUp.addEventListener('click', () => setTemp(1));

    const btnModeHeat = document.getElementById('btn-mode-heat');
    if (btnModeHeat) btnModeHeat.addEventListener('click', () => setMode('heat'));

    const btnModeCool = document.getElementById('btn-mode-cool');
    if (btnModeCool) btnModeCool.addEventListener('click', () => setMode('cool'));

    const btnModeDry = document.getElementById('btn-mode-dry');
    if (btnModeDry) btnModeDry.addEventListener('click', () => setMode('dry'));

    const btnModeAuto = document.getElementById('btn-mode-auto');
    if (btnModeAuto) btnModeAuto.addEventListener('click', () => setMode('auto'));

    // Primo caricamento
    fetchHAData();

    // Auto-refresh ogni 30 secondi
    setInterval(fetchHAData, 30000);
});
