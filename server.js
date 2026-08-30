<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EcoHybrid Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; min-height: 100vh; padding: 20px; }
        .header { text-align: center; padding: 20px 0; }
        .header h1 { font-size: 28px; color: #ff0080; }
        .header p { color: #8892b0; font-size: 14px; }
        .status-bar { display: flex; justify-content: center; gap: 15px; margin-bottom: 25px; flex-wrap: wrap; }
        .status-pill { padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status-pill.online { background: #00d4aa; color: #1a1a2e; }
        .status-pill.offline { background: #e74c3c; color: #fff; }
        .status-pill.auto { background: #ff0080; color: #fff; }
        .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; margin-bottom: 15px; }
        .card-title { font-size: 14px; color: #8892b0; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
        .device-type-icon { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.1); color: #8892b0; }
        .climate-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .climate-item:last-child { border-bottom: none; }
        .climate-name { font-weight: 600; font-size: 16px; }
        .climate-temp { font-size: 24px; color: #00d4aa; }
        .climate-state { font-size: 12px; color: #8892b0; }
        .controls { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
        .btn { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; }
        .btn-primary { background: #00d4aa; color: #1a1a2e; }
        .btn-danger { background: #e74c3c; color: #fff; }
        .temp-control { display: flex; align-items: center; gap: 15px; margin-top: 10px; }
        .temp-btn { width: 40px; height: 40px; border-radius: 50%; border: none; background: rgba(255,255,255,0.1); color: #fff; font-size: 20px; cursor: pointer; }
        .temp-value { font-size: 28px; font-weight: 700; min-width: 60px; text-align: center; }
        .sensor-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
        .sensor-box { background: rgba(0,212,170,0.1); border: 1px solid rgba(0,212,170,0.2); border-radius: 12px; padding: 15px; text-align: center; }
        .sensor-value { font-size: 24px; font-weight: 700; color: #00d4aa; }
        .sensor-label { font-size: 11px; color: #8892b0; margin-top: 5px; }
        .loading { text-align: center; padding: 40px; color: #8892b0; }
        .error { text-align: center; padding: 20px; color: #e74c3c; background: rgba(231,76,60,0.1); border-radius: 12px; margin-bottom: 15px; }
        .mode-selector { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
        .mode-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: transparent; color: #8892b0; cursor: pointer; font-size: 12px; }
        .mode-btn.active { background: #00d4aa; color: #1a1a2e; border-color: #00d4aa; }
        .comfort-box { background: rgba(243,156,18,0.1); border: 1px solid rgba(243,156,18,0.3); border-radius: 12px; padding: 15px; margin-top: 15px; }
        .comfort-box h4 { color: #f39c12; margin-bottom: 8px; }
        .comfort-box p { font-size: 13px; color: #b0c4de; margin-bottom: 5px; }
        .comfort-ok { background: rgba(0,212,170,0.2); border-color: #00d4aa; }
        .deum-box { background: rgba(155,89,182,0.1); border: 1px solid rgba(155,89,182,0.3); border-radius: 12px; padding: 15px; margin-top: 15px; }
        .deum-box h4 { color: #9b59b6; margin-bottom: 8px; }
        .price-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; }
        .price-box { padding: 15px; border-radius: 12px; text-align: center; }
        .price-box.elec { background: rgba(33,150,243,0.1); border: 1px solid rgba(33,150,243,0.3); }
        .price-box.gas { background: rgba(255,152,0,0.1); border: 1px solid rgba(255,152,0,0.3); }
        .price-box .label { display: block; font-size: 11px; color: #8892b0; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }
        .price-box .value { font-size: 1.3rem; font-weight: 700; color: #fff; }
        .price-box small { display: block; font-size: 11px; color: #8892b0; margin-top: 4px; }
        .decision-box { padding: 18px; border-radius: 12px; margin-top: 15px; text-align: center; }
        .decision-box.elec { background: rgba(76,175,80,0.1); border: 2px solid #4caf50; }
        .decision-box.gas { background: rgba(255,152,0,0.1); border: 2px solid #ff9800; }
        .decision-box h4 { font-size: 18px; margin-bottom: 8px; }
        .decision-box.elec h4 { color: #4caf50; }
        .decision-box.gas h4 { color: #ff9800; }
        .decision-box p { font-size: 13px; color: #b0c4de; margin-bottom: 5px; }
        .savings { font-size: 1.1rem; font-weight: 700; color: #00d4aa; margin-top: 8px; }
        .opt-note { font-size: 11px; color: #8892b0; margin-top: 10px; text-align: center; }
        .info-box { background: rgba(52,152,219,0.1); border: 1px solid rgba(52,152,219,0.3); border-radius: 12px; padding: 15px; margin-top: 15px; }
        .info-box h4 { color: #3498db; margin-bottom: 8px; }
        .info-box p { font-size: 13px; color: #b0c4de; margin-bottom: 5px; }
        .info-box code { background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>EcoHybrid Dashboard</h1>
        <p>Controllo climatizzazione - Sviluppo locale</p>
    </div>
    <div class="status-bar">
        <div class="status-pill offline" id="ha-status">HA: Connessione...</div>
        <div class="status-pill auto" id="algo-status">Algoritmo: ON</div>
    </div>
    <div id="content"><div class="loading">Caricamento dati...</div></div>

    <script>
        const API_BASE = '';
        let climates = [];
        let sensors = [];
        let haConnected = false;

        async function fetchData() {
            try {
                const [climateResp, sensorResp, optResp] = await Promise.all([
                    fetch(`${API_BASE}/v1/ha/climate`).catch(e => { console.error('Climate error:', e); return null; }),
                    fetch(`${API_BASE}/v1/ha/sensors`).catch(e => { console.error('Sensors error:', e); return null; }),
                    fetch(`${API_BASE}/api/convenienza`).catch(e => { console.error('Opt error:', e); return null; })
                ]);

                const climateData = climateResp && climateResp.ok ? await climateResp.json() : null;
                const sensorData = sensorResp && sensorResp.ok ? await sensorResp.json() : null;
                const optData = optResp && optResp.ok ? await optResp.json() : null;

                if (climateResp && !climateResp.ok) {
                    const err = await climateResp.json().catch(() => ({detail: 'Errore sconosciuto'}));
                    renderError('HA non disponibile', err.detail || 'Home Assistant non configurato');
                    return;
                }

                climates = climateData && climateData.climates ? climateData.climates : [];
                sensors = sensorData && sensorData.sensors ? sensorData.sensors : [];
                haConnected = climateData && climateData.ha_connected;

                render(climateData, sensorData, optData);
            } catch (e) {
                renderError('Errore connessione', `Backend non raggiungibile: ${e.message}`);
            }
        }

        function renderError(title, message) {
            const haStatus = document.getElementById('ha-status');
            haStatus.className = 'status-pill offline';
            haStatus.textContent = 'HA: Offline';
            document.getElementById('content').innerHTML = `
                <div class="error"><h4>${title}</h4><p>${message}</p></div>
                <div class="card info-box">
                    <h4>Come risolvere</h4>
                    <p>1. Verifica che <code>npm start</code> sia attivo</p>
                    <p>2. Verifica che <code>config.json</code> abbia <code>homeassistant.enabled: true</code> e <code>token</code> valido</p>
                    <p>3. Verifica che Home Assistant sia accessibile</p>
                </div>`;
        }

        function render(climateData, sensorData, optData) {
            const haStatus = document.getElementById('ha-status');
            if (haConnected) {
                haStatus.className = 'status-pill online';
                haStatus.textContent = 'HA: Connesso';
            } else {
                haStatus.className = 'status-pill offline';
                haStatus.textContent = 'HA: Offline';
            }

            let html = '';

            if (sensors.length > 0) {
                html += `<div class="card"><div class="card-title">Sensori Ambientali</div><div class="sensor-grid">`;
                sensors.forEach(s => {
                    html += `<div class="sensor-box"><div class="sensor-value">${s.state}${s.unit}</div><div class="sensor-label">${s.friendly_name}</div></div>`;
                });
                html += `</div></div>`;
            }

            const tempSensor = sensors.find(s => s.entity_id.includes('temperatura') || s.entity_id.includes('temperature'));
            const humSensor = sensors.find(s => s.entity_id.includes('umidita') || s.entity_id.includes('humidity'));
            const tInt = tempSensor ? tempSensor.state : 20;
            const rh = humSensor ? humSensor.state : 50;
            const comfort = calcolaComfort(tInt, rh);
            html += `<div class="card comfort-box ${comfort.inComfort ? 'comfort-ok' : ''}">
                <div class="card-title">Comfort ASHRAE 55 Inspired</div>
                <h4>${comfort.inComfort ? 'Zona Comfort OK' : 'Fuori Zona Comfort'}</h4>
                <p><strong>Stagione:</strong> ${comfort.stagione === 'estate' ? 'Estate' : 'Inverno'}</p>
                <p><strong>Range:</strong> ${comfort.tMin}-${comfort.tMax}C / Umidita ${comfort.rhMin}-${comfort.rhMax}%</p>
                <p><strong>Suggerimento:</strong> ${comfort.suggestion}</p>
            </div>`;

            const deum = calcolaDeumidifica(tInt, rh);
            html += `<div class="card deum-box">
                <div class="card-title">Gestione Umidita</div>
                <h4>Azione: ${deum.action.toUpperCase()}</h4>
                <p><strong>Umidita interna:</strong> ${deum.umiditaInt}%</p>
                <p>${deum.reason}</p>
            </div>`;

            if (optData && optData.success) {
                html += renderOptimizer(optData);
            }

            if (climates.length > 0) {
                html += `<div class="card"><div class="card-title">Dispositivi (${climates.length})</div>`;
                climates.forEach(c => {
                    html += renderDeviceCard(c);
                });
                html += `</div>`;
            } else if (haConnected) {
                html += `<div class="card"><div class="card-title">Dispositivi</div><p style="color:#8892b0">Nessun dispositivo climate trovato.</p></div>`;
            } else {
                html += `<div class="card"><div class="card-title">Dispositivi</div><p style="color:#e74c3c">Home Assistant non connesso.</p></div>`;
            }

            document.getElementById('content').innerHTML = html;
        }

        function detectDeviceType(c) {
            const eid = c.entity_id.toLowerCase();
            const fname = (c.friendly_name || '').toLowerCase();
            const modes = c.hvac_modes || [];
            if (eid.includes('valvola') || eid.includes('valve') || eid.includes('radiator') || 
                fname.includes('valvola') || fname.includes('valve') || fname.includes('radiatore')) {
                return { type: 'valve', label: 'Valvola', icon: 'VALVOLA' };
            }
            if (modes.includes('cool') || modes.includes('dry') || modes.includes('fan_only')) {
                return { type: 'clima', label: 'Climatizzazione', icon: 'CLIMA' };
            }
            if (modes.includes('heat') && !modes.includes('cool')) {
                return { type: 'thermostat', label: 'Termostato / Caldaia', icon: 'CALDAIA' };
            }
            return { type: 'generic', label: 'Dispositivo', icon: 'DEVICE' };
        }

        function renderDeviceCard(c) {
            const info = detectDeviceType(c);
            const isOn = c.state !== 'off' && c.state !== 'unavailable';
            const currentTemp = c.current_temperature != null ? c.current_temperature : '--';
            const targetTemp = c.temperature != null ? c.temperature : '--';
            
            let html = `<div class="card">
                <div class="card-title">${c.friendly_name} <span class="device-type-icon">${info.icon}</span></div>
                <div class="climate-item">
                    <div>
                        <div class="climate-name">${info.label}</div>
                        <div class="climate-state">Stato: ${isOn ? 'ON (' + c.state + ')' : 'OFF'} | Attuale: ${currentTemp}C</div>
                    </div>
                    <div class="climate-temp">${targetTemp}C</div>
                </div>`;

            html += `<div class="temp-control">
                <button class="temp-btn" onclick="setTemp('${c.entity_id}', ${targetTemp - 1})">-</button>
                <div class="temp-value">${targetTemp}</div>
                <button class="temp-btn" onclick="setTemp('${c.entity_id}', ${targetTemp + 1})">+</button>
            </div>`;

            if (info.type === 'clima' && c.hvac_modes) {
                html += `<div class="mode-selector">`;
                const modes = ['heat', 'cool', 'dry', 'auto', 'fan_only'];
                const labels = {heat: 'Caldo', cool: 'Freddo', dry: 'Deumidifica', auto: 'Auto', fan_only: 'Ventilatore'};
                modes.forEach(m => {
                    if (c.hvac_modes.includes(m)) {
                        html += `<button class="mode-btn ${c.hvac_mode === m ? 'active' : ''}" onclick="setMode('${c.entity_id}', '${m}')">${labels[m] || m}</button>`;
                    }
                });
                html += `</div>`;
            }

            if (info.type !== 'valve') {
                html += `<div class="controls" style="margin-top:15px">
                    <button class="btn ${isOn ? 'btn-danger' : 'btn-primary'}" onclick="togglePower('${c.entity_id}', ${isOn ? 'off' : 'on'})">${isOn ? 'SPEGNI' : 'ACCENDI'}</button>
                </div>`;
            } else {
                html += `<div class="controls" style="margin-top:15px"><span style="color:#8892b0;font-size:12px">Valvola: regola temperatura per aprire/chiudere</span></div>`;
            }

            html += `</div>`;
            return html;
        }

        function renderOptimizer(d) {
            return `<div class="card">
                <div class="card-title">Ottimizzatore Economico</div>
                <div class="price-grid">
                    <div class="price-box elec">
                        <span class="label">Luce (PUN)</span>
                        <span class="value">${d.pun.raw.toFixed(4)} EUR/kWh</span>
                        <small>Finale: ${d.pun.prezzoFinale.toFixed(4)}</small>
                    </div>
                    <div class="price-box gas">
                        <span class="label">Gas (PSV)</span>
                        <span class="value">${d.psv.raw.toFixed(4)} EUR/Smc</span>
                        <small>Equiv: ${d.psv.prezzoPerKwhTermico.toFixed(4)} EUR/kWh</small>
                    </div>
                </div>
                <div class="decision-box ${d.decisione === 'ELETTRICO' ? 'elec' : 'gas'}">
                    <h4>Oggi conviene usare ${d.decisione}</h4>
                    <p>Costo termico: Elettrico ${d.costoTermico.elettrico.toFixed(4)} vs Gas ${d.costoTermico.gas.toFixed(4)} EUR/kWh</p>
                    <p class="savings">Risparmio stimato: circa ${d.risparmioStimato.percentuale}%</p>
                </div>
                <p class="opt-note">COP: ${d.parametri.cop} | Eff. caldaia: ${(d.parametri.boilerEff*100).toFixed(0)}% | Aggiornato: ${new Date(d.timestamp).toLocaleTimeString('it-IT')}</p>
            </div>`;
        }

        function calcolaComfort(tInt, rh) {
            const m = new Date().getMonth();
            const stagione = (m >= 5 && m <= 8) ? 'estate' : 'inverno';
            let tMin, tMax, rhMin, rhMax;
            if (stagione === 'estate') { tMin = 23; tMax = 26; rhMin = 30; rhMax = 60; }
            else { tMin = 20; tMax = 23; rhMin = 30; rhMax = 60; }
            const inComfort = (tInt >= tMin && tInt <= tMax && rh >= rhMin && rh <= rhMax);
            let suggestion = 'mantieni';
            if (!inComfort) {
                if (tInt > tMax) suggestion = 'raffreddare';
                else if (tInt < tMin) suggestion = 'riscaldare';
                else if (rh > rhMax) suggestion = 'deumidifica';
                else suggestion = 'umidifica';
            }
            return { stagione, inComfort, tMin, tMax, rhMin, rhMax, suggestion };
        }

        function calcolaDeumidifica(tInt, rhInt) {
            if (rhInt > 65) return { action: 'deumidifica', reason: 'Umidita interna elevata', umiditaInt: rhInt };
            return { action: 'mantieni', reason: 'Umidita interna OK', umiditaInt: rhInt };
        }

        async function togglePower(entityId, action) {
            const cmd = action === 'on' ? 'power_on' : 'power_off';
            await sendCommand(entityId, cmd);
            setTimeout(fetchData, 800);
        }

        async function setTemp(entityId, temp) {
            await sendCommand(entityId, 'set_temp', String(temp));
            setTimeout(fetchData, 800);
        }

        async function setMode(entityId, mode) {
            await sendCommand(entityId, 'set_mode', mode);
            setTimeout(fetchData, 800);
        }

        async function sendCommand(entityId, command, value) {
            try {
                await fetch(`${API_BASE}/v1/ha/command`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ entity_id: entityId, command, value })
                });
            } catch (e) {
                alert('Errore comando: ' + e.message);
            }
        }

        fetchData();
        setInterval(fetchData, 15000);
    </script>
</body>
</html>