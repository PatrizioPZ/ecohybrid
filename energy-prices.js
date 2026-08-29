const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ==================== CONFIG ====================
const PUN_URL = 'https://www.abbassalebollette.it/glossario/pun-prezzo-unico-nazionale/';
const PSV_URL = 'https://www.abbassalebollette.it/glossario/psv/';
const CACHE_DIR = process.env.ENERGY_CACHE_DIR || path.join(__dirname, '.cache');
const MAX_DAYS = 30;
const TTL_SECONDS = 3600; // 1 ora cache

const MONTHS_IT = [
  'gennaio','febbraio','marzo','aprile','maggio','giugno',
  'luglio','agosto','settembre','ottobre','novembre','dicembre'
];
const MONTH_INDEX = Object.fromEntries(MONTHS_IT.map((m, i) => [m, i]));

// Assicura cartella cache
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// ==================== CACHE ====================
function readCache(kind) {
  const p = path.join(CACHE_DIR, `${kind}.json`);
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.series) || !data.fetchedAt) return null;
    data.series = data.series.map(r => ({ date: new Date(r.date), value: r.value }));
    if (Array.isArray(data.monthlySeries)) {
      data.monthlySeries = data.monthlySeries.map(r => ({ date: new Date(r.date), value: r.value }));
    }
    return data;
  } catch { return null; }
}

function writeCache(kind, data) {
  const p = path.join(CACHE_DIR, `${kind}.json`);
  const payload = {
    fetchedAt: data.fetchedAt,
    latest: data.latest,
    previousMonth: data.previousMonth ?? null,
    monthlySeries: Array.isArray(data.monthlySeries)
      ? data.monthlySeries.map(r => ({ date: r.date.toISOString().slice(0,10), value: r.value }))
      : null,
    series: data.series.map(r => ({ date: r.date.toISOString().slice(0,10), value: r.value })),
  };
  fs.writeFileSync(p, JSON.stringify(payload, null, 2));
}

function isFresh(cache) {
  if (!cache) return false;
  const age = Math.floor(Date.now() / 1000) - cache.fetchedAt;
  return age >= 0 && age <= TTL_SECONDS;
}

// ==================== FETCH HTML ====================
async function fetchText(url) {
  const { data, status } = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'it-IT,it;q=0.9,en;q=0.7',
    }
  });
  if (status < 200 || status >= 300) throw new Error(`HTTP ${status}`);
  return data;
}

// ==================== PARSING ====================
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDateString(value) {
  const m = value.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (!m) return null;
  const [_, d, mo, y] = m.map(Number);
  if (!d || !mo || !y) return null;
  return new Date(y, mo - 1, d);
}

function parseNumberString(value) {
  if (!value) return null;
  let v = value.replace(/[^\d.,]/g, '');
  if (!v) return null;
  if (v.includes(',') && v.includes('.')) {
    v = v.replace(/\./g, '').replace(',', '.');
  } else if (v.includes(',')) {
    v = v.replace(',', '.');
  }
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function extractSeriesFromHtml(html) {
  const text = stripHtml(html);
  const rows = [];

  // Regex principale: data + valore + unità opzionale
  const regex = /(\d{2}[\/-]\d{2}[\/-]\d{4})[^0-9]{0,50}([0-9]+(?:[.,][0-9]+)?)(?:\s*€\/?(?:kWh|MWh|Smc))?/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const date = parseDateString(match[1]);
    const value = parseNumberString(match[2]);
    if (!date || value === null) continue;
    rows.push({ date, value });
  }

  // Fallback se regex principale non trova nulla
  if (!rows.length) {
    const dateRegex = /(\d{2}[\/-]\d{2}[\/-]\d{4})/g;
    let dm;
    while ((dm = dateRegex.exec(text)) !== null) {
      const date = parseDateString(dm[1]);
      if (!date) continue;
      const slice = text.slice(dm.index + dm[0].length, dm.index + dm[0].length + 120);
      const vm = slice.match(/([0-9]+(?:[.,][0-9]+)?)(?:\s*€\/?(?:kWh|MWh|Smc))?/i);
      if (!vm) continue;
      const value = parseNumberString(vm[1]);
      if (value === null) continue;
      rows.push({ date, value });
    }
  }

  rows.sort((a, b) => a.date - b.date);
  return rows;
}

function filterLastDays(series, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const filtered = series.filter(r => r.date >= cutoff);
  return filtered.length ? filtered : series;
}

function getPreviousMonthInfo(date = new Date()) {
  const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return { monthName: MONTHS_IT[prev.getMonth()], year: prev.getFullYear() };
}

function extractSection(text, startMarkers, endMarkers) {
  const lower = text.toLowerCase();
  let startIndex = -1;
  for (const marker of startMarkers) {
    const idx = lower.indexOf(marker.toLowerCase());
    if (idx !== -1 && (startIndex === -1 || idx < startIndex)) startIndex = idx;
  }
  if (startIndex === -1) return text;
  let endIndex = -1;
  for (const marker of endMarkers) {
    const idx = lower.indexOf(marker.toLowerCase(), startIndex + 1);
    if (idx !== -1 && (endIndex === -1 || idx < endIndex)) endIndex = idx;
  }
  if (endIndex === -1) return text.slice(startIndex);
  return text.slice(startIndex, endIndex);
}

function extractPreviousMonthValue(html, kind) {
  const text = stripHtml(html);
  const { monthName, year } = getPreviousMonthInfo();
  const label = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${year}`;

  if (kind === 'pun') {
    const section = extractSection(text,
      ['i valori di pun monorario attuali'],
      ['il pun spiegato', 'storico pun']);
    const regex = /PUN\s+([A-Za-zà]+)\s+(\d{4})(?:\s*\[[^\]]+\])?\s+([0-9.,]+)\s*€\/?kWh/gi;
    let m;
    while ((m = regex.exec(section)) !== null) {
      const mn = m[1].toLowerCase();
      const y = Number(m[2]);
      if (mn === monthName && y === year) {
        const value = parseNumberString(m[3]);
        return value === null ? null : { label, value };
      }
    }
    return null;
  }

  // PSV
  const section = extractSection(text,
    ['valori indice psv per mese e anno', 'valori indice psv'],
    ['indice psv', 'psv spiegato']);
  const regex = /PSV\s+([A-Za-zà]+)\s+(\d{4})(?:\s*\[[^\]]+\])?\s+([0-9.,]+)(?:\s*\[[^\]]+\])?\s+([0-9.,]+)/gi;
  let m;
  while ((m = regex.exec(section)) !== null) {
    const mn = m[1].toLowerCase();
    const y = Number(m[2]);
    if (mn === monthName && y === year) {
      const value = parseNumberString(m[4]);
      return value === null ? null : { label, value };
    }
  }

  // Fallback tabella HTML
  const tableSection = extractSection(html, ['Valori Indice PSV per Mese e Anno'], ['</table>']);
  const rowRegex = new RegExp(
    '<tr[^>]*>\\s*<td[^>]*>\\s*<strong>\\s*PSV\\s+([A-Za-zà]+)\\s+(\\d{4})[^<]*<\\/strong>\\s*<\\/td>' +
    '\\s*<td[^>]*>\\s*<strong>[^<]*<\\/strong>\\s*<\\/td>' +
    '\\s*<td[^>]*>\\s*<strong>\\s*([0-9.,]+)[^<]*<\\/strong>',
    'gi'
  );
  let row;
  while ((row = rowRegex.exec(tableSection)) !== null) {
    const mn = row[1].toLowerCase();
    const y = Number(row[2]);
    if (mn === monthName && y === year) {
      const value = parseNumberString(row[3]);
      return value === null ? null : { label, value };
    }
  }

  const rowRegexPlain = new RegExp(
    '<tr[^>]*>\\s*<td[^>]*>\\s*PSV\\s+([A-Za-zà]+)\\s+(\\d{4})[^<]*<\\/td>' +
    '\\s*<td[^>]*>\\s*[^<]*<\\/td>' +
    '\\s*<td[^>]*>\\s*([0-9.,]+)\\s*<\\/td>',
    'gi'
  );
  while ((row = rowRegexPlain.exec(tableSection)) !== null) {
    const mn = row[1].toLowerCase();
    const y = Number(row[2]);
    if (mn === monthName && y === year) {
      const value = parseNumberString(row[3]);
      return value === null ? null : { label, value };
    }
  }

  return null;
}

// ==================== GET DATA ====================
async function getData({ url, cacheKey, scaleSeries, scalePrev, kind, forceRefresh = false }) {
  const cached = readCache(cacheKey);
  const needsPrev = cached && cached.previousMonth === null;
  const needsMonthly = cached && (!cached.monthlySeries || cached.monthlySeries.length === 0);

  if (!forceRefresh && isFresh(cached) && !needsPrev && !needsMonthly) {
    return { ...cached, stale: false };
  }

  try {
    const html = await fetchText(url);
    const raw = extractSeriesFromHtml(html);
    if (!raw.length) throw new Error('nessun dato trovato');

    const series = filterLastDays(raw, MAX_DAYS).map(r => ({
      date: r.date,
      value: r.value * scaleSeries,
    }));
    const latest = series[series.length - 1].value;
    const previousMonth = kind ? extractPreviousMonthValue(html, kind) : null;
    const previousScaled = previousMonth
      ? { label: previousMonth.label, value: previousMonth.value * scalePrev }
      : null;

    const payload = {
      fetchedAt: Math.floor(Date.now() / 1000),
      latest,
      previousMonth: previousScaled,
      series,
    };
    writeCache(cacheKey, payload);
    return { ...payload, stale: false };
  } catch (e) {
    console.error(`[Energy] Errore ${kind}:`, e.message);
    if (cached) return { ...cached, stale: true };
    throw e;
  }
}

async function getPunData(forceRefresh = false) {
  return getData({
    url: PUN_URL,
    cacheKey: 'pun',
    scaleSeries: 1 / 1000,  // abbassalebollette mostra €/MWh → converti in €/kWh
    scalePrev: 1,
    kind: 'pun',
    forceRefresh,
  });
}

async function getPsvData(forceRefresh = false) {
  return getData({
    url: PSV_URL,
    cacheKey: 'psv',
    scaleSeries: 1,  // PSV è già in €/Smc
    scalePrev: 1,
    kind: 'psv',
    forceRefresh,
  });
}

// ==================== ALGORITMO CONVENIENZA ====================
function calcolaConvenienza(punLatest, psvLatest, opts = {}) {
  const {
    cop = 3.5,              // COP pompa di calore
    boilerEff = 0.90,       // Efficienza caldaia a condensazione
    taxElec = 1.48,         // Moltiplicatore tasse/trasporto luce
    taxGas = 1.38,          // Moltiplicatore tasse/trasporto gas
    kwhPerSmc = 10.7,       // kWh termici per Smc (PCS standard)
  } = opts;

  // PUN: €/kWh (già scalato da getPunData)
  // PSV: €/Smc → converti in €/kWh termico
  const prezzoElec = punLatest * taxElec;           // €/kWh elettrico finale
  const prezzoGasPerKwh = (psvLatest / kwhPerSmc) * taxGas;  // €/kWh termico da gas

  // Costo per kWh TERMICO erogato
  const costoElettricoTermico = prezzoElec / cop;
  const costoGasTermico = prezzoGasPerKwh / boilerEff;

  const convieneElettrico = costoElettricoTermico < costoGasTermico;
  const risparmio = Math.abs(
    ((costoGasTermico - costoElettricoTermico) / Math.max(costoGasTermico, costoElettricoTermico)) * 100
  );

  return {
    decisione: convieneElettrico ? 'ELETTRICO' : 'GAS',
    pun: {
      raw: parseFloat(punLatest.toFixed(6)),
      unit: 'EUR/kWh',
      prezzoFinale: parseFloat(prezzoElec.toFixed(6)),
    },
    psv: {
      raw: parseFloat(psvLatest.toFixed(4)),
      unit: 'EUR/Smc',
      prezzoPerKwhTermico: parseFloat(prezzoGasPerKwh.toFixed(6)),
      prezzoFinale: parseFloat(prezzoGasPerKwh.toFixed(6)),
    },
    costoTermico: {
      elettrico: parseFloat(costoElettricoTermico.toFixed(6)),
      gas: parseFloat(costoGasTermico.toFixed(6)),
    },
    risparmioStimato: {
      percentuale: parseFloat(risparmio.toFixed(1)),
      assolutoEurKwh: parseFloat(Math.abs(costoGasTermico - costoElettricoTermico).toFixed(6)),
    },
    parametri: { cop, boilerEff, taxElec, taxGas, kwhPerSmc },
    timestamp: new Date().toISOString(),
  };
}

// ==================== CACHE & EXPORT ====================
let _cache = { pun: null, psv: null, lastUpdate: null };

async function aggiornaPrezzi(forceRefresh = false) {
  const [pun, psv] = await Promise.all([
    getPunData(forceRefresh),
    getPsvData(forceRefresh),
  ]);
  _cache = { pun, psv, lastUpdate: new Date().toISOString() };
  return _cache;
}

function getCache() { return _cache; }

module.exports = {
  getPunData,
  getPsvData,
  calcolaConvenienza,
  aggiornaPrezzi,
  getCache,
};
