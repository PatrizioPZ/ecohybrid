# EcoHybrid

&gt; **Il "cervello energetico" che fa risparmiare fino al 30% in bolletta gestendo gas, pompa di calore, circolazione recupero, tapparelle, tende, umidita e consulenza hardware — ora per ora, stanza per stanza.**

[![Netlify Status](https://api.netlify.com/api/v1/badges/ecohybrid/deploy-status)](https://ecohybrid.netlify.app)

---

## Il problema

In Italia il **70% delle case** ha un impianto ibrido: **caldaia a gas + condizionatori split**. Nessun sistema gestisce automaticamente la commutazione tra i due in base alla temperatura esterna, all'umidita e ai costi di mercato. L'utente deve impostare tutto a mano, sprecando energia e soldi.

EcoHybrid risolve questo e molto altro.

---

## Le 8 funzionalita principali

### 1. Match ottimale gas / pompa / circolazione recupero
L'algoritmo core. Decide ora per ora chi lavora in base a:
- **Temperatura esterna** (meteo real-time via Open-Meteo)
- **Umidita esterna** (cicli di sbrinamento, efficienza COP)
- **Costi di mercato** (kWh luce e Smc gas inseriti dall'utente)
- **Zone della casa** (piano, esposizione, presenza split nella stessa stanza)

| Modalita | Quando si attiva | Risparmio vs solo gas |
|---|---|---|
| **Circolazione recupero** | Gas acceso + split nella stessa stanza | **25%** |
| **Pompa di calore** | COP ottimale (8-18C) | 15-40% |
| **Gas solo** | Inverno estremo (&lt; 2C) | 0% (obbligatorio) |
| **Ibrido multi-zona** | Differenza costi &lt; 5% | 8% |
| **Stop** | Temperatura sufficiente (18-24C) | **100%** |

**Circolazione recupero — l'innovazione chiave:**
Quando il gas e acceso e lo split e nella stessa stanza, EcoHybrid attiva la modalita circolazione:
1. Il gas riscalda l'aria che sale per convezione naturale
2. Lo strato di aria calda si ferma a **15-20 cm dal soffitto**
3. Lo split in **modalita ventilazione (fan only)** spinge quell'aria calda verso il basso
4. Il termosifone raggiunge la temperatura target **piu velocemente** e si spegne **prima**
5. Il gas lavora il **25% in meno**, lo split consuma solo **40W**

**COP in questa modalita: quasi infinito** — non produci calore nuovo, sposti solo quello gia pagato.

### 2. Gestione tapparelle e tende intelligenti
- **Inverno**: su al mattino nelle stanze esposte a Sud (riscaldamento solare gratis), giu al tramonto (isolamento termico)
- **Estate**: giu al mattino su finestre Est (prima che il sole colpisca), su la sera per ventilazione notturna
- Basato su **posizione GPS**, esposizione e calcolo posizione del sole
- Riconosce se il cliente ha **tapparelle** (isolamento totale) o **tende** (schermatura luminosa) e adatta la strategia

### 3. Ottimizzazione umidita (modalita DRY)
- Estate, quando umidita &gt; 65%: priorita a **deumidificatore** invece di raffrescamento puro
- Consumo ridotto del **40%** con stesso comfort termico percepito

### 4. Mappatura zone della casa
- Rileva piano, esposizione, presenza split nella stessa stanza del termosifone
- Strategia differenziata per zona: pompa in alto, gas in basso, circolazione dove possibile

### 5. Apprendimento abitudini
- Orari alzata / sonno / fuori casa
- Rilevamento presenza (stanze usate vs vuote)
- Dopo **48 ore** ottimizza automaticamente senza chiedere piu nulla

### 6. Analisi bolletta e confronto offerte
- Traccia spesa mensile gas + luce
- Calcola baseline vs ottimizzazione
- Confronta con offerte migliori sul mercato
- Certifica risparmio in EUR e percentuale

### 7. Consulenza hardware intelligente
- Dopo analisi della casa, suggerisce sensori / termostati / infissi / tapparelle / tende certificati Altroconsumo
- Calcola **ROI completo**: costo, detrazione fiscale 50%, mesi di ammortizzamento, risparmio annuo
- Messaggi diretti: *"Questo sensore costa 15 EUR, lo ammortizzi in 3 mesi, in un anno risparmi 20 EUR"*

### 8. PWA installabile offline
- Zero store, zero commissioni Apple/Google
- Funziona senza internet dopo prima installazione
- Interfaccia responsive, colori brand Octopus

---

## Stack tecnico

| Componente | Tecnologia |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| PWA | Manifest + Service Worker (offline) |
| Icone | Lucide (CDN) |
| Meteo | Open-Meteo API (gratis, no API key) |
| Hosting | Netlify (HTTPS, CDN globale) |
| Bridge hardware | Home Assistant / SmartThings / IFTTT |

---

## Struttura file
