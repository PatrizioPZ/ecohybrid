# EcoHybrid — Proposte Commerciali per Octopus Energy

## Visione

EcoHybrid non è un'app che devi controllare ogni giorno. È un **sistema di automazione termica** che installi una volta e poi dimentichi.

Una volta configurato, EcoHybrid gestisce autonomamente il clima della tua casa 24 ore su 24, 7 giorni su 7. Non devi più pensare ad accendere, spegnere, alzare o abbassare la temperatura. L'algoritmo decide e applica in tempo reale.

**L'utente riapre l'app solo per 4 motivi:**
1. Caricare la bolletta del mese (per verificare il risparmio reale)
2. Aggiungere o togliere un climatizzatore o device
3. Cambiare fornitore energia
4. Cambiare modem/router di casa

Tutto il resto è automatico.

L'algoritmo si basa sullo standard **ASHRAE 55** e sul **modello adattivo di de Dear & Brager**: il comfort non è una temperatura fissa, ma una funzione dinamica di temperatura esterna, umidità, abitudini personali e stagione.

---

## Stato attuale — Cosa è già implementato

L'app EcoHybrid è già funzionante e include:

| Feature | Stato |
|---|---|
| **Setup one-time** (wizard 9-step o connessione HA esistente) | Completato |
| **Automazione 24/7** — nessuna interazione richiesta | Completato |
| **Caricamento bollette** via PDF (parser Octopus-specifico) + incolla testo | Completato |
| **OCR** per bollette scannerizzate (Tesseract.js) | Completato |
| **Dashboard meteo** con GPS live (Open-Meteo) | Completato |
| **Algoritmo comfort adattivo** (ASHRAE 55) — applicato automaticamente | Completato |
| **Switch dinamico gas/elettrico** con COP variabile — applicato automaticamente | Completato |
| **Storico bollette** — confronto mese per mese vs baseline | Completato |
| **Cerchietti device** — temperatura esterna, interna, target per ogni clima | Completato |
| **Calcolo risparmio** con range min-max (non cifra fissa) | Completato |
| **Dati mercato** aggiornati da GME/Terna | Completato |

**Tecnologia:** Single-page app HTML/CSS/JS, zero framework, zero server backend. Tutto gira nel browser dell'utente. Dati in localStorage. API: Open-Meteo (gratuita), Tesseract.js (OCR), pdf.js (lettura PDF).

**Installazione:** PWA (Progressive Web App). L'utente la installa sul telefono come un'app nativa, poi la dimentica. Le notifiche push arrivano solo per: bolletta da caricare, anomalia rilevata, risparmio mensile confermato.

---

## I 5 Pilastri Tecnologici — Tutti Automatici

### 1. Comfort Adattivo (ASHRAE 55) — Automatico
Estate: il setpoint non è fisso. Segue la regola `T_esterna - 2°C` (max 26°C). Se l'umidità supera il 60%, attiva Cool+Dry per deumidificare senza abbassare eccessivamente la temperatura.
Inverno: target 20.5°C (regolabile 19-22°C), setback notturno automatico -3°C.

**L'utente non deve fare nulla.** Il sistema regola da solo.

### 2. Switch Dinamico Gas / Elettrico — Automatico
L'algoritmo calcola in tempo reale quale fonte conviene per produrre 1 kWh termico, confrontando:
- Costo gas: `PSV / 10` kWh termici per m³
- Costo elettrico via pompa di calore: `(PUN × perdite rete) / COP`

Il COP della pompa cambia con la temperatura esterna: da 4.0 (15°C) a 1.5 (-10°C). Il sistema switcha automaticamente sulla fonte più economica.

**L'utente non deve fare nulla.** Il sistema decide e commuta da solo.

### 3. Recircolo Calore Invernale (FAN Destratificazione) — Automatico
In inverno il calore si accumula sotto il soffitto (scarto 3-5°C tra alto e basso). Un climatizzatore in modalita ventilazione (15-50W) muove l'aria calda verso il basso. Il termostato rileva temperatura più alta e riduce il carico della caldaia.

**L'utente non deve fare nulla.** Il sistema attiva la ventilazione da solo quando serve.

### 4. Schermatura Solare Passiva — Automatica
Chiusura automatica tende e tapparelle motorizzate prima che il sole colpisca le stanze (es. Ovest alle 17:00). Blocca l'effetto serra a costo zero.

**L'utente non deve fare nulla.** Il sistema chiude le tapparelle da solo.

### 5. Meteo Predittivo — Automatico
Integrazione API Open-Meteo (gratuita, no key) per previsioni 48h. Il sistema anticipa i cambiamenti climatici e regola il clima prima che arrivino.

**L'utente non deve fare nulla.** Il sistema legge il meteo da solo.

### 6. Gestione Assenza (Occupancy Detection + Geofencing) — Automatico
Il sistema rileva quando la casa è vuota (via geofencing dello smartphone o sensori di presenza) e applica automaticamente un **setback termico**:

- **Inverno:** abbassa il setpoint di 3°C quando non c'è nessuno
- **Estate:** alza il setpoint di 3°C quando non c'è nessuno
- **Preriscaldamento/preraffrescamento:** riporta la temperatura al comfort 30 minuti prima del rientro

**Dati sul risparmio da setback — Fonti verificabili:**

| Fonte | Setback | Risparmio HVAC |
|---|---|---|
| DOE (Department of Energy USA) | 3-10°F (1.7-5.6°C) | **5-12%** |
| DOE (Department of Energy USA) | 10-20°F (5.6-11°C) | **9-18%** |
| Pang et al., EnergyPlus (16.000 simulazioni USA) | 4°C | **10-30%** annuo |
| Kim et al., Applied Energy (side-by-side reale) | occupancy-based | **17-24%** settimanale medio |

Fonte: DOE Energy Saving Fact Sheet; Pang et al. "Whole building performance simulation" (EnergyPlus); Kim et al. "HVAC energy savings, thermal comfort and air quality" (Applied Energy, 2022).

**EcoHybrid applica un setback conservativo di 3°C** (non aggressivo) per bilanciare risparmio e comfort. Il risparmio stimato da questo solo pilastro si colloca tra il **5% e il 12%** sui consumi HVAC, con picchi fino al 15% nelle stagioni intermedie quando l'assenza è più frequente.

**L'utente non deve fare nulla.** Il sistema rileva la presenza e applica il setback da solo.

---

## Chiarezza su Tuya

"Certificato Tuya" non esiste. Tuya è una piattaforma IoT, non un ente certificatore. I produttori (Midea, Hisense, TCL, centinaia di brand) integrano il chip Tuya e usano l'app Smart Life.

**Cosa funziona:**
- Climatizzatore con WiFi + app Smart Life → controllabile via API Tuya Cloud
- Climatizzatore vecchio + controller IR universale Tuya (10-20 EUR) → diventa smart
- Samsung WindFree → usa SmartThings, non Tuya

---

## Proposta 1: EcoHybrid per Google Home — Il cervello termico di Google Nest

### Il contesto

Google ha aperto le **Home APIs** in public developer beta (gennaio 2025). Oggi qualsiasi sviluppatore può:
- Accedere a **600 milioni di device** connessi a Google Home
- Creare automazioni custom via **Automation API** con AI-driven capabilities
- Controllare device Nest, Matter e cloud-connected da un'unica interfaccia
- Partner già attivi: Eve, Nanoleaf, LG, Aqara, Tuya, Yale

Fonte: Google Developers Blog, "Build the future of home with Google Home APIs" (gennaio 2025).

### Cosa manca a Google Home

Google ha l'hardware (Nest, Android, Chromecast, TV) e l'infrastruttura (cloud, AI, Assistant). Ma **non ha un algoritmo scientifico di ottimizzazione termica**:
- Nest Thermostat ha programmazione statica, non adattiva al meteo
- Nessun switch dinamico gas/elettrico basato su COP reale
- Nessun calcolo di comfort adattivo ASHRAE 55
- Nessuna gestione assenza con setback intelligente

### La proposta

Integrare EcoHybrid come **motore di ottimizzazione termica nativo** in Google Home / Nest:

| Livello | Integrazione |
|---|---|
| **Device Layer** | Legge dati da Nest Thermostat, Nest Temperature Sensor, climatizzatori connessi a Google Home |
| **Algorithm Layer** | Applica ASHRAE 55, switch dinamico, recircolo, schermatura, occupancy detection |
| **Action Layer** | Invia comandi ottimizzati ai device via Google Home APIs |
| **User Layer** | Notifiche push silenziose: bolletta da caricare, anomalia, risparmio mensile |

**L'utente Google Home non scarica un'app nuova.** Attiva "EcoHybrid optimization" nelle impostazioni Nest e dimentica.

### Vantaggio per Google
- **Differenziazione vs Amazon Alexa Home** — Alexa non ha ottimizzazione termica predittiva
- **Upselling Google One / Nest Aware** — feature "EcoHybrid powered by Google AI"
- **Dati di consumo** per migliorare il modello AI energetico di Google (mutuo beneficio)
- **Sostenibilità** — Google può dichiarare riduzione CO2 per milioni di utenti

### Modello di partnership
- **Fase 1:** Integrazione API — Google testa EcoHybrid su 10.000 utenti pilota
- **Fase 2:** General Availability — EcoHybrid come feature premium Nest Aware
- **Fase 3:** Acquisizione algoritmo — Google acquisisce licenza esclusiva o brevetto
- **Revenue:** licenza annuale + revenue share su Nest Aware premium

---

## Proposta 2: EcoHybrid White-Label — Automazione Invisibile per Utility

**Integrazione dell'algoritmo nell'app di una utility (es. Octopus Energy, Enel, Iren)**

Octopus integra EcoHybrid come motore di automazione termica nella propria app. L'utente lo attiva una volta e poi dimentica. L'algoritmo calcola il profilo base dalle bollette, legge il meteo in tempo reale e **applica le ottimizzazioni automaticamente**.

**Nessun suggerimento da approvare. Nessuna azione giornaliera. Solo automazione.**

- **Modello:** licenza software per utente attivo
- **Vantaggio per Octopus:** differenziazione dalla concorrenza, riduzione churn, upselling tariffa dinamica

---

## Proposta 3: Octopus Home Hub — Plug, Play, Dimentica

**Hardware assemblato branded Octopus, pronto all'uso**

Un Mini PC compatto (Intel N100, 4GB RAM, 128GB SSD) con:
- Home Assistant OS preinstallato e preconfigurato
- Integrazione EcoHybrid pre-caricata
- Stick USB Zigbee/Z-Wave incluso
- Case con branding Octopus Energy
- Setup wizard 9-step semplificato (una tantum)

**Target:** utenti che vogliono automazione reale senza competenze tecniche
**Prezzo di vendita suggerito:** 129 EUR (costo hardware ~80 EUR, margine ~49 EUR)
**Modello:** vendita hardware + licenza software annuale

**Variante "PC vecchio":** se l'utente ha già un PC (es. Dell OptiPlex 9020), forniamo solo la licenza software + chiavetta USB pre-flashata con HAOS.

**L'utente lo installa una volta e poi dimentica.**

---

## Proposta 4: EcoHybrid Business — Automazione per Edifici Commerciali

### Il problema B2B

Gli edifici commerciali e ricettivi in Italia consumano energia in modo inefficiente perché i sistemi termici operano in modo scollegato: climatizzatori, caldaie, ventilatori e schermature non comunicano tra loro e non hanno un algoritmo centrale che li ottimizzi.

**Il personale non ha tempo di regolare manualmente decine di termostati ogni giorno.** Serve un sistema che decida e applichi da solo.

### Dati di consumo reali — Fonti verificabili

**Alberghi (Italia):**
Secondo l'indagine RSE/2009/162 (Ricerca Sistema Elettrico), il consumo specifico di energia elettrica negli hotel italiani varia da **5 a 11 MWh per stanza all'anno**, equivalenti a **30-80 kWh/m²**.

Una tesi del Politecnico di Torino (2020) su un campione di hotel 4-5 stelle italiani riporta:
- EUI elettrico: **122-387 kWh/m²/anno**
- EUI termico: **18-337 kWh/m²/anno**
- EUI totale medio hotel 4 stelle: **364 kWh/m²/anno**

Fonte: RSE/2009/162; Politecnico di Torino, tesi "Analysis of the energy consumption in the hotel sector" (2020).

### La soluzione: EcoHybrid Business Hub

Dispositivo preconfigurato per il controllo centralizzato e **automatico** di tutti i sistemi termici:

| Componente | Specifica |
|---|---|
| Hardware | Mini PC Intel N100 / Raspberry Pi 5, 8GB RAM, 256GB SSD |
| Software | Home Assistant OS + EcoHybrid Business preinstallato |
| Connettività | Ethernet + WiFi + Zigbee/Z-Wave |
| Installazione | Plug-and-play: collega alla LAN, auto-discovery device |
| Setup | Configurazione iniziale da remoto inclusa |
| Operatività | 24/7 automatica, zero interazione richiesta |

**Prezzo:**
- Costo hardware: 120-180 EUR
- Vendita: **299-499 EUR** (incluso setup remoto + 3 mesi monitoraggio)
- Margine: 120-320 EUR/unità

### Risparmio stimato — Dati conservativi per singolo intervento

Gli studi ASHRAE 55 e le ricerche sulle VMC con destratificazione indicano i seguenti risparmi **per singolo intervento**, quando il device è presente:

| Intervento | Risparmio stimato | Condizione necessaria |
|---|---|---|
| Comfort adattivo (setpoint dinamico) | 5-10% | Estate, solo climatizzazione |
| Switch gas/elettrico (COP > 2.5) | 5-15% | Inverno, se presente pompa di calore |
| Recircolo/destratificazione | 10-20% | Inverno, se presente climatizzatore in modalita ventilazione |
| Schermatura solare automatica | 5-10% | Estate, se presenti tende e tapparelle motorizzate |

**Nota importante:** questi interventi NON si sommano linearmente. Agiscono su fasce diverse del consumo (estate vs inverno, elettrico vs termico). Il risparmio combinato realistico, per un edificio con tutti i device controllabili, si colloca tra il **10% e il 20%** sulla spesa energetica totale.

Fonte: ASHRAE Standard 55-2020; studi VMC destratificazione (AIVC, Air Infiltration and Ventilation Centre).

**EcoHybrid non promette risparmi in EUR.** Ogni edificio ha consumi diversi. Il sistema calcola il risparmio percentuale reale confrontando bolletta per bolletta. L'utente B2B verifica da solo quanto risparmia in base alla SUA spesa energetica.

### Modello di revenue B2B

| Voce | Prezzo | Note |
|---|---|---|
| Hardware EcoHybrid Business Hub | 299-499 EUR | Una tantum |
| Setup e configurazione | Incluso | Remoto, 2-4 ore |
| Monitoraggio mensile | 150-500 EUR/mese | Report, alert, tuning |
| Integrazione PMS/SCADA | 3.000-10.000 EUR | Progetto one-shot |
| Licenza software B2B | 0.50-2.00 EUR/m²/mese | White-label per catene |

**Il personale dell'albergo non deve imparare a usarlo. Si installa e si dimentica.**

---

## Proposta 5: Programma Pilota Beta

**Raccolta dati reali con early adopters Octopus**

Lancio di un programma pilota con 500-1.000 utenti Octopus in Italia. Gli utenti ricevono:
- Accesso gratuito a EcoHybrid per 6 mesi
- Octopus Home Hub a prezzo scontato (79 EUR)
- Report mensile automatico sui risparmi (via email, non richiesto)

**Cosa ottiene Octopus:**
- Dataset reale 24/7 su consumi, temperature, comportamenti utente
- Proof of concept dell'efficacia dell'algoritmo
- Test di integrazione con API Octopus Kraken
- Case study per espansione commerciale

**L'utente pilota non deve fare nulla. Solo installare e dimenticare.**

---

## Proposta 6: Tariffa Dinamica Intelligente

**EcoHybrid + Octopus Agile / Tracker**

Integrazione diretta tra l'algoritmo EcoHybrid e le tariffe dinamiche Octopus. Il sistema:
- Legge il prezzo orario della tariffa Agile
- Precarica la casa (raffredda/riscalda) nelle ore più economiche
- Spegne o riduce il carico nelle ore di picco
- Switcha automaticamente tra gas e elettrico in base al prezzo reale

**Vantaggio per l'utente:** risparmio aggiuntivo stimato del 10-25% oltre all'ottimizzazione termica (fonte: studi Octopus Agile, dati UK 2023-2024)
**Vantaggio per Octopus:** maggiore adozione delle tariffe dinamiche, flattening della domanda

**Tutto automatico. L'utente non deve pensare agli orari.**

---

## Dati di Mercato — Fonti ufficiali

**Costi energetici Italia (agosto 2026):**
- PUN elettricità F0: 0.189 EUR/kWh (GME)
- PUN elettricità F3: 0.152 EUR/kWh (GME)
- PSV gas: 0.664 EUR/m³ (GME)
- Perdite rete: 10% (Terna)
- TTF gas: 53.87 EUR/MWh (mercato all'ingrosso)

---

## Risparmio stimato per tipologia utente — Range conservativi

| Profilo utente | Spesa base/anno | Risparmio stimato | Note |
|---|---|---|---|
| Appartamento 80mq, solo caldaia gas | 1.400-1.800 EUR | **8-18%** | Comfort adattivo + setback assenza |
| Casa 120mq, caldaia + pompa | 1.800-2.500 EUR | **12-25%** | Comfort + switch gas/elettrico + setback |
| Casa 120mq, tutti i device | 1.800-2.500 EUR | **15-30%** | Comfort + switch + recircolo + schermatura + setback |

**Note sui range:**
- Il **minimo** si applica quando l'utente ha pochi device controllabili (solo caldaia, nessuna pompa, nessuna VMC). Il risparmio deriva dal comfort adattivo estate (5-8%), dal setback notturno inverno (3-5%) e dal setback assenza (5-8% da solo pilastro).
- Il **massimo** si applica quando l'utente ha tutti i device (climatizzatori smart, pompa di calore, VMC, tende e tapparelle motorizzate). Lo switch gas/elettrico e il recircolo aggiungono risparmio invernale significativo.
- Lo switch gas/elettrico ha impatto solo se presente pompa di calore con COP > 2.5.
- Il recircolo ha impatto solo in inverno e se presente climatizzatore in modalita ventilazione.
- La schermatura solare ha impatto solo in estate e se presenti tende e tapparelle motorizzate.
- I valori percentuali sono calcolati su spesa base reale: appartamento 80mq = 1.400-1.800 EUR/anno (dati ISTAT/ENEA per famiglia tipo 2 persone, climatizzazione + riscaldamento).

**EcoHybrid non promette cifre in EUR.** Il risparmio reale dipende da quanti device controllabili hai già, dalla stagione, dall'isolamento della casa e dai prezzi energetici. Il sistema calcola il risparmio percentuale reale confrontando bolletta per bolletta. Ogni utente verifica da solo quanto risparmia in base alla SUA spesa.

---

## Modello di Business — Trasparenza e Sostenibilità

**Premessa:** l'algoritmo EcoHybrid e l'app di calcolo sono e rimarranno gratuiti e open-source. Questo è un principio non negoziabile, coerente con la posizione di docente del founder e con l'etica del progetto.

Il revenue si genera su servizi a valore aggiunto e licenze B2B, non sulla vendita dei dati o dell'app stessa.

### Flusso 1: Licenza B2B (White-Label)
Vendita dell'algoritmo come modulo integrabile nelle app di utility, PMS alberghieri, software retail.
- **Pricing:** 0.50-2.00 EUR per utente attivo / mese
- **Esempio:** 50.000 utenti attivi × 1 EUR/mese = 600.000 EUR/anno
- **Target:** Octopus Energy, Enel, Eni, Iren, Oracle Opera, Cloudbeds

### Flusso 2: Hardware Margin
Vendita di hub domotico preconfigurato.
- Mini PC branded: costo 80 EUR, vendita 129 EUR → margine 49 EUR/unità
- EcoHybrid Business Hub: costo 120-180 EUR, vendita 299-499 EUR → margine 120-320 EUR/unità
- Chiavetta USB pre-flashata HAOS: costo 5 EUR, vendita 29 EUR → margine 24 EUR/unità

### Flusso 3: Commissioni Switch Fornitore
Quando l'algoritmo consiglia un cambio fornitore, link referral a broker energy autorizzati.
- **Commissione:** 30-80 EUR per nuovo contratto attivato
- **Requisito:** partnership con broker già iscritto all'Albo Agenti di Commercio
- **Trasparenza:** la raccomandazione è sempre basata su calcolo oggettivo (PSV + spread), mai su commissioni

### Flusso 4: Consulenza Premium (Business)
Servizi su misura per alberghi, supermercati, uffici.
- Audit + setup device: 500-2.000 EUR
- Monitoraggio mensile: 150-500 EUR/mese
- Integrazione PMS/SCADA: 3.000-10.000 EUR progetto

### Flusso 5: Abbonamento Premium (Futuro)
Per utenti consumer che vogliono funzioni avanzate.
- Report mensile dettagliato + alert push personalizzati + API: 2.99 EUR/mese
- La versione base (automazione 24/7, calcolo risparmio, meteo, switch) resta sempre gratuita

---

## Posizione del Founder

Il progetto è fondato da un docente con competenze in ingegneria e ottimizzazione. Questo garantisce:
- **Credibilità tecnica:** l'algoritmo è basato su standard scientifici (ASHRAE 55, de Dear & Brager)
- **Trasparenza:** nessuna vendita di dati utente, nessun dark pattern, nessuna raccomandazione influenzata da commissioni nascoste
- **Vincolo etico:** il modello di business deve essere compatibile con la posizione pubblica, quindi open-source e gratuita per il consumer

---

## Roadmap

| Fase | Tempo | Obiettivo |
|---|---|---|
| Fase 1 | 0-6 mesi | Programma pilota 500 utenti, raccolta dati, affinamento algoritmo |
| Fase 2 | 3-9 mesi | **Pitch a Google Home Partnership team**, demo API integration, POC su 10.000 utenti |
| Fase 3 | 6-12 mesi | Lancio Octopus Home Hub + EcoHybrid Business Hub, integrazione API Octopus Kraken |
| Fase 4 | 12-18 mesi | EcoHybrid White-label per utility, espansione EU |
| Fase 5 | 18+ mesi | Tariffa Dinamica Intelligente, partnership Google / produttori clima |

---

## Team

- **Patrizio PZ** — Founder & Product
- **[Da definire]** — CTO / Backend
- **[Da definire]** — Hardware / IoT

---

*EcoHybrid — Il cervello termico della tua casa. E del tuo albergo.*
*Installa. Dimentica. Risparmia.*
