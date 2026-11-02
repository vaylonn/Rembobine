# Proxy HouseFlix

Petit serveur à faire tourner sur le Raspberry Pi, à côté de Radarr, Sonarr et
Jellyfin. Il permet à Rembobine de **télécharger** un film ou une série et de
**regarder** un film, sans rien exposer sur Internet.

```
Ton appareil (sur Tailscale)
  ├─ Rembobine (Vercel) ── délivre un jeton court après connexion
  └─ https://raspberrypi.<tailnet>.ts.net:8443 ── tailscale serve ── proxy :8787
                                                       ├─ Radarr / Sonarr (clés API)
                                                       └─ Jellyfin (lecture directe)
```

- Les serveurs de Vercel ne voient pas le Pi : c'est **ton navigateur** qui
  appelle le proxy. Les boutons n'apparaissent que si l'appareil est sur
  Tailscale.
- Les clés API restent sur le Pi. Le proxy n'accepte que les jetons signés par
  Rembobine avec `HOUSEFLIX_SECRET` (15 min pour l'API, 8 h pour lire un
  fichier précis) et seulement depuis l'origine de Rembobine (CORS).
- Le port 8787 n'est publié que sur `127.0.0.1` : seul `tailscale serve` y
  accède, même ton réseau local ne le voit pas.

## Routes

| Route | Rôle |
|---|---|
| `GET /health` | vérifie que le proxy répond (sans jeton) |
| `GET /status?type=movie&tmdbId=…` | état d'un film : `missing`, `wanted`, `downloading`, `importing`, `available` |
| `GET /status?type=tv&tvdbId=…&tmdbId=…` | état d'une série, avec le nombre d'épisodes téléchargés |
| `POST /request` `{type, tmdbId, tvdbId}` | ajoute à Radarr/Sonarr et lance la recherche (ou la relance) |
| `GET /stream/<id Jellyfin>?t=…` | lecture directe du fichier, avec prise en charge du Range |

## Installation sur le Pi

1. Copie `server.mjs` dans `~/houseflix/proxy/server.mjs`.
2. Ajoute le service au `docker-compose.yml` :

   ```yaml
   houseflix-proxy:
     image: node:22-alpine
     container_name: houseflix-proxy
     command: node /app/server.mjs
     user: "${PUID}:${PGID}"
     read_only: true
     environment:
       - HOUSEFLIX_SECRET=${HOUSEFLIX_SECRET}
       - ALLOWED_ORIGINS=${REMBOBINE_ORIGIN}
       - RADARR_API_KEY=${RADARR_API_KEY}
       - SONARR_API_KEY=${SONARR_API_KEY}
       - JELLYFIN_API_KEY=${JELLYFIN_API_KEY}
       - JELLYFIN_PUBLIC_URL=${JELLYFIN_PUBLIC_URL}
     volumes:
       - ./proxy/server.mjs:/app/server.mjs:ro
     ports:
       - 127.0.0.1:8787:8787
     restart: unless-stopped
   ```

3. Dans `.env` :

   | Variable | Valeur |
   |---|---|
   | `HOUSEFLIX_SECRET` | `openssl rand -base64 32`, **la même** que dans Vercel |
   | `REMBOBINE_ORIGIN` | l'URL de Rembobine, ex. `https://rembobine.vercel.app` (sans `/` final) |
   | `RADARR_API_KEY` | Radarr → Settings → General → API Key |
   | `SONARR_API_KEY` | Sonarr → Settings → General → API Key |
   | `JELLYFIN_API_KEY` | Jellyfin → Tableau de bord → Clés API → `+` |
   | `JELLYFIN_PUBLIC_URL` | ex. `https://raspberrypi.<tailnet>.ts.net` (pour le lien « Ouvrir dans Jellyfin ») |

   Optionnel : `RADARR_QUALITY_PROFILE` / `SONARR_QUALITY_PROFILE` (nom du profil
   à utiliser, sinon le premier). Le dossier racine utilisé est le premier
   configuré dans Radarr/Sonarr.

4. Lance et publie en HTTPS sur Tailscale uniquement (Rembobine est en HTTPS,
   le navigateur refuse d'appeler du HTTP) :

   ```bash
   docker compose up -d houseflix-proxy
   sudo tailscale serve --bg --https=8443 http://127.0.0.1:8787
   curl https://raspberrypi.<tailnet>.ts.net:8443/health   # {"ok":true}
   ```

   Il faut que HTTPS soit activé dans la console Tailscale (DNS → HTTPS
   Certificates). N'utilise **pas** `tailscale funnel`, qui rendrait le proxy
   public.

5. Dans Vercel, ajoute `HOUSEFLIX_URL=https://raspberrypi.<tailnet>.ts.net:8443`
   et `HOUSEFLIX_SECRET`, puis redéploie.

## Bon à savoir

- **Lecture** : le proxy sert le fichier tel quel (pas de transcodage, trop
  lourd pour un Pi 4). Un `.mp4` en H.264 se lit partout ; un `.mkv` passe mal
  dans les navigateurs, utilise alors « Ouvrir dans Jellyfin ». Dans Radarr,
  tu peux préférer le MP4 avec un format personnalisé.
- **Séries** : Rembobine ajoute la série à Sonarr et suit les épisodes
  téléchargés ; la lecture épisode par épisode se fait dans Jellyfin.
- **Chrome** peut demander d'autoriser l'accès au réseau local la première
  fois (le Pi a une adresse Tailscale privée) : accepte.
