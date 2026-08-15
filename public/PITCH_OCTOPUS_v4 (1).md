# PITCH OCTOPUS ENERGY — EcoHybrid v4
## Proposta di partnership strategica
### Data: 15/08/2026 | Versione 4.0

---

## 1. COS'E' ECOHYBRID

EcoHybrid è un sistema di automazione termica domestica che calcola il **risparmio reale** confrontando COSA PAGAVI con le vecchie bollette e COSA PAGHEREI con i device intelligenti che già possiedi.

### Filosofia fondamentale: "Installa e dimentica"
- L'utente installa una volta e poi dimentica l'app
- Il sistema gestisce autonomamente il clima 24/7
- L'utente riapre l'app SOLO per:
  1. Caricare la bolletta del mese (prova del nove)
  2. Aggiungere o togliere un device
  3. Cambiare fornitore energia
  4. Cambiare modem/router
- **Niente suggerimenti da approvare. Niente azioni giornaliere. Solo automazione.**

### Principi tecnici
- Niente domande su mq o isolamento — le bollette già raccontano tutto
- Meteo in tempo reale da Open-Meteo (gratuito, no API key)
- Device presenti = leve di ottimizzazione (non acquisti consigliati)
- Algoritmo basato su standard scientifici: ASHRAE 55, modello adattivo de Dear & Brager

---

## 2. STRUTTURA APP (8 schermate)

| # | ID | Contenuto | Navigazione |
|---|---|---|---|
| 0 | screen-0 | Scegli percorso (HA vs Mini PC) | → wizard o bollette o compat |
| C | screen-compat-check | **Verifica compatibilità per APP** — 6 app certe → A, tutto il resto → B | ← Indietro |
| W | screen-wizard | Wizard 9-step Mini PC (progress bar) | Indietro/Avanti ogni step |
| 1 | screen-1a | Configura HA esistente (indirizzo + token + istruzioni) | ← Indietro, → Bollette |
| B | screen-bills-unified | Bollette luce + gas unificate (upload PDF + OCR + incolla) | ← Indietro, → Conferma |
| 3 | screen-3 | Dashboard — meteo + 7 pilastri + automazione attiva | ← Modifica bollette, → Risparmio |
| 4 | screen-4 | Il tuo Risparmio — storico bollette, cerchietti device, gestione | ← Dashboard, ← Modifica bollette |
| L | screen-lab | **Laboratorio Simulazione** — testa EH senza hardware | ← Indietro |

### Verifica compatibilità — approccio pragmatico

**Percorso A (nessun hardware aggiuntivo):**
| App ufficiale | Marca | Integrazione HA |
|---|---|---|
| SmartThings | Samsung | Ufficiale |
| Onecta | Daikin | Ufficiale |
| MelCloud | Mitsubishi | Ufficiale |
| ThinQ | LG | Ufficiale |
| Comfort Cloud | Panasonic | Ufficiale |
| Home AC | Toshiba | Ufficiale |

**Percorso B (Mini PC ~50 EUR + adattatore IR):**
- Qualsiasi altra app (Nethome Plus, Tuya generico, Smart Life, app cinesi)
- Solo telecomando IR
- Non so quale app uso

**Auto-update:** la lista si aggiorna automaticamente da `compat.json` sul repo GitHub. Aggiungere una nuova app compatibile richiede solo una modifica al JSON.

---

## 3. ALGORITMI INTEGRATI (7 PILASTRI)

### 1. Comfort Adattivo (ASHRAE 55) — Automatico
- Estate: setpoint = min(26°C, T_esterna - 2°C)
  - Umidità > 60% → Cool + Dry
  - Umidità < 60% → Cool
- Inverno: target 20.5°C (regolabile 19-22°C)
  - Setback notte: target - 3°C
- Soglia accensione: T_interna > 26°C

### 2. Switch Dinamico Gas / Elettrico — Automatico
- Confronta costo kWh termico:
  - Gas: PSV / 10 kWh termici per m³
  - Elettrico: (PUN × perdite rete) / COP
- COP pompa per temperatura esterna:
  - ≥15°C → 4.0 | ≥10°C → 3.5 | ≥5°C → 3.0 | ≥0°C → 2.5 | ≥-5°C → 2.0 | <-5°C → 1.5
- Fonte COP: valori medi conservativi da datasheet produttori (Midea, Daikin, Mitsubishi)

### 3. Recircolo Calore Invernale — Automatico
- Inverno: calore sale sotto soffitto (scarto 3-5°C alto/basso)
- Climatizzatore in modalità ventilazione (15-50W) muove aria calda verso il basso
- Risparmio stimato: 10-20% sui consumi invernali
- Fonte: AIVC (Air Infiltration and Ventilation Centre)

### 4. Schermatura Solare Passiva — Automatica
- Chiusura automatica tende e tapparelle motorizzate prima che il sole colpisca le stanze
- Blocca l'effetto serra a costo zero

### 5. Meteo Predittivo — Automatico
- API: Open-Meteo (gratuita, no key, https://open-meteo.com)
- Coordinate: navigator.geolocation (browser, GPS reale)
- Dati: temperatura, umidità, temperatura percepita, previsione oraria 48h

### 6. Gestione Assenza (Occupancy Detection + Geofencing) — Automatico
- Rileva quando la casa è vuota (geofencing smartphone o sensori presenza)
- Setback automatico: -3°C inverno, +3°C estate
- Preriscaldamento/preraffrescamento 30 min prima del rientro
- Risparmio stimato: 5-12% sui consumi HVAC
- Fonte: DOE (Department of Energy USA)

### 7. Anticipo Predittivo — Automatico (NUOVO v4)
- **L'utente non sente alcuna differenza termica.**
- Regola solo i minuti di anticipo dell'accensione per sfruttare:
  - Le tariffe basse (PUN orario, quando disponibile)
  - Le migliori condizioni di COP esterno
- Inverno: se tra 1-3 ore la temperatura crollerà sotto 5°C, anticipa l'accensione di 20 minuti a regime ridotto (soft start inverter)
- Estate: se tra 1-3 ore la temperatura salirà sopra 30°C, anticipa il raffrescamento di 15 minuti per mantenere 26°C costanti
- Fonte: algoritmo proprietario basato su previsioni orarie Open-Meteo

---

## 4. LABORATORIO SIMULAZIONE (NUOVO v4)

Pannello integrato nell'app per testare EcoHybrid **senza hardware**:

**Input regolabili:**
- Temperatura esterna, umidità, PUN, PSV gas
- Stagione (auto/estate/inverno)
- Occupancy (occupata/vuota)
- Previsione temperatura a 3 ore

**Output in tempo reale:**
- Setpoint target, modalità, COP, fonte consigliata
- Risparmio stimato % e pilastri attivi
- Spiegazione di ogni decisione algoritmica

**Utilità:**
- Demo agli investitori senza setup hardware
- Stress test con variabili estreme
- Formazione utente e supporto clienti
- Validazione algoritmi prima del rilascio

---

## 5. DATI DI MERCATO (fonte GME/Terna, 11/08/2026)

| Dato | Valore | Fonte |
|---|---|---|
| PUN elettricità F0 | 0.189 EUR/kWh | GME |
| PUN elettricità F3 | 0.152 EUR/kWh | GME |
| PSV gas | 0.664 EUR/m³ | GME |
| Perdite rete | 10% | Terna (coefficiente standard) |
| TTF gas | 53.87 EUR/MWh | Mercato all'ingrosso |

### Fattori risparmio (stima conservativa, per singolo pilastro)
- f_comfort = 0.92 (-8% estate, fonte: studi ASHRAE 55)
- f_switch = 0.90 (-10% quando COP > 3 e conviene elettrico)
- f_recircolo = 0.88 (-12% inverno, fonte: AIVC)
- f_schermatura = 0.95 (-5% estate, se presenti tende/tapparelle motorizzate)
- f_occupancy = 0.92 (-8% quando casa vuota, fonte: DOE)
- f_anticipo = 0.95 (-5% da soft start e tariffa ottimale)
- NOTA: i fattori NON si moltiplicano linearmente. Agiscono su fasce diverse.

---

## 6. OCR BOLLETTE

- Libreria: Tesseract.js v4 via CDN + PDF.js v3.11.174
- Lingua: italiano
- Formati: JPG, PNG, PDF (estrazione testo nativa + OCR fallback)
- Parser dedicato per bollette Octopus Energy (periodo, consumo, PUN, spread, totale)
- Accuratezza: 60-80% su layout standard, fallback manuale sempre disponibile

### Problema noto
- Edge Tracking Prevention blocca Tesseract.js
- Soluzione: usare Chrome o disattivare Tracking Prevention per il sito

---

## 7. MODELLO DI BUSINESS

| Flusso | Descrizione |
|---|---|
| 1. Licenza B2B | White-label per utility, PMS alberghieri, software retail. 0.50-2 EUR/utente/mese |
| 2. Hardware | Octopus Home Hub: costo 80 EUR, vendita 129 EUR, margine 49 EUR |
| 3. EcoHybrid Business Hub | Per alberghi/centri commerciali: 299-499 EUR, margine 120-320 EUR |
| 4. Commissioni switch | Link referral fornitori energy (30-80 EUR/contratto), solo via broker autorizzati |
| 5. Consulenza business | Audit + setup per alberghi/supermercati: 500-2.000 EUR + 150-500 EUR/mese |
| 6. Premium (futuro) | Report mensile + alert push: 2.99 EUR/mese. Base SEMPRE gratuita |

### Posizione del founder
- Docente con competenze in ingegneria e ottimizzazione
- App gratuita e open-source = principio non negoziabile
- Trasparenza totale: nessuna vendita dati, nessun dark pattern
- EcoHybrid NON promette cifre in EUR. Ogni utente verifica il risparmio reale confrontando bolletta per bolletta.

---

## 8. PROPOSTA PER OCTOPUS ENERGY

### Perché EcoHybrid + Octopus ha senso

1. **Octopus ha i dati PUN orario** — l'unico pezzo che manca a EcoHybrid per l'ottimizzazione tariffaria completa
2. **Octopus ha la piattaforma Agile** — prezzo cambia ogni 30 minuti, EH può anticipare/rinviare l'accensione per sfruttare i minimi
3. **EcoHybrid ha gli algoritmi** — Octopus ha i dati, EH ha la logica di comfort e risparmio
4. **Sinergia hardware** — Octopus Home Hub + EcoHybrid = unico ecosistema ottimizzato

### 5 proposte commerciali

1. **Integrazione API Octopus → EH** — PUN orario in tempo reale per anticipo predittivo tariffario
2. **White-label per clienti Octopus** — EH con branding Octopus, incluso nel contratto energy
3. **Bundle Octopus Home Hub + EH** — vendita congiunta con setup guidato
4. **Programma referral incrociato** — clienti Octopus → sconto EH Premium, clienti EH → bonus switch Octopus
5. **Pilot in UK/IT** — test su 1.000 utenti con report congiunto di risparmio

---

## 9. LINK UTILI

- Repo GitHub: https://github.com/PatrizioPZ/ecohybrid
- Sito live: https://patriziopz.github.io/ecohybrid
- Open-Meteo API: https://open-meteo.com
- Home Assistant: https://www.home-assistant.io
- ASHRAE 55: https://www.ashrae.org/technical-resources/bookstore/standard-55

---

## 10. NOTE IMPORTANTI

- NIENTE dati inventati. Ogni numero ha fonte.
- NIENTE mock. OCR reale, meteo reale, GPS reale.
- NIENTE approssimazioni a caso. Formule documentate.
- App gratuita per consumer. Revenue solo su servizi a valore aggiunto.
- Posizione docente = vincolo etico, non scappatoia.
- Filosofia "Installa e dimentica": l'utente non deve pensare. Il sistema decide e applica.
- NIENTE emoji nel codice. Solo testo ASCII.

---

# FINE PITCH
# Ultima modifica: 15/08/2026 11:55
