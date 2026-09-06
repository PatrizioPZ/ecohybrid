// ============================================
// ECOHYBRID v2.5 — SENSORI REALI con OFFSET
// Offset tarato vs mercurio (riferimento fisico)
// Bagno: mercurio 26-27C, bagno legge 27C → offset = 0
// ============================================

const express = require('express');
const router = express.Router();

// --- CONFIGURAZIONE ---
const CONFIG_SENSORI = [
  {
    id: 'bagno_sala',
    ha_entity_temp: 'sensor.bagno_temperatura',
    ha_entity_hum:  'sensor.bagno_umidita',
    stanza: 'sala',
    attivo: false,
    offset_temp: 0.0,    // Tarato vs mercurio 26-27C (bagno legge 27C)
    offset_hum: 0.0
  }
];

let storicoSensori = [];
let fattoreCalibrazione = 4.5;

function getSensoriAttivi(stanza, maxMinuti = 30) {
  const sogliaMs = maxMinuti * 60 * 1000;
  const ora = Date.now();
  return CONFIG_SENSORI.filter(s => {
    if (s.stanza !== stanza) return false;
    const ultimo = storicoSensori.filter(r => r.stanza === stanza && r.sensore_id === s.id).pop();
    if (!ultimo) return false;
    const recente = (ora - new Date(ultimo.timestamp).getTime()) < sogliaMs;
    if (recente && !s.attivo) { s.attivo = true; }
    return recente;
  });
}

function mediaSensori(stanza, campo, maxMinuti = 30) {
  const attivi = getSensoriAttivi(stanza, maxMinuti);
  if (attivi.length === 0) return null;
  const valori = [];
  attivi.forEach(sensore => {
    const ultimo = storicoSensori.filter(r => r.stanza === stanza && r.sensore_id === sensore.id).pop();
    if (ultimo && ultimo[campo] !== undefined && !isNaN(ultimo[campo])) {
      let valore = ultimo[campo];
      if (campo === 'temperatura' && sensore.offset_temp) valore += sensore.offset_temp;
      if (campo === 'umidita' && sensore.offset_hum) valore += sensore.offset_hum;
      valori.push(valore);
    }
  });
  if (valori.length === 0) return null;
  const media = valori.reduce((a, b) => a + b, 0) / valori.length;
  return parseFloat(media.toFixed(1));
}

router.post('/reali', async (req, res) => {
  const { stanza, sensore_id, temperatura, umidita, timestamp, fonte } = req.body;
  if (!stanza || temperatura === undefined || umidita === undefined || !sensore_id) {
    return res.status(400).json({ errore: 'Dati incompleti' });
  }
  const record = {
    stanza, sensore_id,
    temperatura: parseFloat(temperatura),
    umidita: parseFloat(umidita),
    timestamp: timestamp || new Date().toISOString(),
    fonte: fonte || 'zha',
    ricevuto: new Date().toISOString()
  };
  storicoSensori.push(record);
  if (storicoSensori.length > 10000) storicoSensori.shift();
  const sensore = CONFIG_SENSORI.find(s => s.id === sensore_id);
  if (sensore) sensore.attivo = true;
  console.log(`[SENSORI] Dato reale: ${sensore_id} | T:${record.temperatura}C UR:${record.umidita}%`);
  res.json({ ok: true, messaggio: `Dato ${sensore_id} registrato`, sensori_attivi: getSensoriAttivi(stanza).length, totale_record: storicoSensori.length });
});

router.get('/stato', (req, res) => {
  const stanza = req.query.stanza || 'sala';
  const attivi = getSensoriAttivi(stanza);
  const dettagli = attivi.map(s => {
    const ultimo = storicoSensori.filter(r => r.stanza === stanza && r.sensore_id === s.id).pop();
    return { id: s.id, attivo: true, offset_temp: s.offset_temp, offset_hum: s.offset_hum, ultimo_dato: ultimo || null, minuti_fa: ultimo ? Math.round((Date.now() - new Date(ultimo.timestamp).getTime()) / 60000) : null };
  });
  res.json({ stanza, sensori_totali: CONFIG_SENSORI.filter(s => s.stanza === stanza).length, sensori_attivi: attivi.length, dettagli, media_temperatura_tarata: mediaSensori(stanza, 'temperatura'), media_umidita_tarata: mediaSensori(stanza, 'umidita'), fattore_calibrazione: fattoreCalibrazione, totale_record_storico: storicoSensori.length });
});

router.get('/calibrazione', (req, res) => {
  const setteGiorniFa = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const datiSala = storicoSensori.filter(r => r.stanza === 'sala' && new Date(r.timestamp) > setteGiorniFa);
  if (datiSala.length < 10) {
    return res.json({ pronto: false, messaggio: `Servono almeno 10 dati (hai ${datiSala.length}).`, giorni_raccolti: Math.ceil(datiSala.length / 24), suggerimento: 'Raccogliere 7-14 giorni per calibrazione' });
  }
  const sensoriIds = [...new Set(datiSala.map(d => d.sensore_id))];
  const perSensore = sensoriIds.map(id => {
    const datiSensore = datiSala.filter(d => d.sensore_id === id);
    return { sensore_id: id, record: datiSensore.length, t_media_raw: parseFloat((datiSensore.reduce((s, d) => s + d.temperatura, 0) / datiSensore.length).toFixed(1)), ur_media_raw: parseFloat((datiSensore.reduce((s, d) => s + d.umidita, 0) / datiSensore.length).toFixed(1)) };
  });
  res.json({ pronto: true, dati_raccolti: datiSala.length, giorni_raccolti: Math.ceil(datiSala.length / 24), fattore_attuale: fattoreCalibrazione, per_sensore: perSensore, nota: 'Calibrazione pronta quando fattore si stabilizza su 7-14 giorni' });
});

router.post('/calibra', (req, res) => {
  const { fattore } = req.body;
  if (!fattore || fattore < 0.5 || fattore > 10) return res.status(400).json({ errore: 'Fattore non valido (0.5-10)' });
  fattoreCalibrazione = parseFloat(fattore);
  res.json({ ok: true, fattore_nuovo: fattoreCalibrazione });
});

module.exports = { router, CONFIG_SENSORI, storicoSensori, getFattore: () => fattoreCalibrazione, getSensoriAttivi, mediaSensori };
