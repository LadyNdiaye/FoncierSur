# Espace Notaire : mise en conformité avec la maquette

Fichiers (dans `frontend/src/`) : `App.tsx` et `pages/Notaire/` : `api.ts`, `Header.tsx`, `Dashboard.tsx`,
`CertifierParcelle.tsx`, `Archive.tsx`, `StatutBadge.tsx` (nouveau), `notaire.css`.

- `USE_MOCK = true` dans `api.ts` : tout fonctionne sans backend, avec des données au format réel.
  REF-2026-017 a volontairement une empreinte différente sur la blockchain, pour voir l'alerte.
- Vraie API : `USE_MOCK = false`, et `VITE_API_URL=http://localhost:5000/api` dans `frontend/.env`.
  Elle demande le backend final et la route `GET /api/blockchain/parcelles/:id` (dossier backend du zip n°5).
