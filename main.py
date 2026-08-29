import datetime
import logging
import os
import re
from typing import Dict, Optional, List
from fastapi import FastAPI, HTTPException, Security, status
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import requests

logging.basicConfig(filename="ecohybrid_os_tools_royalty.log", level=logging.INFO, format="%(asctime)s | L633_1941 | %(message)s")
logger = logging.getLogger("ecohybrid")

app = FastAPI(title="EcoHybrid Core - OS&Tools Production Cloud", description="Architettura Scatola Nera - Algoritmi proprietari protetti ex L. 633/1941", version="2.1.0", docs_url="/docs", redoc_url="/redoc")
app.add_middleware(CORSMiddleware, allow_origins=["https://ecohybrid.netlify.app","https://patriziopz.github.io","http://localhost:3000","http://localhost:8000","http://localhost:8080"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

HA_URL = os.getenv("HA_URL", "http://192.168.1.21").rstrip("/")
HA_TOKEN = os.getenv("HA_TOKEN", "")
HA_ENABLED = bool(HA_TOKEN)

def ha_headers():
    return {"Authorization": f"Bearer {HA_TOKEN}", "Content-Type": "application/json"}

def ha_get(endpoint: str):
    if not HA_ENABLED: return None
    try:
        resp = requests.get(f"{HA_URL}/api/{endpoint}", headers=ha_headers(), timeout=10)
        return resp.json() if resp.status_code == 200 else None
    except Exception as e:
        logger.warning(f"HA GET {endpoint} error: {e}")
        return None

def ha_post(service: str, payload: dict):
    if not HA_ENABLED: return False
    try:
        resp = requests.post(f"{HA_URL}/api/services/{service}", json=payload, headers=ha_headers(), timeout=10)
        return resp.status_code in (200, 201)
    except Exception as e:
        logger.warning(f"HA POST {service} error: {e}")
        return False

API_KEYS_DB = {
    "EHY_CALEFFI_SANDBOX_7730": {"partner": "Caleffi S.p.A.", "rate": 0.50, "tier": "early_adopter"},
    "EHY_OWL_SANDBOX_4410": {"partner": "Owl Home", "rate": 0.60, "tier": "early_adopter"},
    "EHY_SIT_SANDBOX_9912": {"partner": "SIT S.p.A.", "rate": 0.80, "tier": "second_tier"},
    "EHY_OCTOPUS_KRAKEN_V4": {"partner": "Octopus Energy", "rate": 1.00, "tier": "utility"},
    "EHY_ENTERPRISE_STANDARD": {"partner": "Enterprise Global", "rate": 1.50, "tier": "enterprise"},
    "EHY_PATRIZIO_TEST_2026": {"partner": "Test Interno", "rate": 0.00, "tier": "dev"}
}

api_key_header = APIKeyHeader(name="X-EcoHybrid-Key", auto_error=False)

def get_partner(api_key: str = Security(api_key_header)):
    if not api_key: raise HTTPException(status_code=403, detail="API key mancante.")
    if api_key in API_KEYS_DB: return API_KEYS_DB[api_key]
    raise HTTPException(status_code=403, detail="Accesso negato ex L. 633/1941.")

class EnergyTariffs(BaseModel):
    pun_euro_kwh: float = Field(..., ge=0)
    psv_euro_smc: float = Field(..., ge=0)

class TelemetryInput(BaseModel):
    temperature_internal_c: float
    temperature_external_c: float
    humidity_internal_pct: float = Field(..., ge=0, le=100)
    hvac_mode_current: str = Field(default="off")
    energy_tariffs: EnergyTariffs
    occupancy_detected: bool = Field(default=True)
    weather_forecast_3h_c: Optional[float] = Field(default=None)
    system_type: str = Field(default="pompa")
    grid_demand_response_trigger: bool = Field(default=False)

class HACommand(BaseModel):
    entity_id: str
    command: str
    value: Optional[str] = None

def get_cop(temp_ext: float) -> float:
    if temp_ext >= 15: return 4.0
    if temp_ext >= 10: return 3.5
    if temp_ext >= 5: return 3.0
    if temp_ext >= 0: return 2.5
    if temp_ext >= -5: return 2.0
    return 1.5

def calcola_comfort(t_ext: float, umid: float) -> Dict:
    stagione = "estate" if t_ext > 20 else "inverno"
    if stagione == "estate":
        sp = min(26.0, t_ext - 2.0)
        mode = "cool_dry" if umid > 60 else "cool"
    else:
        sp = 20.5
        mode = "heat"
    return {"stagione": stagione, "setpoint": sp, "modalita": mode}

def calcola_switch(t_ext: float, pun: float, psv: float, system: str) -> Dict:
    if system in ["pannelli", "caldaia"]:
        return {"conviene_elettrico": False, "fonte": "ELETTRICO" if system == "pannelli" else "GAS", "cop": 1.0}
    cop = get_cop(t_ext)
    costo_gas = psv / 10.5
    costo_ele = (pun * 1.10) / cop
    conviene = costo_ele < costo_gas
    return {"conviene_elettrico": conviene, "fonte": "ELETTRICO" if conviene else "GAS", "cop": cop}

def calcola_recircolo(t_ext: float, system: str) -> Optional[Dict]:
    if system in ["pannelli", "caldaia"] or t_ext >= 12: return None
    return {"attivo": True, "fan_speed_pct": 35.0}

def calcola_anticipo(t_ext: float, forecast: Optional[float], stagione: str, system: str) -> Optional[Dict]:
    if system == "caldaia" or forecast is None: return None
    if stagione == "inverno" and forecast < 5.0: return {"attivo": True, "minuti": 50}
    if stagione == "estate" and forecast > 30.0: return {"attivo": True, "minuti": 45}
    return None

def calcola_occupancy(occupancy: bool, stagione: str, setpoint: float) -> Optional[Dict]:
    if occupancy: return None
    setback = 3.0
    new_sp = setpoint + setback if stagione == "estate" else setpoint - setback
    return {"attivo": True, "setpoint_comfort": setpoint, "setpoint_attuale": new_sp}

@app.post("/v1/optimize")
async def optimize(payload: TelemetryInput, partner: dict = Security(get_partner)):
    t_ext = payload.temperature_external_c
    t_int = payload.temperature_internal_c
    umid = payload.humidity_internal_pct
    pun = payload.energy_tariffs.pun_euro_kwh
    psv = payload.energy_tariffs.psv_euro_smc
    system = payload.system_type
    comfort = calcola_comfort(t_ext, umid)
    switch = calcola_switch(t_ext, pun, psv, system)
    recircolo = calcola_recircolo(t_ext, system)
    anticipo = calcola_anticipo(t_ext, payload.weather_forecast_3h_c, comfort["stagione"], system)
    occ = calcola_occupancy(payload.occupancy_detected, comfort["stagione"], comfort["setpoint"])
    setpoint_finale = comfort["setpoint"]
    if occ and occ["attivo"]: setpoint_finale = occ["setpoint_attuale"]
    fonte = switch["fonte"]
    if system == "caldaia": fonte = "GAS"
    elif system == "pannelli": fonte = "ELETTRICO"
    f_comfort = 0.92 if comfort["stagione"] == "estate" else 1.0
    f_switch = 0.90 if (switch["conviene_elettrico"] and system not in ["pannelli", "caldaia"]) else 1.0
    f_recircolo = 0.88 if (recircolo and recircolo["attivo"]) else 1.0
    f_anticipo = 0.95 if (anticipo and anticipo["attivo"]) else 1.0
    f_occupancy = 0.92 if (occ and occ["attivo"]) else 1.0
    risparmio = (1.0 - (f_comfort * f_switch * f_recircolo * f_anticipo * f_occupancy)) * 100.0
    pilastri = ["comfort"]
    if f_switch < 1: pilastri.append("switch")
    if f_recircolo < 1: pilastri.append("recircolo")
    if f_anticipo < 1: pilastri.append("anticipo")
    if f_occupancy < 1: pilastri.append("occupancy")
    logger.info(f"PARTNER={partner['partner']} | RATE={partner['rate']} | T_EXT={t_ext}C T_INT={t_int}C | PUN={pun} PSV={psv} | SYS={system} | SETPOINT={setpoint_finale:.1f}C MODE={comfort['modalita']} SOURCE={fonte} | SAVING={risparmio:.1f}% PILASTRI={','.join(pilastri)}")
    return {"status": "success", "timestamp": datetime.datetime.utcnow().isoformat() + "Z", "license": "AS IS - Proprieta esclusiva Autore ex L. 633/1941", "actions": {"hvac_setpoint_c": round(setpoint_finale, 1), "hvac_mode": comfort["modalita"], "hvac_source": fonte, "fan_destratification_speed_pct": recircolo["fan_speed_pct"] if recircolo else 0.0, "passive_shading_position": "CLOSED" if t_ext > 26.0 else "OPEN", "anticipo_minuti": anticipo["minuti"] if anticipo else 30, "direct_to_grid": "ON" if payload.grid_demand_response_trigger else "OFF"}, "estimated_saving_index_pct": round(risparmio, 1), "pilastri_attivi": pilastri}

@app.get("/v1/ha/status")
async def ha_status():
    if not HA_ENABLED: return {"connected": False, "reason": "HA_TOKEN non configurato"}
    try:
        resp = requests.get(f"{HA_URL}/api/", headers=ha_headers(), timeout=5)
        return {"connected": resp.status_code == 200, "ha_message": resp.json() if resp.status_code == 200 else None}
    except Exception as e:
        return {"connected": False, "error": str(e)}

@app.get("/v1/ha/climate")
async def ha_climate():
    if not HA_ENABLED: raise HTTPException(status_code=503, detail="HA non configurato")
    states = ha_get("states")
    if not states: raise HTTPException(status_code=503, detail="HA non raggiungibile")
    climates = []
    for entity in states:
        if entity["entity_id"].startswith("climate."):
            climates.append({"entity_id": entity["entity_id"], "state": entity["state"], "friendly_name": entity["attributes"].get("friendly_name", entity["entity_id"]), "current_temperature": entity["attributes"].get("current_temperature"), "temperature": entity["attributes"].get("temperature"), "hvac_mode": entity["attributes"].get("hvac_mode"), "hvac_modes": entity["attributes"].get("hvac_modes", []), "min_temp": entity["attributes"].get("min_temp"), "max_temp": entity["attributes"].get("max_temp")})
    return {"climates": climates, "ha_connected": True}

@app.get("/v1/ha/sensors")
async def ha_sensors():
    if not HA_ENABLED: raise HTTPException(status_code=503, detail="HA non configurato")
    states = ha_get("states")
    if not states: raise HTTPException(status_code=503, detail="HA non raggiungibile")
    sensors = []
    for entity in states:
        eid = entity["entity_id"]
        if "temperatura" in eid or "temperature" in eid or "humidity" in eid:
            try:
                val = float(entity["state"])
                sensors.append({"entity_id": eid, "state": val, "unit": entity["attributes"].get("unit_of_measurement", "°C"), "friendly_name": entity["attributes"].get("friendly_name", eid)})
            except: pass
    return {"sensors": sensors, "ha_connected": True}

@app.post("/v1/ha/command")
async def ha_command(cmd: HACommand):
    if not HA_ENABLED: raise HTTPException(status_code=503, detail="HA non configurato")
    success = False
    if cmd.command == "power_on": success = ha_post("climate/turn_on", {"entity_id": cmd.entity_id})
    elif cmd.command == "power_off": success = ha_post("climate/turn_off", {"entity_id": cmd.entity_id})
    elif cmd.command == "set_temp" and cmd.value: success = ha_post("climate/set_temperature", {"entity_id": cmd.entity_id, "temperature": float(cmd.value)})
    elif cmd.command == "set_mode" and cmd.value: success = ha_post("climate/set_hvac_mode", {"entity_id": cmd.entity_id, "hvac_mode": cmd.value})
    return {"success": success, "entity_id": cmd.entity_id, "command": cmd.command}

@app.post("/v1/telemetry")
async def tiny_telemetry(data: dict, partner: dict = Security(get_partner)):
    logger.info(f"Telemetry from Tiny {data.get('tiny_id', 'unknown')}: {data}")
    t_int = data.get("indoor_temp", 20)
    t_ext = data.get("outdoor_temp", 20)
    umid = data.get("indoor_humidity", 50)
    comfort = calcola_comfort(t_ext, umid)
    return {"status": "ON" if t_int < comfort["setpoint"] - 1 else "OFF", "setpoint": comfort["setpoint"], "mode": comfort["modalita"], "reason": "Ottimizzazione EcoHybrid v2.1", "timestamp": datetime.datetime.utcnow().isoformat() + "Z"}

@app.get("/")
async def root():
    return {"name": "EcoHybrid Core Engine", "version": "2.1.0", "status": "operational", "ha_integration": HA_ENABLED, "license": "Diritto d'Autore ex L. 633/1941", "docs": "/docs", "endpoints": ["/v1/optimize", "/v1/ha/status", "/v1/ha/climate", "/v1/ha/command", "/v1/telemetry", "/v1/energy-prices", "/v1/convenienza", "/health"]}

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.datetime.utcnow().isoformat() + "Z"}

@app.get("/v1/license")
async def license_info(partner: dict = Security(get_partner)):
    return {"partner": partner["partner"], "rate_eur_user_month": partner["rate"], "tier": partner["tier"], "license": "Diritto d'Autore ex L. 633/1941", "terms": "AS IS - Scatola Nera"}

# =============================================================================
# ENERGY PRICES - Scraping da abbassalebollette.it (Zero API key)
# =============================================================================
from datetime import timedelta

PUN_URL = 'https://www.abbassalebollette.it/glossario/pun-prezzo-unico-nazionale/'
PSV_URL = 'https://www.abbassalebollette.it/glossario/psv/'
MAX_DAYS = 30
TTL_SECONDS = 3600

MONTHS_IT = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']
MONTH_INDEX = {m: i for i, m in enumerate(MONTHS_IT)}

_energy_cache = {'pun': None, 'psv': None, 'last_update': None}

def _strip_html(html: str) -> str:
    text = re.sub(r'<script[\s\S]*?</script>', ' ', html, flags=re.IGNORECASE)
    text = re.sub(r'<style[\s\S]*?</style>', ' ', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&nbsp;|&#160;', ' ', text, flags=re.IGNORECASE)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def _parse_date(value: str) -> Optional[datetime.datetime]:
    m = re.match(r'^(\d{2})[\/-](\d{2})[\/-](\d{4})$', value)
    if not m: return None
    d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if not d or not mo or not y: return None
    return datetime.datetime(y, mo, d)

def _parse_number(value: str) -> Optional[float]:
    if not value: return None
    v = re.sub(r'[^\d.,]', '', value)
    if not v: return None
    if ',' in v and '.' in v: v = v.replace('.', '').replace(',', '.')
    elif ',' in v: v = v.replace(',', '.')
    try: return float(v)
    except ValueError: return None

def _extract_series(html: str) -> List[Dict]:
    text = _strip_html(html)
    rows = []
    regex = re.compile(r'(\d{2}[\/-]\d{2}[\/-]\d{4})[^0-9]{0,50}([0-9]+(?:[.,][0-9]+)?)(?:\s*€/?(?:kWh|MWh|Smc))?', re.IGNORECASE)
    for match in regex.finditer(text):
        date = _parse_date(match.group(1))
        value = _parse_number(match.group(2))
        if date and value is not None: rows.append({'date': date, 'value': value})
    if not rows:
        date_regex = re.compile(r'(\d{2}[\/-]\d{2}[\/-]\d{4})')
        for dm in date_regex.finditer(text):
            date = _parse_date(dm.group(1))
            if not date: continue
            slice_text = text[dm.end():dm.end()+120]
            vm = re.search(r'([0-9]+(?:[.,][0-9]+)?)(?:\s*€/?(?:kWh|MWh|Smc))?', slice_text, re.IGNORECASE)
            if vm:
                value = _parse_number(vm.group(1))
                if value is not None: rows.append({'date': date, 'value': value})
    rows.sort(key=lambda x: x['date'])
    return rows

def _filter_last_days(series: List[Dict], days: int) -> List[Dict]:
    cutoff = datetime.datetime.now() - timedelta(days=days)
    filtered = [r for r in series if r['date'] >= cutoff]
    return filtered if filtered else series

def _get_previous_month_info(date: datetime.datetime = None) -> Dict:
    if date is None: date = datetime.datetime.now()
    if date.month > 1: prev = datetime.datetime(date.year, date.month - 1, 1)
    else: prev = datetime.datetime(date.year - 1, 12, 1)
    return {'month_name': MONTHS_IT[prev.month - 1], 'year': prev.year}

def _extract_section(text: str, start_markers: List[str], end_markers: List[str]) -> str:
    lower = text.lower()
    start_idx = -1
    for marker in start_markers:
        idx = lower.find(marker.lower())
        if idx != -1 and (start_idx == -1 or idx < start_idx): start_idx = idx
    if start_idx == -1: return text
    end_idx = -1
    for marker in end_markers:
        idx = lower.find(marker.lower(), start_idx + 1)
        if idx != -1 and (end_idx == -1 or idx < end_idx): end_idx = idx
    if end_idx == -1: return text[start_idx:]
    return text[start_idx:end_idx]

def _extract_previous_month_value(html: str, kind: str) -> Optional[Dict]:
    text = _strip_html(html)
    info = _get_previous_month_info()
    label = f"{info['month_name'].capitalize()} {info['year']}"
    if kind == 'pun':
        section = _extract_section(text, ['i valori di pun monorario attuali'], ['il pun spiegato', 'storico pun'])
        regex = re.compile(r'PUN\s+([A-Za-zà]+)\s+(\d{4})(?:\s*\[[^\]]+\])?\s+([0-9.,]+)\s*€/?kWh', re.IGNORECASE)
        for match in regex.finditer(section):
            mn = match.group(1).lower()
            y = int(match.group(2))
            if mn == info['month_name'] and y == info['year']:
                value = _parse_number(match.group(3))
                if value is not None: return {'label': label, 'value': value}
        return None
    section = _extract_section(text, ['valori indice psv per mese e anno', 'valori indice psv'], ['indice psv', 'psv spiegato'])
    regex = re.compile(r'PSV\s+([A-Za-zà]+)\s+(\d{4})(?:\s*\[[^\]]+\])?\s+([0-9.,]+)(?:\s*\[[^\]]+\])?\s+([0-9.,]+)', re.IGNORECASE)
    for match in regex.finditer(section):
        mn = match.group(1).lower()
        y = int(match.group(2))
        if mn == info['month_name'] and y == info['year']:
            value = _parse_number(match.group(4))
            if value is not None: return {'label': label, 'value': value}
    table_section = _extract_section(html, ['Valori Indice PSV per Mese e Anno'], ['</table>'])
    row_regex = re.compile('<tr[^>]*>\s*<td[^>]*>\s*<strong>\s*PSV\s+([A-Za-zà]+)\s+(\d{4})[^<]*</strong>\s*</td>\s*<td[^>]*>\s*<strong>[^<]*</strong>\s*</td>\s*<td[^>]*>\s*<strong>\s*([0-9.,]+)[^<]*</strong>', re.IGNORECASE)
    for match in row_regex.finditer(table_section):
        mn = match.group(1).lower()
        y = int(match.group(2))
        if mn == info['month_name'] and y == info['year']:
            value = _parse_number(match.group(3))
            if value is not None: return {'label': label, 'value': value}
    row_regex_plain = re.compile('<tr[^>]*>\s*<td[^>]*>\s*PSV\s+([A-Za-zà]+)\s+(\d{4})[^<]*</td>\s*<td[^>]*>\s*[^<]*</td>\s*<td[^>]*>\s*([0-9.,]+)\s*</td>', re.IGNORECASE)
    for match in row_regex_plain.finditer(table_section):
        mn = match.group(1).lower()
        y = int(match.group(2))
        if mn == info['month_name'] and y == info['year']:
            value = _parse_number(match.group(3))
            if value is not None: return {'label': label, 'value': value}
    return None

async def _fetch_text(url: str) -> str:
    headers = {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.7',
    }
    resp = requests.get(url, headers=headers, timeout=15)
    resp.raise_for_status()
    return resp.text

async def _get_data(url: str, cache_key: str, scale_series: float, scale_prev: float, kind: str, force_refresh: bool = False) -> Dict:
    global _energy_cache
    cached = _energy_cache.get(cache_key)
    now_ts = int(datetime.datetime.now().timestamp())
    if not force_refresh and cached and (now_ts - cached.get('fetched_at', 0)) <= TTL_SECONDS:
        return {**cached, 'stale': False}
    try:
        html = await _fetch_text(url)
        raw = _extract_series(html)
        if not raw: raise ValueError('nessun dato trovato')
        series = _filter_last_days(raw, MAX_DAYS)
        series = [{'date': r['date'], 'value': r['value'] * scale_series} for r in series]
        latest = series[-1]['value'] if series else 0
        previous_month = _extract_previous_month_value(html, kind) if kind else None
        previous_scaled = None
        if previous_month: previous_scaled = {'label': previous_month['label'], 'value': previous_month['value'] * scale_prev}
        payload = {'fetched_at': now_ts, 'latest': latest, 'previous_month': previous_scaled, 'series': series}
        _energy_cache[cache_key] = payload
        return {**payload, 'stale': False}
    except Exception as e:
        logger.error(f"[Energy] Errore {cache_key}: {e}")
        if cached: return {**cached, 'stale': True}
        raise

async def get_pun_data(force_refresh: bool = False) -> Dict:
    return await _get_data(PUN_URL, 'pun', 1/1000, 1, 'pun', force_refresh)

async def get_psv_data(force_refresh: bool = False) -> Dict:
    return await _get_data(PSV_URL, 'psv', 1, 1, 'psv', force_refresh)

def calcola_convenienza_energia(pun_latest: float, psv_latest: float, opts: Optional[Dict] = None) -> Dict:
    if opts is None: opts = {}
    cop = opts.get('cop', 3.5)
    boiler_eff = opts.get('boilerEff', 0.90)
    tax_elec = opts.get('taxElec', 1.48)
    tax_gas = opts.get('taxGas', 1.38)
    kwh_per_smc = opts.get('kwhPerSmc', 10.7)
    prezzo_elec = pun_latest * tax_elec
    prezzo_gas_per_kwh = (psv_latest / kwh_per_smc) * tax_gas
    costo_elettrico_termico = prezzo_elec / cop
    costo_gas_termico = prezzo_gas_per_kwh / boiler_eff
    conviene_elettrico = costo_elettrico_termico < costo_gas_termico
    risparmio = abs(((costo_gas_termico - costo_elettrico_termico) / max(costo_gas_termico, costo_elettrico_termico)) * 100)
    return {
        'decisione': 'ELETTRICO' if conviene_elettrico else 'GAS',
        'pun': {'raw': round(pun_latest, 6), 'unit': 'EUR/kWh', 'prezzoFinale': round(prezzo_elec, 6)},
        'psv': {'raw': round(psv_latest, 4), 'unit': 'EUR/Smc', 'prezzoPerKwhTermico': round(prezzo_gas_per_kwh, 6), 'prezzoFinale': round(prezzo_gas_per_kwh, 6)},
        'costoTermico': {'elettrico': round(costo_elettrico_termico, 6), 'gas': round(costo_gas_termico, 6)},
        'risparmioStimato': {'percentuale': round(risparmio, 1), 'assolutoEurKwh': round(abs(costo_gas_termico - costo_elettrico_termico), 6)},
        'parametri': {'cop': cop, 'boilerEff': boiler_eff, 'taxElec': tax_elec, 'taxGas': tax_gas, 'kwhPerSmc': kwh_per_smc},
        'timestamp': datetime.datetime.utcnow().isoformat() + 'Z',
    }

async def aggiorna_prezzi(force_refresh: bool = False) -> Dict:
    pun, psv = await get_pun_data(force_refresh), await get_psv_data(force_refresh)
    _energy_cache['last_update'] = datetime.datetime.now().isoformat()
    return {'pun': pun, 'psv': psv, 'lastUpdate': _energy_cache['last_update']}

def get_energy_cache() -> Dict:
    return {'pun': _energy_cache.get('pun'), 'psv': _energy_cache.get('psv'), 'lastUpdate': _energy_cache.get('last_update')}

@app.get("/api/energy-prices")
@app.get("/v1/energy-prices")
async def energy_prices(refresh: bool = False):
    try:
        prices = await aggiorna_prezzi(refresh)
        return {
            'success': True,
            'pun': {'latest': prices['pun']['latest'], 'unit': 'EUR/kWh', 'source': 'abbassalebollette.it', 'stale': prices['pun'].get('stale', False), 'updated': prices['pun']['fetched_at']},
            'psv': {'latest': prices['psv']['latest'], 'unit': 'EUR/Smc', 'source': 'abbassalebollette.it', 'stale': prices['psv'].get('stale', False), 'updated': prices['psv']['fetched_at']},
        }
    except Exception as e:
        logger.error(f"[Energy] Endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/convenienza")
@app.get("/v1/convenienza")
async def convenienza(cop: float = 3.5, boilerEff: float = 0.90, taxElec: float = 1.48, taxGas: float = 1.38):
    try:
        cache = get_energy_cache()
        one_hour_ago = datetime.datetime.now() - timedelta(hours=1)
        last_update = datetime.datetime.fromisoformat(cache['lastUpdate']) if cache.get('lastUpdate') else None
        if not last_update or last_update < one_hour_ago:
            await aggiorna_prezzi()
            cache = get_energy_cache()
        result = calcola_convenienza_energia(cache['pun']['latest'], cache['psv']['latest'], {'cop': cop, 'boilerEff': boilerEff, 'taxElec': taxElec, 'taxGas': taxGas})
        return {'success': True, **result}
    except Exception as e:
        logger.error(f"[Convenienza] Endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
