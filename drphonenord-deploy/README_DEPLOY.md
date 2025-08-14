# Dr Phone Nord — Build déployable

Ce dossier contient votre site prêt à être déployé.

## Déploiement (Netlify)

1. Connectez-vous sur Netlify → **Add new site** → **Deploy manually**.
2. Glissez-déposez l’archive ZIP `drphonenord-deploy.zip` (ou le dossier décompressé).
3. (Optionnel) Dans *Site settings → Build & Deploy → Environment*, ajoutez `ADMIN_TOKEN` si vous utilisez l’ERP admin.
4. Vérifiez que `netlify.toml` et le fichier `_redirects` sont bien détectés (routing/404).

## Déploiement (GitHub Pages)

1. Créez un repo, uploadez **tout le contenu** de ce dossier à la racine.
2. Dans *Settings → Pages*, choisissez le branch `main` et `/root`.
3. Si certaines pages ne se résolvent pas, vérifiez les chemins absolus (`/...`) vs relatifs (`./...`).

## Structure

- `index.html` + toutes vos pages
- `/admin` : copies des pages d’admin + `admin/style.css` & `admin/erp.js`
- `/villes` : alias des pages Cambrai/Douai/Lille/Valenciennes (pour les liens du menu)
- `reprise.html` : alias vers `reprise-2.html` (ou `rachat.html`) pour éviter la 404
- `_redirects` et `netlify.toml` : configuration Netlify
- `manifest.webmanifest`, `service-worker.js` (si fourni)

## Notes

- Si une ressource est appelée avec un chemin absolu `/admin/...`, elle existe maintenant.
- Si vous utilisez Netlify Blobs dans l’admin, définissez `ADMIN_TOKEN` côté environnement.
