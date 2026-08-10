# EcoHybrid - Proposta per Octopus Energy

## Visione
EcoHybrid e l algoritmo di ottimizzazione termica predittiva che trasforma ogni condizionatore in un sistema intelligente di gestione energetica. Non si limita a controllare la temperatura: ottimizza l intero edificio attraverso 5 pilastri innovativi.

## I 5 Pilastri

### 1. Riciclo Termico Invernale (Destratificazione a costo zero)
In inverno il calore sale e si accumula sotto il soffitto. L algoritmo rileva lo scarto tra temperatura alta e bassa e attiva la modalita FAN (15-20W) per muovere l aria calda verso il basso, senza accendere il compressore.

**Risparmio stimato:** 20-30% sui consumi invernali.

### 2. Meteo Predittivo e Orientamento Camere
L algoritmo conosce l esposizione solare delle stanze (Est, Ovest, Sud). Raffredda preventivamente nelle ore mattutine economiche (fascia F3), sfruttando l inerzia termica per resistere al picco di calore pomeridiano.

**Risparmio stimato:** 15-25% in estate.

### 3. Schermatura Solare Passiva
Quando l algoritmo calcola che il sole sta per colpire una stanza (es. Ovest alle 17:00), comanda la chiusura delle tapparelle motorizzate prima che la temperatura salga. Blocca l effetto serra a costo zero.

**Risparmio stimato:** 10-15% riduzione del carico di raffreddamento.

### 4. Ottimizzazione Riciclo Aria (Qualita vs Calore)
Integrando sensori CO2/VOC, il sistema attiva la ventilazione meccanica (VMC) solo nelle ore piu fresche (notte/primo mattino), garantendo aria salubre senza immettere calore torrido.

**Beneficio:** Comfort e salute senza costo energetico aggiuntivo.

### 5. Geofencing Dinamico
Monitora la distanza dello smartphone dell utente. Quando si allontana, imposta modalita di mantenimento economico (Dry/Eco). Quando si riavvicina (5km), riavvia gradualmente per garantire comfort all arrivo senza picchi di assorbimento.

**Risparmio stimato:** 10-20% sui consumi fuori casa.

## Due Versioni per Due Target

### Versione A: SmartThings/Matter (Mass Market)
- **Target:** Utenti con climatizzatori Samsung, Matter-certified o SmartThings
- **Hardware:** Zero. Solo app.
- **Backend:** Cloud (API SmartThings + Octopus)
- **Monetizzazione:** Abbonamento mensile via Octopus Kraken

### Versione B: Home Assistant + Mini PC (Power User)
- **Target:** Utenti avanzati, case piu grandi, domotica esistente
- **Hardware:** Mini PC (Dell/HP ~100EUR) + Home Assistant OS
- **Backend:** Locale, raccolta dati storica, ML
- **Monetizzazione:** Licenza software + supporto

## Dati Scientifici (Cosa serve a Octopus)

Il Mini PC Dell funge da laboratorio R&D:
1. **Raccolta dati reali** 24/7 su consumi, temperature, umidita
2. **Grafici storici** confronto gestione classica vs EcoHybrid
3. **Proof of Concept** dimostra l efficacia su hardware non-standard (Midea/Ariel)
4. **Smart Grid Integration** risponde in tempo reale alle tariffe dinamiche Octopus

## Proposta Commerciale

**Fase 1 (0-6 mesi):** PoC con Mini PC, raccolta dati, affinamento algoritmo
**Fase 2 (6-12 mesi):** Integrazione API Octopus Kraken, beta test utenti
**Fase 3 (12+ mesi):** Lancio su Intelligent Octopus, partnership commerciale

## Team
- Patrizio PZ - Founder & Product
- [Da definire] - CTO/Backend
- [Da definire] - Hardware/IoT

---
*EcoHybrid - Il cervello termico della tua casa*
