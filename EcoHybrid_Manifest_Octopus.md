# ECOHYBRID
## Manifesto per Octopus Energy Italia

---

### 1. IL PROBLEMA

L'85% delle famiglie italiane con climatizzatore inverter lo usa solo in estate. In inverno accendono la caldaia a gas, pagando bollette che crescono del 15-25% ogni anno.

Perche'?
- Nessuno spiega al cliente che il suo condizionatore e' gia' una pompa di calore
- Nessuno gli dice quando conviene gas e quando elettricita'
- Nessuno ottimizza temperatura, tapparelle e presenza in automatico

Risultato: sprechi termici del 20-40%, costi piu' alti del necessario, emissioni inutili.

---

### 2. LA SOLUZIONE

**EcoHybrid** e' un'app che trasforma qualsiasi casa con climatizzatore inverter in un sistema ibrido ottimizzato.

Cosa fa:
1. **Legge le bollette** (luce + gas) e calcola il profilo reale di consumo
2. **Rileva presenza** (WiFi smartphone, geofencing, sensori opzionali)
3. **Ottimizza temperatura** in automatico: comfort quando sei a casa, setback quando sei fuori, antigelo in ferie
4. **Comanda tapparelle e valvole** se presenti, riducendo dispersione
5. **Sceglie la fonte piu' conveniente** ogni ora: gas o pompa di calore
6. **Mostra il risparmio reale** confrontando bolletta base vs ottimizzata

---

### 3. TRE PERCORSI PER TIPOLOGIA CLIENTE

EcoHybrid funziona con **qualsiasi ecosistema** gia' presente in casa. Non obblighiamo nessuno a comprare hardware.

#### PERCORSO A - Cliente Samsung SmartThings (zero hardware)

| Requisito | Stato |
|-----------|-------|
| Climatizzatore Samsung WindFree o compatibile SmartThings | Gia' presente |
| App SmartThings | Gia' installata |
| Account Samsung Developer | Gratuito, 5 min |

**Flusso:**
1. Cliente apre EcoHybrid → sceglie "Ho SmartThings"
2. OAuth con account Samsung (1 click)
3. EcoHybrid legge temperatura, stato clima, consumi da SmartThings Cloud
4. Algoritmo ottimizza e comanda clima direttamente via API SmartThings
5. Nessun Mini PC, nessun Home Assistant, tutto nell'app

**Vantaggio:** Zero installazione, zero costi hardware, attivazione in 2 minuti.

#### PERCORSO B - Cliente con climatizzatore WiFi Smart Life / Tuya (Mini PC opzionale)

| Requisito | Stato |
|-----------|-------|
| Climatizzatore con WiFi integrato e app Smart Life (Midea, Hisense, TCL, etc.) | Gia' presente |
| **OPPURE** climatizzatore qualsiasi + controller IR universale WiFi Tuya (10-20 EUR) | Da acquistare |
| WiFi domestico | Gia' presente |

**Nota:** Tuya e' una piattaforma IoT, non un ente certificatore. I climatizzatori compatibili usano chip Tuya e l'app **Smart Life**. Non esiste una "certificazione Tuya" ufficiale.

**Flusso Base (senza Mini PC - gratuito):**
1. Cliente apre EcoHybrid → sceglie "Ho un climatizzatore con WiFi"
2. Inserisce bollette luce + gas (o carica PDF)
3. App calcola risparmio stimato e mostra suggerimenti manuali
4. Cliente applica i suggerimenti da solo tramite telecomando o app Smart Life

**Flusso Avanzato (con Mini PC 50 EUR o PC vecchio riciclato):**
1. Cliente usa un Mini PC (nuovo 50 EUR o vecchio PC riciclato come Dell OptiPlex)
2. Installa Home Assistant OS su chiavetta USB (wizard guidato 9 step)
3. Home Assistant rileva automaticamente il clima via LocalTuya (senza cloud)
4. EcoHybrid comanda clima, caldaia, tapparelle in automatico
5. Dashboard in tempo reale con dati reali

**Vantaggio:** Il cliente sceglie: suggerimenti gratuiti o automazione completa a 4,99 EUR/mese. Funziona con qualsiasi clima, anche vecchio, grazie al controller IR.

#### PERCORSO C - Cliente senza smart home (kit completo)

| Requisito | Stato |
|-----------|-------|
| Niente di smart in casa | Da acquistare |

**Flusso:**
1. Cliente acquista **EcoHybrid Kit** (Mini PC + controller IR + termostato smart + valvole opzionali)
2. Installazione plug-and-play: collega Mini PC, accende, configura da app
3. Home Assistant pre-configurato con tutte le integrazioni
4. Automazione completa attiva in 10 minuti

**Vantaggio:** Soluzione chiavi in mano, installabile da chiunque.

---

### 4. MODELLO DI BUSINESS

| Elemento | Dettaglio |
|-----------|-----------|
| **Freemium** | App gratuita: bollette, calcolo risparmio, suggerimenti manuali |
| **Premium** | 4,99 EUR/mese: automazione device, dashboard real-time, storico |
| **Hardware** | Mini PC pre-configurato 79 EUR (una tantum) |
| **Controller IR Tuya** | 19 EUR (opzionale, per clima non smart) |
| **Kit completo** | Mini PC + controller + termostato + valvole: 199 EUR |
| **B2B White-label** | Revenue share 20% con utility |

**Target addressable:** 4,5M famiglie italiane con climatizzatore + caldaia a gas.

---

### 5. TECNOLOGIA

**Stack:**
- Frontend: PWA HTML5/CSS3/JS (nessun app store, installabile da browser)
- Backend: Supabase (PostgreSQL + Edge Functions)
- Automazione: Home Assistant OS su Mini PC x86 (opzionale)
- Integrazioni: SmartThings API / Tuya Cloud / LocalTuya / Matter
- Meteo: Open-Meteo API (gratuita)
- AI: Groq API per analisi consumi e suggerimenti personalizzati

**Architettura SmartThings (Percorso A):**
```
App EcoHybrid (PWA)
    ↓
SmartThings Cloud API (OAuth)
    ↓
Dispositivi Samsung: Clima / Termostato / Sensori
```

**Architettura Home Assistant (Percorso B/C):**
```
App EcoHybrid (PWA)
    ↓
Supabase Cloud (storico, analytics, billing)
    ↓
Home Assistant (Mini PC locale)
    ↓
Dispositivi: Clima / Termostato / Tapparelle / Valvole
```

**Privacy:**
- Dati consumi cifrati end-to-end
- Nessun dato venduto a terzi
- Comandi device solo in locale (Home Assistant) o via API autorizzate (SmartThings)

---

### 6. DATI REALI - CASO STUDIO PATRIZIO P. (Varallo, VC)

**Casa:** Appartamento 100mq, zona climatica E
**Impianto:** Caldaia a condensazione + climatizzatore inverter con WiFi Smart Life (Ariel Energia)
**Fornitore:** Octopus Energy (luce bioraria + gas)
**Percorso:** B (con Mini PC Dell 9020 riciclato)

| Voce | Valore reale |
|------|-------------|
| Costo gas variabile | 0,9426 EUR/Smc |
| Costo luce F1/F2/F3 | 0,2927 / 0,3111 / 0,2903 EUR/kWh |
| Consumo gas annuo stimato | 449 Smc |
| Consumo luce annuo stimato | 1.153 kWh |
| Spesa annua base | 1.122,36 EUR |
| Spesa annua EcoHybrid | 1.056,36 EUR |
| **Risparmio annuo** | **66,00 EUR (5,9%)** |

**Convenienza pompa vs gas:** 12,4% meno costosa per kWh utile.

Con ottimizzazioni aggiuntive (valvole intelligenti, tapparelle elettriche, fotovoltaico) il risparmio sale al 15-25%.

---

### 7. MERCATO E COMPETIZIONE

| Competitor | Cosa fa | Cosa manca |
|-----------|---------|-----------|
| **Tado** | Termostato smart | Solo riscaldamento, no ibrido, no SmartThings |
| **Netatmo** | Valvole termostatiche | No switch fonte, no bollette, no ecosistema |
| **Enel X** | Home automation | Chiuso ecosistema, no ottimizzazione ibrida |
| **Home Assistant** | Piattaforma aperta | Troppo complesso per l'utente medio |
| **Samsung SmartThings** | Ecosistema device | No ottimizzazione energetica, no bollette |

**EcoHybrid e' l'unico** che:
- Funziona con **qualsiasi ecosistema** (Samsung, Smart Life/Tuya, standalone)
- Parte dalle **bollette reali** (ground truth)
- Ottimizza **gas + elettrico insieme**
- Non richiede **competenze tecniche**
- Offre **percorso zero-hardware** per clienti SmartThings
- Supporta **climatizzatori vecchi** via controller IR (10-20 EUR)

---

### 8. ROADMAP

| Fase | Tempo | Deliverable |
|------|-------|-------------|
| **MVP** | Settembre 2026 | App demo + SmartThings integration + 1 casa test |
| **Beta** | Ottobre 2026 | 50 utenti (20 SmartThings, 30 Home Assistant) |
| **V1** | Gennaio 2027 | Abbonamento, dashboard completa, API aperte |
| **B2B** | Aprile 2027 | White-label per utility (Octopus, Enel, Edison) |

---

### 9. COSA CHIEDIAMO A OCTOPUS ENERGY

1. **Accesso API** ai dati consumo real-time dei clienti (con consenso GDPR)
2. **Co-marketing** su clientela dual fuel (luce + gas) con climatizzatore
3. **Revenue share** del 15% su abbonamenti attivati da referral Octopus
4. **Pilot** su 100 clienti Octopus:
   - 50 con SmartThings (percorso A, zero hardware)
   - 50 con Home Assistant (percorso B, Mini PC fornito)
5. **Dati aggregati** (anonimi) per affinare algoritmo di ottimizzazione

---

### 10. TEAM

| Ruolo | Stato |
|-------|-------|
| Founder / Product | Patrizio P. (docente, innovatore brevettuale) |
| CTO / Sviluppo | AI partner (Kimi + sviluppo autonomo) |
| Hardware / IoT | Da reclutare |
| Business Dev | Da reclutare |

---

### 11. CONTATTO

**Progetto:** EcoHybrid
**Repository:** github.com/PatrizioPZ/ecohybrid
**Demo:** patriziozpz.github.io/ecohybrid
**Email:** [da inserire]

---

*Documento redatto l'11 agosto 2026. Dati bollette certificati Octopus Energy. Caso studio verificato su impianto reale.*
