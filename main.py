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

class PriceUpdate(BaseModel):
    pun: Optional[float] = None
    psv: Optional[float] = None

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
# ENERGY PRICES - API GME Ufficiale (mercati-energetici) + fallback
# =============================================================================
from datetime import timedelta, date

# Fallback configurabili via env vars
PUN_FALLBACK = float(os.getenv("PUN_FALLBACK", "0.125"))  # EUR/kWh
PSV_FALLBACK = float(os.getenv("PSV_FALLBACK", "0.38"))   # EUR/Smc

_energy_cache = {
    'pun': {'latest': PUN_FALLBACK, 'fetched_at': 0, 'source': 'env_fallback'},
    'psv': {'latest': PSV_FALLBACK, 'fetched_at': 0, 'source': 'env_fallback'},
    'last_update': datetime.datetime.now().isoformat()
}

# Prova import libreria GME
try:
    from mercati_energetici import MGP, MGP_GAS
    GME_AVAILABLE = True
except ImportError:
    GME_AVAILABLE = False
    logger.warning("[Energy] Libreria 'mercati-energetici' non installata. Usare: pip install mercati-energetici")

async def _fetch_gme_prices() -> Dict:
    """Recupera PUN e PSV dalle API ufficiali GME."""
    global _energy_cache
    today = date.today()
    pun_val = None
    psv_val = None

    if not GME_AVAILABLE:
        return {'pun': None, 'psv': None, 'error': 'mercati-energetici non installato'}

    try:
        # PUN (Prezzo Unico Nazionale) - EUR/MWh
        async with MGP() as mgp:
            pun_data = await mgp.daily_pun(today)
            if pun_data and len(pun_data) > 0:
                # pun_data è lista di dict, prendo il prezzo medio
                pun_mwh = float(pun_data[0].get('prezzo', 0))
                pun_val = pun_mwh / 1000  # converti EUR/MWh → EUR/kWh
                logger.info(f"[Energy] GME PUN: {pun_val:.6f} EUR/kWh")
    except Exception as e:
        logger.warning(f"[Energy] GME PUN fallito: {e}")

    try:
        # PSV (Prezzo di Scambio Virtuale) - EUR/MWh
        async with MGP_GAS() as gas:
            psv_data = await gas.daily_psv(today)
            if psv_data and len(psv_data) > 0:
                psv_mwh = float(psv_data[0].get('prezzo', 0))
                # PSV GME è in EUR/MWh, convertiamo in EUR/Smc
                # 1 MWh = 1000 kWh, PCS gas ~ 10.7 kWh/Smc
                # EUR/MWh → EUR/kWh = /1000 → EUR/Smc = *10.7
                psv_val = (psv_mwh / 1000) * 10.7
                logger.info(f"[Energy] GME PSV: {psv_val:.4f} EUR/Smc")
    except Exception as e:
        logger.warning(f"[Energy] GME PSV fallito: {e}")

    return {'pun': pun_val, 'psv': psv_val}

async def aggiorna_prezzi(force_refresh: bool = False) -> Dict:
    global _energy_cache
    now = datetime.datetime.now()
    now_ts = int(now.timestamp())

    last_update = datetime.datetime.fromisoformat(_energy_cache['last_update']) if _energy_cache.get('last_update') else None
    needs_refresh = force_refresh or not last_update or (now - last_update) > timedelta(hours=1)

    if needs_refresh:
        # 1. Prova API GME ufficiale
        gme_data = await _fetch_gme_prices()

        if gme_data['pun'] is not None:
            _energy_cache['pun'] = {'latest': gme_data['pun'], 'fetched_at': now_ts, 'source': 'GME_API'}
        else:
            # Fallback env vars
            _energy_cache['pun'] = {'latest': PUN_FALLBACK, 'fetched_at': now_ts, 'source': 'env_fallback'}

        if gme_data['psv'] is not None:
            _energy_cache['psv'] = {'latest': gme_data['psv'], 'fetched_at': now_ts, 'source': 'GME_API'}
        else:
            _energy_cache['psv'] = {'latest': PSV_FALLBACK, 'fetched_at': now_ts, 'source': 'env_fallback'}

        _energy_cache['last_update'] = now.isoformat()
        logger.info(f"[Energy] Aggiornato: PUN={_energy_cache['pun']['latest']:.6f} ({_energy_cache['pun']['source']}), PSV={_energy_cache['psv']['latest']:.4f} ({_energy_cache['psv']['source']})")

    return {
        'pun': _energy_cache['pun'],
        'psv': _energy_cache['psv'],
        'lastUpdate': _energy_cache['last_update']
    }

def get_energy_cache() -> Dict:
    return _energy_cache

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

@app.get("/api/energy-prices")
@app.get("/v1/energy-prices")
async def energy_prices(refresh: bool = False):
    try:
        prices = await aggiorna_prezzi(refresh)
        return {
            'success': True,
            'pun': {
                'latest': prices['pun']['latest'],
                'unit': 'EUR/kWh',
                'source': prices['pun'].get('source', 'unknown'),
                'updated': prices['pun'].get('fetched_at'),
            },
            'psv': {
                'latest': prices['psv']['latest'],
                'unit': 'EUR/Smc',
                'source': prices['psv'].get('source', 'unknown'),
                'updated': prices['psv'].get('fetched_at'),
            },
        }
    except Exception as e:
        logger.error(f"[Energy] Endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/convenienza")
@app.get("/v1/convenienza")
async def convenienza(cop: float = 3.5, boilerEff: float = 0.90, taxElec: float = 1.48, taxGas: float = 1.38):
    try:
        cache = get_energy_cache()
        result = calcola_convenienza_energia(
            cache['pun']['latest'],
            cache['psv']['latest'],
            {'cop': cop, 'boilerEff': boilerEff, 'taxElec': taxElec, 'taxGas': taxGas}
        )
        return {'success': True, **result}
    except Exception as e:
        logger.error(f"[Convenienza] Endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/energy-prices/update")
@app.post("/v1/energy-prices/update")
async def update_prices(data: PriceUpdate):
    """Aggiorna manualmente i prezzi (override temporaneo)."""
    global _energy_cache
    now = datetime.datetime.now()
    if data.pun is not None:
        _energy_cache['pun'] = {'latest': data.pun, 'fetched_at': int(now.timestamp()), 'source': 'manual'}
    if data.psv is not None:
        _energy_cache['psv'] = {'latest': data.psv, 'fetched_at': int(now.timestamp()), 'source': 'manual'}
    _energy_cache['last_update'] = now.isoformat()
    return {
        'success': True,
        'pun': _energy_cache['pun']['latest'],
        'psv': _energy_cache['psv']['latest'],
        'source': 'manual',
        'updated': now.isoformat()
    }
