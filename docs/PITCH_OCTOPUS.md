EcoHybrid — Proposte Commerciali per Octopus Energy
Visione
EcoHybrid e l algoritmo di ottimizzazione termica predittiva che trasforma ogni climatizzatore in un sistema intelligente di gestione energetica. Non si limita a controllare la temperatura: ottimizza l intero edificio attraverso 5 pilastri innovativi, riducendo i consumi fino al 40% senza sacrificare il comfort.
L algoritmo si basa sullo standard ASHRAE 55 e sul modello adattivo di de Dear & Brager: il comfort non e una temperatura fissa, ma una funzione dinamica di temperatura esterna, umidita, abitudini personali e stagione.
I 5 Pilastri Tecnologici
1. Comfort Adattivo (ASHRAE 55)
Estate: il setpoint non e fisso. Segue la regola T_esterna - 2C (max 26C). Se l umidita supera il 60%, attiva Cool+Dry per deumidificare senza abbassare eccessivamente la temperatura. Questo evita i classici problemi da raffreddamento eccessivo: mal di testa, fatica, sintomi naso/gola.
Inverno: target 20.5C (regolabile 19-22C), setback notturno automatico -3C.
2. Switch Dinamico Gas / Elettrico
L algoritmo calcola in tempo reale quale fonte conviene per produrre 1 kWh termico, confrontando:
Costo gas (PSV / 10 kWh termici per Smc)
Costo elettrico via pompa di calore (PUN x perdite rete / COP)
Il COP della pompa cambia con la temperatura esterna: da 4.0 (15C) a 1.5 (-10C). Il sistema switcha automaticamente sulla fonte piu economica.
3. Recircolo Calore Invernale (FAN Destratificazione)
In inverno il calore si accumula sotto il soffitto (scarto 3-5C tra alto e basso). Un ventilatore/VMC a 15-20W muove l aria calda verso il basso. Il termostato rileva temperatura piu alta e riduce il carico della caldaia. Risparmio stimato: 20-30% sui consumi invernali.
4. Schermatura Solare Passiva
Chiusura automatica tapparelle motorizzate prima che il sole colpisca le stanze (es. Ovest alle 17:00). Blocca l effetto serra a costo zero.
5. Meteo Predittivo e Geofencing
Integrazione API Open-Meteo (gratuita, no key) per previsioni 48h. Geofencing via smartphone per setback in assenza.
Chiarezza su Tuya
"Certificato Tuya" non esiste. Tuya e una piattaforma IoT, non un ente certificatore. I produttori (Midea, Hisense, TCL, centinaia di brand) integrano il chip Tuya e usano l app Smart Life.
Cosa funziona:
Climatizzatore con WiFi + app Smart Life → controllabile via API Tuya Cloud
Climatizzatore vecchio + controller IR universale Tuya (10-20 EUR) → diventa smart
Samsung WindFree → usa SmartThings, non Tuya
Proposta 1: EcoHybrid White-Label
Integrazione dell algoritmo nell app Octopus Energy
Octopus integra EcoHybrid come motore di ottimizzazione termica nella propria app. L utente inserisce le bollette, l algoritmo calcola il profilo base, legge il meteo in tempo reale e suggerisce azioni giornaliere.
Modello: licenza software per utente attivo
Vantaggio per Octopus: differenziazione dalla concorrenza, riduzione churn, upselling tariffa dinamica
Proposta 2: Octopus Home Hub
Hardware assemblato branded Octopus, pronto all uso
Un Mini PC compatto (Intel N100, 4GB RAM, 128GB SSD) con:
Home Assistant OS preinstallato e preconfigurato
Integrazione EcoHybrid pre-caricata
Stick USB Zigbee/Z-Wave incluso
Case con branding Octopus Energy
Setup wizard 9-step semplificato (scarica HA → flash USB → collega clima)
Target: utenti che vogliono automazione reale senza competenze tecniche
Prezzo di vendita suggerito: 129 EUR (costo hardware ~80 EUR, margine ~49 EUR)
Modello: vendita hardware + abbonamento software
Variante "PC vecchio": se l utente ha gia un PC (es. Dell OptiPlex 9020), forniamo solo la licenza software + chiavetta USB pre-flashata con HAOS.
Proposta 3: Programma Pilota Beta
Raccolta dati reali con early adopters Octopus
Lancio di un programma pilota con 500-1000 utenti Octopus in Italia. Gli utenti ricevono:
Accesso gratuito a EcoHybrid per 6 mesi
Octopus Home Hub a prezzo scontato (79 EUR)
Report mensile personalizzato sui risparmi
Cosa ottiene Octopus:
Dataset reale 24/7 su consumi, temperature, comportamenti utente
Proof of concept dell efficacia dell algoritmo
Test di integrazione con API Octopus Kraken
Case study per espansione commerciale
Proposta 4: Tariffa Dinamica Intelligente
EcoHybrid + Octopus Agile / Tracker
Integrazione diretta tra l algoritmo EcoHybrid e le tariffe dinamiche Octopus. Il sistema:
Legge il prezzo orario della tariffa Agile
Precarica la casa (raffredda/riscalda) nelle ore piu economiche
Spegne o riduce il carico nelle ore di picco
Switcha automaticamente tra gas e elettrico in base al prezzo reale
Vantaggio per l utente: risparmio aggiuntivo del 15-25% oltre all ottimizzazione termica
Vantaggio per Octopus: maggiore adozione delle tariffe dinamiche, flattening della domanda
Dati di Mercato e Risparmio
Costi energetici Italia (agosto 2026):
PUN elettricita: 0.189 EUR/kWh (F0), 0.152 EUR/kWh (F3)
PSV gas: 0.664 EUR/Smc
TTF gas: 53.87 EUR/MWh
Risparmio stimato per tipologia utente:
Table
Profilo utente	Spesa base/anno	Con EcoHybrid	Risparmio
Appartamento 80mq, solo caldaia gas	1.800 EUR	1.350 EUR	450 EUR (25%)
Casa 120mq, caldaia + pompa	2.400 EUR	1.680 EUR	720 EUR (30%)
Casa 120mq, tutti i device	2.400 EUR	1.440 EUR	960 EUR (40%)
Modello di Business — Trasparenza e Sostenibilita
Premessa: l algoritmo EcoHybrid e l app di calcolo sono e rimarranno gratuiti e open-source. Questo e un principio non negoziabile, coerente con la mia posizione di docente e con l etica del progetto.
Il revenue si genera su servizi a valore aggiunto e licenze B2B, non sulla vendita dei dati o dell app stessa.
Flusso 1: Licenza B2B (White-Label)
Vendita dell algoritmo come modulo integrabile nelle app di utility, PMS alberghieri, software retail.
Pricing: 0.50-2.00 EUR per utente attivo / mese
Esempio: 50.000 utenti attivi × 1 EUR/mese = 600.000 EUR/anno
Target: Octopus Energy, Enel, Eni, Iren, Oracle Opera, Cloudbeds
Flusso 2: Hardware Margin
Vendita di hub domotico preconfigurato (Octopus Home Hub o brand proprio).
Mini PC branded: costo 80 EUR, vendita 129 EUR → margine 49 EUR/unita
Chiavetta USB pre-flashata HAOS: costo 5 EUR, vendita 29 EUR → margine 24 EUR/unita
Target: utenti che vogliono automazione reale senza competenze tecniche
Flusso 3: Commissioni Switch Fornitore
Quando l algoritmo consiglia un cambio fornitore, link referral a broker energy autorizzati.
Commissione: 30-80 EUR per nuovo contratto attivato
Requisito: partnership con broker gia iscritto all Albo Agenti di Commercio (in proprio non e permesso senza iscrizione)
Trasparenza: la raccomandazione e sempre basata su calcolo oggettivo (PSV + spread), mai su commissioni
Flusso 4: Consulenza Premium (Business)
Servizi su misura per alberghi, supermercati, uffici.
Audit + setup device: 500-2.000 EUR
Monitoraggio mensile: 150-500 EUR/mese
Integrazione PMS/SCADA: 3.000-10.000 EUR progetto
Flusso 5: Abbonamento Premium (Futuro)
Per utenti consumer che vogliono funzioni avanzate.
Report mensile dettagliato + alert push personalizzati + API: 2.99 EUR/mese
La versione base (calcolo risparmio, meteo, switch) resta sempre gratuita
Posizione del Founder
Il progetto e fondato da un docente con competenze in ingegneria e ottimizzazione. Questo garantisce:
Credibilita tecnica: l algoritmo e basato su standard scientifici (ASHRAE 55, de Dear & Brager)
Trasparenza: nessuna vendita di dati utente, nessun dark pattern, nessuna raccomandazione influenzata da commissioni nascoste
Vincolo etico: il modello di business deve essere compatibile con la posizione pubblica, quindi open-source e gratuita per il consumer
Roadmap
Fase 1 (0-6 mesi): Programma pilota 500 utenti, raccolta dati, affinamento algoritmo
Fase 2 (6-12 mesi): Lancio Octopus Home Hub, integrazione API Octopus Kraken, beta pubblica
Fase 3 (12-18 mesi): EcoHybrid White-Label nell app Octopus, espansione EU
Fase 4 (18+ mesi): Tariffa Dinamica Intelligente, partnership con produttori clima
Team
Patrizio PZ — Founder & Product
[Da definire] — CTO / Backend
[Da definire] — Hardware / IoT
EcoHybrid — Il cervello termico della tua casa.
