import datetime
import logging
from typing import Dict, Optional, List
from fastapi import FastAPI, HTTPException, Security, status
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ==================== LOGGING ROYALTY ====================
logging.basicConfig(
    filename="ecohybrid_os_tools_royalty.log",
    level=logging.INFO,
    format="%(asctime)s | L633_1941 | %(message)s"
)
logger = logging.getLogger("ecohybrid")

app = FastAPI(
    title="EcoHybrid Core - OS&Tools Production Cloud",
    description="Architettura Scatola Nera - Algoritmi proprietari protetti ex L. 633/1941",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS — permette al frontend di chiamare le API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ecohybrid.netlify.app",
        "https://patriziopz.github.io",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8080"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MATRICE PREZZI ====================
API_KEYS_DB = {
    "EHY_CALEFFI_SANDBOX_7730": {"partner": "Caleffi S.p.A.", "rate": 0.50, "tier": "early_adopter"},
    "EHY_OWL_SANDBOX_4410": {"partner": "Owl Home", "rate": 0.60, "tier": "early_adopter"},
    "EHY_SIT_SANDBOX_9912": {"partner": "SIT S.p.A.", "rate": 0.80, "tier": "second_tier"},
    "EHY_OCTOPUS_KRAKEN_V4": {"partner": "Octopus Energy", "rate": 1.00, "tier": "utility"},
    "EHY_ENTERPRISE_STANDARD": {"partner": "Enterprise Global", "rate": 1.50, "tier": "enterprise"}
}

api_key_header = APIKeyHeader(name="X-EcoHybrid-Key", auto_error=False)

def get_partner(api_key: str = Security(api_key_header)):
    if not api_key:
        raise HTTPException(status_code=403, detail="API key mancante.")
    if api_key in API_KEYS_DB:
        return API_KEYS_DB[api_key]
    raise HTTPException(status_code=403, detail="Accesso negato ex L. 633/1941.")

# ==================== MODELLI ====================
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

# ==================== ALGORITMI ====================
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
    if system in ["pannelli", "caldaia"] or t_ext >= 12:
        return None
    return {"attivo": True, "fan_speed_pct": 35.0}

def calcola_anticipo(t_ext: float, forecast: Optional[float], stagione: str, system: str) -> Optional[Dict]:
    if system == "caldaia" or forecast is None:
        return None
    if stagione == "inverno" and forecast < 5.0:
        return {"attivo": True, "minuti": 50}
    if stagione == "estate" and forecast > 30.0:
        return {"attivo": True, "minuti": 45}
    return None

def calcola_occupancy(occupancy: bool, stagione: str, setpoint: float) -> Optional[Dict]:
    if occupancy:
        return None
    setback = 3.0
    new_sp = setpoint + setback if stagione == "estate" else setpoint - setback
    return {"attivo": True, "setpoint_comfort": setpoint, "setpoint_attuale": new_sp}

# ==================== ENDPOINT PRINCIPALE ====================
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
    if occ and occ["attivo"]:
        setpoint_finale = occ["setpoint_attuale"]

    fonte = switch["fonte"]
    if system == "caldaia":
        fonte = "GAS"
    elif system == "pannelli":
        fonte = "ELETTRICO"

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

    # LOGGING ROYALTY
    logger.info(
        f"PARTNER={partner['partner']} | RATE={partner['rate']} | "
        f"T_EXT={t_ext}C T_INT={t_int}C | PUN={pun} PSV={psv} | SYS={system} | "
        f"SETPOINT={setpoint_finale:.1f}C MODE={comfort['modalita']} SOURCE={fonte} | "
        f"SAVING={risparmio:.1f}% PILASTRI={','.join(pilastri)}"
    )

    return {
        "status": "success",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "license": "AS IS - Proprieta esclusiva Autore ex L. 633/1941",
        "actions": {
            "hvac_setpoint_c": round(setpoint_finale, 1),
            "hvac_mode": comfort["modalita"],
            "hvac_source": fonte,
            "fan_destratification_speed_pct": recircolo["fan_speed_pct"] if recircolo else 0.0,
            "passive_shading_position": "CLOSED" if t_ext > 26.0 else "OPEN",
            "anticipo_minuti": anticipo["minuti"] if anticipo else 30,
            "direct_to_grid": "ON" if payload.grid_demand_response_trigger else "OFF"
        },
        "estimated_saving_index_pct": round(risparmio, 1),
        "pilastri_attivi": pilastri
    }

# ==================== ENDPOINT UTILI ====================
@app.get("/")
async def root():
    return {
        "name": "EcoHybrid Core Engine",
        "version": "2.0.0",
        "status": "operational",
        "license": "Diritto d'Autore ex L. 633/1941",
        "docs": "/docs",
        "endpoints": ["/v1/optimize", "/health"]
    }

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.datetime.utcnow().isoformat() + "Z"}

@app.get("/v1/license")
async def license_info(partner: dict = Security(get_partner)):
    return {
        "partner": partner["partner"],
        "rate_eur_user_month": partner["rate"],
        "tier": partner["tier"],
        "license": "Diritto d'Autore ex L. 633/1941",
        "terms": "AS IS - Scatola Nera"
    }
