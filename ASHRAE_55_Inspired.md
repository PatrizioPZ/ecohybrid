# EcoHybrid - Comfort Termico
# Metodologia: ASHRAE 55 Inspired (v2.5)

## Disclaimer

EcoHybrid utilizza un **algoritmo semplificato ispirato ai principi ASHRAE 55** (Standard Americano per la Qualita Ambientale Termica Interna).

**NON e' una certificazione ASHRAE 55 ufficiale.** Il calcolo completo PMV (Predicted Mean Vote) richiede 6 parametri misurati con strumentazione professionale:
- Temperatura dell'aria
- Temperatura radiante media
- Velocita dell'aria
- Umidita relativa
- Metabolismo (attivita fisica)
- Isolamento termico dell'abbigliamento

## Cosa fa EcoHybrid (v2.5)

L'algoritmo attuale considera:
1. **Temperatura interna** (da sensori HA)
2. **Umidita relativa interna** (da sensori HA)
3. **Temperatura esterna** (da weather.casa HA)
4. **Umidita esterna** (da weather.casa HA)
5. **Stagione** (estate/inverno automatica)

## Zona di Comfort Semplificata

| Stagione | Temp. Comfort | Umidita Comfort |
|----------|---------------|-----------------|
| Estate   | 23-26C        | 30-60%          |
| Inverno  | 20-23C        | 30-60%          |

## Gestione Umidita

- **Umidita assoluta** interna vs esterna calcolata
- Se umidita esterna &lt; interna e RH interna &gt; 65% → suggerisce **areazione**
- Se umidita esterna &gt; interna e RH interna &gt; 65% → suggerisce **deumidifica**
- Altrimenti → **mantieni**

## Roadmap Certificazione

- **v2.x**: Algoritmo semplificato (attuale)
- **v3.0**: Calcolo PMV completo con ingegnere termotecnico
- **v3.5**: Certificazione documentata per installatori

## Riferimenti

- ASHRAE Standard 55-2023: Thermal Environmental Conditions for Human Occupancy
- ISO 7730:2005: Ergonomics of the thermal environment
