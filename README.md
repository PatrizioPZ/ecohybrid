# EcoHybrid

> **L'algoritmo che fa risparmiare fino al 30% in bolletta gestendo gas, pompa di calore e circolazione recupero — ora per ora, stanza per stanza.**

[![Netlify Status](https://api.netlify.com/api/v1/badges/ecohybrid/deploy-status)](https://ecohybrid.netlify.app)

---

## Il problema

In Italia il **70% delle case** ha un impianto ibrido: **caldaia a gas + condizionatori split**. Nessun sistema gestisce automaticamente la commutazione tra i due in base alla temperatura esterna, all'umidita e ai costi di mercato. L'utente deve impostare tutto a mano, sprecando energia e soldi.

## La soluzione

EcoHybrid e una **Progressive Web App** che ottimizza il consumo energetico con un algoritmo decisionale che analizza:

- **Temperatura esterna** (meteo re-time via Open-Meteo)
- **Umidita esterna** (cicli di sbrinamento, efficienza COP)
- **Costi di mercato** (kWh luce e Smc gas inseriti dall'utente)
- **Zone della casa** (piano, esposizione, presenza split nella stessa stanza)
- **Abitudini** (orari alzata, sonno, assenza)

### Le 5 modalita operative

| Modalita | Quando si attiva | Risparmio vs solo gas |
|---|---|---|
| **Circolazione recupero** | Gas acceso + split nella stessa stanza | **25%** |
| **Pompa di calore** | COP ottimale (8-18C) | 15-40% |
| **Gas solo** | Inverno estremo (< 2C) | 0% (obbligatorio) |
| **Ibrido multi-zona** | Differenza costi < 5% | 8% |
| **Stop** | Temperatura sufficiente (18-24C) | **100%** |

### Circolazione recupero — l'innovazione chiave

Quando il gas e acceso e lo split e nella stessa stanza, EcoHybrid attiva la **modalita circolazione**:

1. Il gas riscalda l'aria che sale per convezione naturale
2. Lo strato di aria calda si ferma a **15-20 cm dal soffitto**
3. Lo split in **modalita ventilazione (fan only)** spinge quell'aria calda verso il basso
4. Il termosifone raggiunge la temperatura target **piu velocemente** e si spegne **prima**
5. Il gas lavora il **25% in meno**, lo split consuma solo **40W**

**COP in questa modalita: quasi infinito** — non produci calore nuovo, sposti solo quello gia pagato.

---

## Stack tecnico

| Componente | Tecnologia |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| PWA | Manifest + Service Worker (offline) |
| Icone | Lucide (CDN) |
| Meteo | Open-Meteo API (gratis, no key) |
| Hosting | Netlify (HTTPS, CDN globale) |
| Bridge hardware | Home Assistant / SmartThings / IFTTT |

---

## Struttura file

```
ecohybrid/
  index.html          # PWA completa (onboarding + algoritmo + dashboard)
  manifest.json       # Configurazione installazione
  sw.js               # Service Worker (caching offline)
  icon-192.png        # Icona smartphone
  icon-512.png        # Icona grande
  netlify.toml        # Headers sicurezza
  _redirects          # SPA routing
```

---

## Algoritmo di match ottimale

### 1. COP dinamico

Il Coefficiente di Prestazione non e fisso. Viene ricalcolato ogni ora in base a:

```
COP = 3.5 x fattore_temperatura x fattore_umidita x fattore_salto_termico
```

- **Temperatura**: ogni grado sotto i 7C riduce il COP del 3.5%
- **Umidita**: sopra il 70% iniziano i cicli di sbrinamento (-2% ogni 5%)
- **Salto termico**: differenza target-esterno, maggiore = minore COP

### 2. Costo termico reale

| Fonte | Calcolo | Esempio (prezzi attuali) |
|---|---|---|
| Gas | `costo_Smc / (9.6 kWh/Smc x 0.92 rendimento)` | 1.15 EUR/Smc = **0.130 EUR/kWh termico** |
| Pompa | `costo_kWh_elettrico / COP` | 0.28 EUR/kWh, COP 3.5 = **0.080 EUR/kWh termico** |
| Circ | `(gas x 0.75) + (0.04 kWh ventilatore x luce)` | **0.098 EUR/kWh termico** |

### 3. Decisione ora per ora

```
if temp_esterna < 2C:
    -> circ (se split in stanza) o gas
elif 2C <= temp_esterna <= 8C:
    -> confronta gas / pompa / circ, scegli il piu conveniente
    -> se differenza < 5%: ibrido per zone
elif 8C < temp_esterna <= 18C:
    -> pompa (COP ottimale)
elif 18C < temp_esterna <= 24C:
    -> stop (inerzia termica)
elif 24C < temp_esterna <= 30C:
    -> pompa raffrescamento (priorita DRY)
else:
    -> pompa max + tapparelle giu
```

---

## Come usare

### Per l'utente finale

1. Apri l'app su smartphone: `https://ecohybrid.netlify.app`
2. Completa l'onboarding guidato (5 step, ~2 minuti)
3. EcoHybrid calcola il match ottimale per le prossime 24 ore
4. Visualizza il risparmio stimato in EUR e percentuale
5. Installa come app: Chrome/Safari menu -> "Aggiungi a schermata Home"

### Per lo sviluppatore

```bash
# Clona la repo
git clone https://github.com/patriziopz/ecohybrid.git
cd ecohybrid

# Serve locale (qualsiasi server statico)
python3 -m http.server 8000
# oppure
npx serve .

# Apri http://localhost:8000
```

---

## Roadmap

- [x] MVP con algoritmo match ottimale
- [x] Modalita circolazione recupero
- [x] Simulazione 24h con risparmio percentuale
- [x] Onboarding gamificato (barra 0-100%)
- [x] PWA installabile offline
- [ ] Integrazione API Home Assistant (REST)
- [ ] Integrazione SmartThings (OAuth2)
- [ ] Integrazione IFTTT (webhook)
- [ ] Machine learning per inerzia termica e abitudini
- [ ] Confronto offerte luce/gas sul mercato
- [ ] Certificazione risparmio per detrazioni fiscali

---

## Target commerciali

- **Octopus Energy / utility**: licenza API dell'algoritmo di commutazione ibrida
- **Incubatori energetici** (EIT InnoEnergy, Climate-KIC): MVP pronto, problema reale
- **Consumer**: PWA freemium (base gratis, Pro per automazioni avanzate)

---

## Autore

**Patrizio PZ** — ideatore e sviluppatore. Logica degli 8 gradi e circolazione recupero testate e validate in ambiente reale.

---

## License

MIT License — vedi [LICENSE](LICENSE) per dettagli.
