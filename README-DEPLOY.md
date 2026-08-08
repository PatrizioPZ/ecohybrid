# EcoHybrid - Deploy su Netlify

## File nella cartella
- `index.html` - PWA completa con algoritmo match ottimale + circolazione recupero
- `manifest.json` - Configurazione PWA
- `sw.js` - Service Worker per offline
- `netlify.toml` - Configurazione Netlify (headers, sicurezza)
- `_redirects` - Redirect SPA (tutte le rotte -> index.html)

## Come deployare su Netlify (2 modi)

### Metodo 1: Drag & Drop (piu rapido, 2 minuti)
1. Vai su https://app.netlify.com/drop
2. Trascina questa cartella intera nella pagina
3. Netlify genera automaticamente un URL HTTPS (es. https://ecohybrid-abc123.netlify.app)
4. Pronto!

### Metodo 2: GitHub + Netlify (piu professionale, CI/CD)
1. Crea una repo su GitHub (es. `patriziopz/ecohybrid`)
2. Carica questi file nella repo
3. Vai su https://app.netlify.com
4. "Add new site" -> "Import an existing project" -> seleziona la repo GitHub
5. Build command: lascia vuoto (sito statico)
6. Publish directory: `.` (punto)
7. Deploy!
8. Ogni push su GitHub aggiorna automaticamente il sito

## Icone PWA (da aggiungere)
Per completare la PWA servono due icone PNG:
- `icon-192.png` (192x192 pixel)
- `icon-512.png` (512x512 pixel)

Puoi generarle gratis su:
- https://favicon.io/favicon-generator/
- https://www.pwabuilder.com/imageGenerator

## Test dopo deploy
1. Apri l URL su smartphone
2. Chrome/Safari -> "Aggiungi a schermata Home"
3. Chiudi internet -> l app funziona offline
4. Verifica la barra verde (theme-color) nella barra del browser

## API esterne usate
- Open-Meteo (meteo gratuito, no API key): https://open-meteo.com
- Geolocalizzazione browser (GPS)
- Lucide Icons (CDN): https://lucide.dev

## Note
- Zero backend richiesto
- Zero costi (Netlify free tier)
- HTTPS automatico
- CDN globale incluso
