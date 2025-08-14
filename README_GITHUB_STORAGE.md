# drphonenord — Pack GitHub Storage

Ce pack place les fonctions Netlify à la racine et utilise **GitHub** comme stockage JSON (pas besoin de Netlify Blobs).

## Dossiers
- `netlify/functions/tickets.js` : endpoint unique pour l'admin
  - `GET /.netlify/functions/tickets?open=1&q=iphone`
  - `POST /.netlify/functions/tickets` (headers: `x-admin-token: ADMIN_TOKEN`)
- `netlify/functions/track-ticket.js` : suivi public par `id` + 4 derniers chiffres du tel.

## Variables d'environnement (Netlify → Environment variables)
Mettre la **même valeur** pour *Production*, *Deploy Previews* et *Branch deploys* :
- `ADMIN_TOKEN` : mot de passe admin
- `GH_TOKEN` : token GitHub (scope "Contents: Read and write" sur le repo)
- `GH_OWNER` : utilisateur/organisation GitHub (ex: dawsonjesus)
- `GH_REPO` : nom du repo (ex: drphonenord)
- `GH_BRANCH` : `main`
- `GH_PATH_TICKETS` : `data/tickets.json` (sera créé automatiquement au 1er POST)

## netlify.toml
Inclus à la racine, avec:
```
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

## Déploiement
1. Dézipper ce pack à la **racine** de votre repo local.
2. `git add . && git commit -m "pack: functions root + github storage" && git push`
3. Netlify va builder et exposer les fonctions.

## Test rapide
- `GET https://votre-site.netlify.app/.netlify/functions/tickets?open=1`
- Dans l’admin, Enregistrer → vous devriez voir un **commit** créer/mettre à jour `data/tickets.json`.
- Page public `suivi.html`: utilise `track-ticket?id=XXX&phone=1234`.
