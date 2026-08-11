#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECOHYBRID - MOTORE DI CALCOLO RISPARMIO ENERGETICO v1.0
============================================================
Dati reali estratti da bollette Octopus Energy
Calcoli verificabili al centesimo

ISTRUZIONI:
1. Modifica GAS_BOLLETTA e LUCE_BOLLETTA con i tuoi dati
2. Modifica PARAMETRI con i dati del tuo immobile/impianto
3. Esegui: python ecohybrid_motore.py
4. Il risultato viene salvato in ecohybrid_risultato.json
"""

import json

# ============================================================
# SEZIONE 1: DATI BOLLETTE (modificare con i propri)
# ============================================================

GAS_BOLLETTA = {
    "periodo_giorni": 30,
    "consumo_smc": 5,
    "totale_euro": 19.17,
    "storico_mensile_smc": {"2026-03": 106, "2026-04": 14, "2026-05": 19, "2026-06": 5},
    # Componenti variabili (EUR/Smc, imponibili, IVA 10%)
    "materia": 0.345000, "pcs": 0.005421, "qtv": 0.107315,
    "qtt_snam": 0.074395, "rs": 0.002788, "ug1": 0.034837,
    "re": 0.029417, "ug2_var": 0.049600, "ug3ft": 0.006881,
    "ug3int": 0.000387, "ug3ui": 0.000024,
    "addizionale_regionale": 0.025800, "imposta_erariale": 0.175000,
    "iva_variabili": 0.10,
    # Componenti fissi (EUR/anno, da proratare su giorni fatturati, IVA 22%)
    "commercializzazione_mese": 7.00, "cot_anno": 2.01,
    "dis_anno": 49.52, "mis_anno": 29.23, "st_anno": -0.23,
    "vr_anno": 0.07, "ug2_fissa_anno": -21.63,
    "iva_fissi": 0.22, "giorni_anno": 365
}

LUCE_BOLLETTA = {
    "periodo_giorni": 31, "consumo_kwh": 157,
    "consumo_f1": 63, "consumo_f2": 48, "consumo_f3": 46,
    "perdite_f1": 6, "perdite_f2": 5, "perdite_f3": 5,
    "potenza_kw": 3.00, "totale_energia_euro": 61.96,
    "storico_mensile_kwh": {"2026-03": 92, "2026-04": 71, "2026-05": 76, "2026-06": 120, "2026-07": 157},
    "prezzo_f1": 0.162201, "prezzo_f2": 0.177384, "prezzo_f3": 0.160256,
    "cdispd": 0.038464, "trasporto_en": 0.011900, "uc3": 0.002760,
    "uc6_var": 0.000070, "arim": 0.001638, "asos": 0.031515,
    "iva_luce": 0.10,
    "commercializzazione": 6.00, "trasporto_fissa": 1.92,
    "trasporto_potenza_unit": 1.96, "uc6_fissa_unit": 0.016567
}

# ============================================================
# SEZIONE 2: PARAMETRI IMPIANTO (modificare con i propri)
# ============================================================

PARAMETRI = {
    "superficie_mq": 100,
    "zona_climatica": "E",
    "rendimento_caldaia": 0.90,      # 90% condensazione
    "cop_pompa_calore": 3.5,           # COP media annua
    "split_gas_elettrico": 0.40,       # 40% gas, 60% pompa in scenario ibrido
    "potere_calorifico_gas": 10.7,     # kWh/Smc

    # Ottimizzazioni EcoHybrid
    "ore_assenza_giorno": 8,
    "ore_notte_giorno": 8,
    "temp_comfort": 20,
    "temp_notte": 18,
    "temp_assenza": 16,
    "riduzione_tapparelle_pct": 0.03,   # -3% dispersione
    "riduzione_programmazione_pct": 0.07, # -7% sprechi

    # Profili mensili (% annuo) zona climatica E
    "profilo_gas_mensile": {
        1: 0.18, 2: 0.16, 3: 0.14, 4: 0.10, 5: 0.07, 6: 0.04,
        7: 0.03, 8: 0.03, 9: 0.05, 10: 0.09, 11: 0.12, 12: 0.13
    },
    "profilo_luce_mensile": {
        1: 0.10, 2: 0.09, 3: 0.09, 4: 0.08, 5: 0.08, 6: 0.09,
        7: 0.10, 8: 0.10, 9: 0.08, 10: 0.08, 11: 0.09, 12: 0.10
    }
}

# ============================================================
# SEZIONE 3: FUNZIONI DI CALCOLO
# ============================================================

def estrai_costi_gas(bolletta):
    """Estrae costo fisso mensile e variabile per Smc dalla bolletta gas."""
    variabili = (
        bolletta["materia"] + bolletta["pcs"] + bolletta["qtv"] + bolletta["qtt_snam"] +
        bolletta["rs"] + bolletta["ug1"] + bolletta["re"] + bolletta["ug2_var"] +
        bolletta["ug3ft"] + bolletta["ug3int"] + bolletta["ug3ui"] +
        bolletta["addizionale_regionale"] + bolletta["imposta_erariale"]
    )
    costo_variabile = variabili * (1 + bolletta["iva_variabili"])

    giorni = bolletta["periodo_giorni"]
    fissi = (
        bolletta["commercializzazione_mese"] +
        bolletta["cot_anno"] * giorni / bolletta["giorni_anno"] +
        bolletta["dis_anno"] * giorni / bolletta["giorni_anno"] +
        bolletta["mis_anno"] * giorni / bolletta["giorni_anno"] +
        bolletta["st_anno"] * giorni / bolletta["giorni_anno"] +
        bolletta["vr_anno"] * giorni / bolletta["giorni_anno"] +
        bolletta["ug2_fissa_anno"] * giorni / bolletta["giorni_anno"]
    )
    costo_fisso = fissi * (1 + bolletta["iva_fissi"])
    return costo_fisso, costo_variabile

def estrai_costi_luce(bolletta):
    """Estrae costo fisso mensile e variabile per fascia dalla bolletta luce."""
    kwh_totali = bolletta["consumo_kwh"]
    kwh_perdite = bolletta["perdite_f1"] + bolletta["perdite_f2"] + bolletta["perdite_f3"]
    rapporto_perdite = kwh_perdite / kwh_totali

    potenza = bolletta["potenza_kw"]
    fissi = (
        bolletta["commercializzazione"] + bolletta["trasporto_fissa"] +
        bolletta["trasporto_potenza_unit"] * potenza +
        bolletta["uc6_fissa_unit"] * potenza
    )
    costo_fisso = fissi * (1 + bolletta["iva_luce"])

    costi_uniformi = (
        bolletta["cdispd"] + bolletta["trasporto_en"] + bolletta["uc3"] +
        bolletta["uc6_var"] + bolletta["arim"] + bolletta["asos"]
    )
    # Imposta proporzionale (0.16 EUR su 157 kWh)
    costi_uniformi += 0.16 / kwh_totali

    def costo_fascia(prezzo):
        return (prezzo * (1 + rapporto_perdite) + costi_uniformi) * (1 + bolletta["iva_luce"])

    return {
        "fisso_mese": costo_fisso,
        "f1": costo_fascia(bolletta["prezzo_f1"]),
        "f2": costo_fascia(bolletta["prezzo_f2"]),
        "f3": costo_fascia(bolletta["prezzo_f3"]),
        "rapporto_perdite": rapporto_perdite
    }

def stima_consumo_gas_annuo(storico, profilo):
    """Stima consumo annuo gas usando solo mesi invernali (profilo >= 10%)."""
    stime = []
    for mese_str, consumo in storico.items():
        mese = int(mese_str.split("-")[1])
        if profilo[mese] >= 0.10:
            stime.append(consumo / profilo[mese])
    if not stime:
        return 0
    return round(sum(stime) / len(stime))

def stima_consumo_luce_annuo(storico, profilo):
    """Stima consumo annuo luce come media delle stime mensili."""
    stime = []
    for mese_str, consumo in storico.items():
        mese = int(mese_str.split("-")[1])
        if profilo[mese] > 0:
            stime.append(consumo / profilo[mese])
    return round(sum(stime) / len(stime)) if stime else 0

def calcola_risparmio_termico(parametri):
    """Calcola fattore di riduzione consumo termico con EcoHybrid."""
    ore_giorno = 24
    ore_assenza = parametri["ore_assenza_giorno"]
    ore_notte = parametri["ore_notte_giorno"]
    ore_presenza = max(0, ore_giorno - ore_assenza - ore_notte)

    temp_comfort = parametri["temp_comfort"]
    temp_notte = parametri["temp_notte"]
    temp_assenza = parametri["temp_assenza"]

    temp_media_lav = (
        ore_assenza * temp_assenza + ore_notte * temp_notte + ore_presenza * temp_comfort
    ) / ore_giorno

    temp_media_we = (
        ore_notte * temp_notte + (ore_giorno - ore_notte) * temp_comfort
    ) / ore_giorno

    temp_media = (5 * temp_media_lav + 2 * temp_media_we) / 7
    riduzione_gg = (temp_comfort - temp_media) / temp_comfort

    fattore = 1 - (1 - riduzione_gg) * (1 - parametri["riduzione_tapparelle_pct"]) * (1 - parametri["riduzione_programmazione_pct"])

    return {
        "temp_media_effettiva": round(temp_media, 2),
        "riduzione_gg_pct": round(riduzione_gg * 100, 1),
        "fattore_risparmio_totale": round(fattore, 4)
    }

def calcola_scenario_base(gas_fisso, gas_var, luce_fisso, luce_fasce, gas_annuo, luce_annuo):
    """Costo annuo con comportamento attuale (caldaia gas tradizionale)."""
    f1, f2, f3 = 0.35, 0.30, 0.35  # distribuzione fascia tipica
    costo_gas = gas_fisso * 12 + gas_annuo * gas_var
    costo_luce = (
        luce_fisso * 12 +
        luce_annuo * f1 * luce_fasce["f1"] +
        luce_annuo * f2 * luce_fasce["f2"] +
        luce_annuo * f3 * luce_fasce["f3"]
    )
    return {
        "gas_smc": gas_annuo, "gas_euro": round(costo_gas, 2),
        "luce_kwh": luce_annuo, "luce_euro": round(costo_luce, 2),
        "totale_euro": round(costo_gas + costo_luce, 2)
    }

def calcola_scenario_ecohybrid(gas_fisso, gas_var, luce_fisso, luce_fasce,
                               gas_annuo, luce_annuo, parametri, risparmio):
    """Costo annuo con EcoHybrid (ottimizzazione + ibrido pompa/caldaia)."""
    f_risparmio = risparmio["fattore_risparmio_totale"]
    split_pompa = parametri["split_gas_elettrico"]
    split_gas = 1 - split_pompa
    pci = parametri["potere_calorifico_gas"]
    rend = parametri["rendimento_caldaia"]
    cop = parametri["cop_pompa_calore"]

    # Gas ridotto (solo parte gas del riscaldamento, ottimizzata)
    gas_eco = gas_annuo * (1 - f_risparmio) * split_gas
    costo_gas = gas_fisso * 12 + gas_eco * gas_var

    # Pompa di calore: energia termica = gas sostituito * PCI * rendimento
    energia_termica = gas_annuo * split_pompa * pci * rend
    energia_elettrica = energia_termica / cop

    # Pompa lavora 60% notte (F3), 30% pomeriggio (F2), 10% mattina (F1)
    costo_pompa = (
        energia_elettrica * 0.60 * luce_fasce["f3"] +
        energia_elettrica * 0.30 * luce_fasce["f2"] +
        energia_elettrica * 0.10 * luce_fasce["f1"]
    )

    # Luce base (elettrodomestici, luci)
    f1, f2, f3 = 0.35, 0.30, 0.35
    costo_luce = (
        luce_fisso * 12 +
        luce_annuo * f1 * luce_fasce["f1"] +
        luce_annuo * f2 * luce_fasce["f2"] +
        luce_annuo * f3 * luce_fasce["f3"]
    )

    totale = costo_gas + costo_luce + costo_pompa
    return {
        "gas_smc": round(gas_eco, 1), "gas_euro": round(costo_gas, 2),
        "luce_kwh": luce_annuo, "luce_euro": round(costo_luce, 2),
        "pompa_kwh": round(energia_elettrica, 1), "pompa_euro": round(costo_pompa, 2),
        "totale_euro": round(totale, 2)
    }

# ============================================================
# SEZIONE 4: ESECUZIONE
# ============================================================

if __name__ == "__main__":
    # Estrazione costi reali
    gas_fisso, gas_var = estrai_costi_gas(GAS_BOLLETTA)
    luce_fasce = estrai_costi_luce(LUCE_BOLLETTA)

    # Stima consumi da storico
    gas_annuo = stima_consumo_gas_annuo(GAS_BOLLETTA["storico_mensile_smc"], PARAMETRI["profilo_gas_mensile"])
    luce_annuo = stima_consumo_luce_annuo(LUCE_BOLLETTA["storico_mensile_kwh"], PARAMETRI["profilo_luce_mensile"])

    # Modello termico
    risparmio = calcola_risparmio_termico(PARAMETRI)

    # Calcolo scenari
    base = calcola_scenario_base(gas_fisso, gas_var, luce_fasce["fisso_mese"], luce_fasce, gas_annuo, luce_annuo)
    eco = calcola_scenario_ecohybrid(gas_fisso, gas_var, luce_fasce["fisso_mese"], luce_fasce,
                                     gas_annuo, luce_annuo, PARAMETRI, risparmio)

    risparmio_abs = base["totale_euro"] - eco["totale_euro"]
    risparmio_pct = risparmio_abs / base["totale_euro"] * 100

    # Verifica convenienza pompa
    kwh_utili_per_smc = PARAMETRI["potere_calorifico_gas"] * PARAMETRI["rendimento_caldaia"]
    costo_gas_kwh = gas_var / kwh_utili_per_smc
    costo_pompa_kwh = ((0.60 * luce_fasce["f3"] + 0.30 * luce_fasce["f2"] + 0.10 * luce_fasce["f1"])) / PARAMETRI["cop_pompa_calore"]

    print("=" * 60)
    print("ECOHYBRID - RISULTATI CALCOLO")
    print("=" * 60)
    print(f"\nCosti unitari reali estratti dalle bollette:")
    print(f"  Gas fisso/mese:     {gas_fisso:.4f} EUR")
    print(f"  Gas variabile/Smc:  {gas_var:.4f} EUR")
    print(f"  Luce fisso/mese:    {luce_fasce['fisso_mese']:.4f} EUR")
    print(f"  Luce F1: {luce_fasce['f1']:.4f} | F2: {luce_fasce['f2']:.4f} | F3: {luce_fasce['f3']:.4f} EUR/kWh")
    print(f"\nConsumi annuali stimati da storico:")
    print(f"  Gas:  {gas_annuo} Smc/anno")
    print(f"  Luce: {luce_annuo} kWh/anno")
    print(f"\nModello termico EcoHybrid:")
    print(f"  Temp. media effettiva: {risparmio['temp_media_effettiva']}C")
    print(f"  Riduzione gradi-giorno: {risparmio['riduzione_gg_pct']}%")
    print(f"  Risparmio termico totale: {risparmio['fattore_risparmio_totale']*100:.1f}%")
    print(f"\n--- SCENARIO BASE ---")
    print(f"  Gas:   {base['gas_euro']} EUR  ({base['gas_smc']} Smc)")
    print(f"  Luce:  {base['luce_euro']} EUR  ({base['luce_kwh']} kWh)")
    print(f"  TOTALE: {base['totale_euro']} EUR")
    print(f"\n--- SCENARIO ECOHYBRID ---")
    print(f"  Gas:   {eco['gas_euro']} EUR  ({eco['gas_smc']} Smc)")
    print(f"  Luce:  {eco['luce_euro']} EUR  ({eco['luce_kwh']} kWh)")
    print(f"  Pompa: {eco['pompa_euro']} EUR  ({eco['pompa_kwh']} kWh)")
    print(f"  TOTALE: {eco['totale_euro']} EUR")
    print(f"\n--- RISPARMIO ---")
    print(f"  {risparmio_abs:.2f} EUR/anno ({risparmio_pct:.1f}%)")
    print(f"\n--- CONVENIENZA POMPA ---")
    print(f"  Costo gas per kWh utile:   {costo_gas_kwh:.4f} EUR/kWh")
    print(f"  Costo pompa per kWh utile: {costo_pompa_kwh:.4f} EUR/kWh")
    print(f"  Convenienza: {'SI' if costo_pompa_kwh < costo_gas_kwh else 'NO'} ({abs(1-costo_pompa_kwh/costo_gas_kwh)*100:.1f}%)")

    # Output JSON
    risultato = {
        "costi_unitari": {
            "gas_fisso_mese": round(gas_fisso, 4),
            "gas_variabile_smc": round(gas_var, 4),
            "luce_fisso_mese": round(luce_fasce["fisso_mese"], 4),
            "luce_f1": round(luce_fasce["f1"], 4),
            "luce_f2": round(luce_fasce["f2"], 4),
            "luce_f3": round(luce_fasce["f3"], 4)
        },
        "consumi_stimati": {"gas_annuo_smc": gas_annuo, "luce_annuo_kwh": luce_annuo},
        "modello_termico": risparmio,
        "scenario_base": base,
        "scenario_ecohybrid": eco,
        "risparmio": {"euro_anno": round(risparmio_abs, 2), "percentuale": round(risparmio_pct, 1)},
        "convenienza_pompa": {
            "costo_gas_kwh_utile": round(costo_gas_kwh, 4),
            "costo_pompa_kwh_utile": round(costo_pompa_kwh, 4),
            "conveniente": costo_pompa_kwh < costo_gas_kwh
        }
    }

    with open("ecohybrid_risultato.json", "w", encoding="utf-8") as f:
        json.dump(risultato, f, indent=2, ensure_ascii=False)
    print("\nSalvato: ecohybrid_risultato.json")
