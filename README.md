# EcoHybrid v2.5

PWA per ottimizzazione energetica domestica — match ottimale gas/pompa di calore con circolazione recupero.

## I 5 Pilastri

1. **Riciclo Termico Invernale** (FAN destratificazione)
2. **Meteo Predittivo** (raffreddamento preventivo)
3. **Schermatura Solare Passiva** (tapparelle motorizzate)
4. **Ottimizzazione Riciclo Aria** (CO2/VOC, VMC)
5. **Geofencing Dinamico** (distanza smartphone)

## Struttura completa

```
ecohybrid/
├── server.js                 # Backend Express principale
├── server-sensori.js         # Gestione sensori multipli ZHA
├── router-bollette.js        # API bollette PDF (parser + storage)
├── poll-ha.js                # Polling sensori da Home Assistant
├── flight-recorder.js        # Logger storico cicli Autopilot
├── config.json               # Configurazione
├── .env                      # Variabili d'ambiente (HA_URL, HA_TOKEN, etc.)
├── public/
│   ├── index.html            # Dashboard principale
│   ├── pdf-analyzer.html     # Parser bollette PDF (pdf.js + tesseract.js)
│   ├── css/
│   │   └── octopus-theme.css
│   └── js/
│       └── app.js
├── js/
│   ├── pdfjs/                # Libreria PDF.js
│   │   ├── pdf.min.js
│   │   └── pdf.worker.min.js
│   └── tesseract/            # Libreria OCR Tesseract.js
│       ├── tesseract.min.js
│       └── worker.min.js
└── docs/
    └── PITCH_OCTOPUS.md
```

## Avvio rapido

```bash
npm install
npm start
```

Apri `http://localhost:3000`

## Modalita

- `mock` — Simulazione (default)
- `tuya` — API Cloud Tuya
- `ha` — Home Assistant locale

Modifica `config.json` per cambiare modalita.

## Parser Bollette PDF

La pagina `public/pdf-analyzer.html` permette di:
1. Caricare una bolletta PDF (digitale o scannerizzata)
2. Estrarre automaticamente: costo €/kWh, consumo kWh, potenza kW, totale €
3. Verificare e correggere i dati estratti
4. Salvare via API `/api/bollette/upload`

Le bollette vengono salvate in `data/bollette.json` e usate dall'algoritmo per calcolare il **costo medio reale €/kWh**.

## API Bollette

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/bollette` | GET | Lista tutte le bollette |
| `/api/bollette/stats` | GET | Statistiche aggregate (costo medio, consumo medio) |
| `/api/bollette/upload` | POST | Salva nuova bolletta |
| `/api/bollette/:id` | DELETE | Elimina bolletta |

## Variabili d'ambiente (.env)

```
HA_URL=http://192.168.1.21
HA_TOKEN=your_long_lived_token
PUN_FALLBACK=0.125
PSV_FALLBACK=0.38
HOME_LAT=45.8107
HOME_LON=8.2675
```

## Roadmap

- v1.0 Mock mode + Dashboard + 5 Pilastri UI
- v1.1 Integrazione Tuya Cloud
- v1.2 Integrazione Home Assistant
- v1.3 API Octopus Energy (tariffe dinamiche)
- v1.4 Raccolta dati storici + grafici
- v2.0 Sensori reali multipli + Flight Recorder
- v2.1 Parser bollette PDF + calibrazione costi reali
- v2.2 Notifiche push + Companion App PWA
- v2.3 Presenza/eco mode + geofencing
- v2.4 Machine learning implicito (pattern storici)
- v2.5 Autopilot con memoria tra cicli + calibrazione umidita ZHA
