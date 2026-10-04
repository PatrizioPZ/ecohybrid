const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const BOLLETTE_FILE = path.join(__dirname, 'data', 'bollette.json');

// Assicura che la cartella data esista
function ensureDataDir() {
  const dir = path.dirname(BOLLETTE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Legge tutte le bollette
function readBollette() {
  ensureDataDir();
  if (!fs.existsSync(BOLLETTE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(BOLLETTE_FILE, 'utf8'));
  } catch (e) { return []; }
}

// Salva bollette
function writeBollette(bollette) {
  ensureDataDir();
  fs.writeFileSync(BOLLETTE_FILE, JSON.stringify(bollette, null, 2));
}

// POST /api/bollette/upload — salva dati estratti dal PDF
router.post('/upload', (req, res) => {
  const { periodo, costoUnitario, consumoKwh, potenzaKw, totaleEuro, fornitore, note } = req.body;

  if (!periodo || !consumoKwh || !totaleEuro) {
    return res.status(400).json({ error: 'Dati obbligatori mancanti: periodo, consumoKwh, totaleEuro' });
  }

  const bollette = readBollette();
  const nuova = {
    id: Date.now().toString(),
    periodo,
    costoUnitario: parseFloat(costoUnitario) || 0,
    consumoKwh: parseFloat(consumoKwh) || 0,
    potenzaKw: parseFloat(potenzaKw) || 0,
    totaleEuro: parseFloat(totaleEuro) || 0,
    fornitore: fornitore || 'Sconosciuto',
    note: note || '',
    createdAt: new Date().toISOString()
  };

  bollette.push(nuova);
  writeBollette(bollette);

  console.log(`[BOLLETTE] Salvata bolletta ${nuova.id}: ${nuova.consumoKwh} kWh, €${nuova.totaleEuro}`);
  res.json({ success: true, bolletta: nuova });
});

// GET /api/bollette — lista tutte le bollette
router.get('/', (req, res) => {
  const bollette = readBollette();
  res.json(bollette);
});

// GET /api/bollette/stats — statistiche aggregate
router.get('/stats', (req, res) => {
  const bollette = readBollette();
  if (bollette.length === 0) {
    return res.json({ count: 0, costoMedio: 0, consumoMedio: 0, totaleSpeso: 0 });
  }

  const totaleSpeso = bollette.reduce((s, b) => s + b.totaleEuro, 0);
  const totaleConsumo = bollette.reduce((s, b) => s + b.consumoKwh, 0);
  const costoMedio = totaleSpeso / totaleConsumo; // €/kWh medio reale

  res.json({
    count: bollette.length,
    costoMedio: Math.round(costoMedio * 10000) / 10000,
    consumoMedio: Math.round((totaleConsumo / bollette.length) * 10) / 10,
    totaleSpeso: Math.round(totaleSpeso * 100) / 100,
    totaleConsumo: Math.round(totaleConsumo * 10) / 10,
    bollette: bollette.map(b => ({
      periodo: b.periodo,
      costoUnitario: b.costoUnitario,
      consumoKwh: b.consumoKwh,
      totaleEuro: b.totaleEuro
    }))
  });
});

// DELETE /api/bollette/:id
router.delete('/:id', (req, res) => {
  let bollette = readBollette();
  const iniziale = bollette.length;
  bollette = bollette.filter(b => b.id !== req.params.id);

  if (bollette.length === iniziale) {
    return res.status(404).json({ error: 'Bolletta non trovata' });
  }

  writeBollette(bollette);
  res.json({ success: true, message: 'Bolletta eliminata' });
});

module.exports = router;
