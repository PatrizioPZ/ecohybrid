// ============================================
// ECOHYBRID v2.5 — POLL HA (Pull da Home Assistant)
// Il backend legge autonomamente i sensori da HA ogni 5 min.
// Zero automazioni YAML, zero configurazione cliente.
// ============================================

function start(haGet, storicoSensori, CONFIG_SENSORI) {
  async function poll() {
    try {
      const states = await haGet('/api/states');
      if (!states) {
        console.log('[POLL-HA] HA non raggiungibile, skip ciclo');
        return;
      }

      for (const sensore of CONFIG_SENSORI) {
        // Cerca entita temperatura
        const entitaTemp = states.find(s => s.entity_id === sensore.ha_entity_temp);
        const entitaHum = states.find(s => s.entity_id === sensore.ha_entity_hum);

        if (!entitaTemp || !entitaHum) {
          console.log(`[POLL-HA] Sensore ${sensore.id} non trovato in HA`);
          continue;
        }

        const temp = parseFloat(entitaTemp.state);
        const hum = parseFloat(entitaHum.state);

        if (isNaN(temp) || isNaN(hum)) {
          console.log(`[POLL-HA] Sensore ${sensore.id} dati non validi: T=${entitaTemp.state} UR=${entitaHum.state}`);
          continue;
        }

        const record = {
          stanza: sensore.stanza,
          sensore_id: sensore.id,
          temperatura: temp,
          umidita: hum,
          timestamp: new Date().toISOString(),
          fonte: 'zha_poll',
          ricevuto: new Date().toISOString()
        };

        storicoSensori.push(record);
        if (storicoSensori.length > 10000) storicoSensori.shift();

        sensore.attivo = true;
        console.log(`[POLL-HA] ${sensore.id} | T:${temp}C UR:${hum}% (da HA)`);
      }
    } catch (e) {
      console.error('[POLL-HA] Errore:', e.message);
    }
  }

  // Primo poll immediato
  poll();

  // Poi ogni 5 minuti
  setInterval(poll, 5 * 60 * 1000);
  console.log('[POLL-HA] Avviato: legge sensori da HA ogni 5 min');
}

module.exports = { start };
