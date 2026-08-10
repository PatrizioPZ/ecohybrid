# EcoHybrid

Ottimizzazione energetica intelligente per climatizzazione, con interfaccia Octopus Energy.

## I 5 Pilastri
1. Riciclo Termico Invernale (FAN destratificazione)
2. Meteo Predittivo (raffreddamento preventivo)
3. Schermatura Solare Passiva (tapparelle motorizzate)
4. Ottimizzazione Riciclo Aria (CO2/VOC, VMC)
5. Geofencing Dinamico (distanza smartphone)

## Avvio rapido

```bash
npm install
npm start
```

Apri `http://localhost:3000`

## Modalita
- `mock` - Simulazione (default)
- `tuya` - API Cloud Tuya
- `ha` - Home Assistant locale

Modifica `config.json` per cambiare modalita.

## Struttura
```
ecohybrid/
├── server.js              # Backend Express
├── config.json            # Configurazione
├── public/
│   ├── index.html         # App frontend
│   ├── css/
│   │   └── octopus-theme.css
│   └── js/
│       └── app.js
└── docs/
    └── PITCH_OCTOPUS.md   # Proposta commerciale
```

## Roadmap
- [x] v1.0 Mock mode + Dashboard + 5 Pilastri UI
- [ ] v1.1 Integrazione Tuya Cloud
- [ ] v1.2 Integrazione Home Assistant
- [ ] v1.3 API Octopus Energy (tariffe dinamiche)
- [ ] v1.4 Raccolta dati storici + grafici
- [ ] v2.0 Pitch Octopus Energy
