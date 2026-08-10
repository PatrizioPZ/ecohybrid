const API = '/api';
let state = { targetTemp: 22, currentMode: 'cool' };

async function load() {
  try {
    const r = await fetch(`${API}/status`);
    const d = await r.json();
    render(d);
    document.getElementById('updateTime').textContent = 'Aggiornato: ' + new Date().toLocaleTimeString('it-IT');
  } catch (e) {
    document.getElementById('main').innerHTML = '<div class="card error">Errore connessione: ' + e.message + '</div>';
  }
}

function render(d) {
  const f = d.fascia;
  const s = d.suggestion;
  const isOn = d.power;
  const isEcon = f.prezzo <= 0.20;
  const isCara = f.prezzo > 0.30;

  // Fascia colors
  const fColors = { 'fasciaF1': '#E6007E', 'fasciaF2': '#FFD700', 'fasciaF3': '#00D4AA' };
  const fKeys = ['fasciaF1', 'fasciaF2', 'fasciaF3'];

  let html = `
    <!-- Metrics -->
    <div class="metrics-grid">
      <div class="card">
        <h2>Temperatura</h2>
        <div class="metric">
          <div class="metric-value">${d.currentTemp}</div>
          <div class="metric-unit">C</div>
        </div>
      </div>
      <div class="card">
        <h2>Umidita</h2>
        <div class="metric">
          <div class="metric-value">${d.humidity}</div>
          <div class="metric-unit">%</div>
        </div>
      </div>
    </div>

    <!-- Status -->
    <div class="card">
      <h2>Stato Climatizzatore</h2>
      <span class="status-badge ${isOn ? 'on' : 'off'}">${isOn ? 'ACCESO' : 'SPENTO'}</span>
      <div style="margin-top:10px; font-size:0.85rem; color:var(--octo-text-secondary);">
        Target: ${d.targetTemp}C | Modalita: ${d.mode} | Ventola: ${d.fanSpeed}
      </div>
    </div>

    <!-- Fascia Energetica -->
    <div class="card">
      <h2>Fascia Energetica</h2>
      <div class="fascia-bar">
        ${fKeys.map(k => `<div class="fascia-segment ${k === f.key ? 'active' : ''}" style="background:${fColors[k]}; color:${fColors[k]}"></div>`).join('')}
      </div>
      <div class="fascia-info">
        <span class="nome" style="color:${f.colore}">${f.nome}</span>
        <span class="prezzo">${f.prezzo.toFixed(2)} EUR/kWh</span>
      </div>
    </div>

    <!-- Suggestion -->
    <div class="card">
      <h2>Suggerimento IA</h2>
      <div class="suggestion">
        ${s.pilastro > 0 ? `<span class="pilastro-tag">Pilastro ${s.pilastro}</span><br>` : ''}
        ${s.reason}
      </div>
      ${s.action !== 'none' ? `<button class="btn btn-set" style="margin-top:10px;" onclick="applySuggestion('${s.action}', '${s.mode || ''}')">Applica Suggerimento</button>` : ''}
    </div>

    <!-- Controls -->
    <div class="card">
      <h2>Controllo Manuale</h2>
      <button class="btn btn-on" onclick="cmd('power/on')">Accendi</button>
      <button class="btn btn-off" onclick="cmd('power/off')">Spegni</button>

      <div class="temp-control">
        <label style="font-size:0.8rem; color:var(--octo-text-secondary);">
          Temperatura target: <span id="tval" style="color:var(--octo-pink); font-weight:800;">22</span>C
        </label>
        <input type="range" class="temp-slider" min="16" max="30" value="22"
          oninput="document.getElementById('tval').textContent=this.value; state.targetTemp=this.value">
        <button class="btn btn-set" onclick="cmd('temp/' + state.targetTemp)">Imposta Temperatura</button>
      </div>

      <div style="margin-top:14px;">
        <label style="font-size:0.8rem; color:var(--octo-text-secondary);">Modalita</label>
        <div class="mode-grid">
          ${['cool','heat','dry','fan_only','auto'].map(m =>
            `<button class="btn btn-mode ${d.mode === m ? 'active' : ''}" onclick="cmdMode('${m}')">${labelMode(m)}</button>`
          ).join('')}
        </div>
      </div>
    </div>

    <!-- 5 Pilastri -->
    <div class="card">
      <h2>I 5 Pilastri EcoHybrid</h2>
      <div class="pilastri-list">
        ${d.pilastri.map(p => `
          <div class="pilastro-item ${p.attivo ? 'active' : 'inactive'}">
            <div class="pilastro-num">${p.id}</div>
            <div class="pilastro-info">
              <div class="nome">${p.nome}</div>
              <div class="desc">${p.desc}</div>
            </div>
            <div class="pilastro-status ${p.attivo ? 'on' : 'off'}">${p.attivo ? 'ON' : 'OFF'}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('main').innerHTML = html;
}

function labelMode(m) {
  const labels = { cool: 'Freddo', heat: 'Caldo', dry: 'Dry', fan_only: 'Ventola', auto: 'Auto' };
  return labels[m] || m;
}

async function cmd(ep) {
  await fetch(`${API}/${ep}`, { method: 'POST' });
  setTimeout(load, 500);
}

async function cmdMode(m) {
  await fetch(`${API}/mode/${m}`, { method: 'POST' });
  setTimeout(load, 500);
}

async function applySuggestion(action, mode) {
  if (action === 'on') await cmd('power/on');
  if (action === 'off') await cmd('power/off');
  if (action === 'fan_recycle') { await cmd('power/on'); await cmdMode('fan_only'); }
  if (mode && mode !== 'fan_only') await cmdMode(mode);
  setTimeout(load, 800);
}

// Init
load();
setInterval(load, 30000);
