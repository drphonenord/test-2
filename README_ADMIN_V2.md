# Admin v2 — Dr Phone (Netlify Blobs)

Ce pack remplace/modernise l'admin. À déposer **tel quel** dans votre site (dossier `admin`) + fonctions Netlify.

## Installation rapide (Netlify + GitHub)
1. Ajoutez les fichiers du dossier `admin/` à la racine de votre site, sous `/admin`.
2. Ajoutez le dossier `netlify/functions/` au repo (build auto sur Netlify).
3. Assurez-vous que `netlify.toml` contient :
   ```toml
   [functions]
     directory = "netlify/functions"
     node_bundler = "esbuild"
   ```
4. Dans Netlify → *Site settings → Environment variables*, créez `ADMIN_TOKEN` (même valeur pour Production/Previews).
5. Déployez, puis ouvrez `/admin/`.
6. Collez votre token dans le champ **Token admin** (il sera mémorisé en local).

## Datasets (namespaces)
- `clients`, `repairs`, `orders`, `tickets`, `prices`, `states`, `config`, `history`
- Clé par défaut : `all` (mais vous pouvez créer d'autres clés : `2025-08`, `paris`, etc.)

## API (interne)
- GET `/.netlify/functions/get-blob?ns=<namespace>&key=<key>`
- POST `/.netlify/functions/set-blob` body: `{ ns, key, data }`
Headers : `x-admin-token: <ADMIN_TOKEN>`

## Notes
- CORS ouvert sur `*` (OK pour interface même si hébergée sur le même domaine).
- Pas de base de données : tout est stocké en JSON (Netlify Blobs). 
- Pensez aux sauvegardes régulières : exportez vos JSON (copier/coller).
