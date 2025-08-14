# Dr Phone — Repo Starter (v23.1)

Ce dossier est **prêt à être poussé sur GitHub**, puis **Import from Git** dans Netlify.
Il inclut : pages du site, `netlify/functions/tickets.js` (suivi), `netlify.toml` (config), scripts logos.

## Étapes ultra simples

### 1) GitHub
- Crée un repo vide (ex. `drphone-site`).
- **Upload tous les fichiers** de ce dossier (la racine doit contenir `index.html` et le dossier `netlify/`).

### 2) Netlify
- **Add new site → Import from Git → GitHub → choisis le repo `drphone-site`.**
- Laisse tout par défaut, clique **Deploy**.
- Quand c'est en ligne, va dans **Project configuration → Environment variables → Add variable** :
  - Name: `ADMIN_TOKEN`
  - Value: (ta clé secrète, ex. `Nord-59200!`)
- Sauvegarde, puis **Deploy site** (si proposé).

### 3) Vérifier
- Ouvre `https://TON-SITE.netlify.app/.netlify/functions/tickets` → tu dois voir du JSON.
- Ouvre `https://TON-SITE.netlify.app/admin.html` :
  - Colle **exactement** la valeur `ADMIN_TOKEN` dans “Clé admin” → **Enregistrer**.
  - Clique **Nouveau code** → ça génère `DRP-AAAA-XXX` + ouvre `ticket.html?code=...` (imprimable).

### 4) Client
- Donne au client le lien `https://TON-SITE.netlify.app/suivi.html#DRP-AAAA-XXX`.
- Chaque mise à jour dans **admin** apparaît chez lui en temps réel.

> Note : Les **Functions Netlify** ne marchent **pas** avec le déploiement “Drop”. Il faut **Import from Git** (ou la CLI).
