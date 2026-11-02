# 🛠️ Entretien, sauvegardes et dépannage

## Se connecter au Pi

```bash
ssh val@192.168.1.50      # à la maison
ssh val@raspberrypi       # partout, via Tailscale
cd ~/houseflix
```

## Commandes utiles

```bash
docker compose ps                     # état des conteneurs (gluetun, qbittorrent, prowlarr doivent être "healthy")
docker compose logs -f --tail 50 sonarr
docker compose restart jellyfin
df -h /mnt/media                      # place restante sur le disque
vcgencmd get_throttled                # 0x0 = alimentation OK
```

## Mettre à jour (1 fois par mois)

```bash
cd ~/houseflix
docker compose pull
docker compose up -d                  # recrée les conteneurs mis à jour et reconnecte tout proprement
docker image prune -f
```

Le système (Debian, Tailscale) se met à jour seul via `unattended-upgrades`. Un redémarrage est parfois nécessaire après une mise à jour du noyau : `sudo reboot`. Le disque se remonte seul et les conteneurs repartent seuls.

## Sauvegarder

| Quoi | Où | Pourquoi |
|---|---|---|
| `~/houseflix/config/` | carte SD | réglages et bases de toutes les applis |
| `~/houseflix/.env` | carte SD | clé WireGuard, chemins (⚠️ secret) |
| `~/houseflix/docker-compose.yml` | carte SD | définition de la stack |
| clé SSH `id_ed25519` | ton PC | seul moyen d'entrer en SSH |

Exemple, depuis ton PC :

```powershell
scp -r val@192.168.1.50:~/houseflix/config "D:\Backup-HouseFlix\config"
scp val@192.168.1.50:~/houseflix/.env "D:\Backup-HouseFlix\.env"
```

Arrête la stack avant pour une copie cohérente des bases (`docker compose stop`, puis `docker compose start`).

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Rien ne télécharge, qBittorrent injoignable | gluetun redémarré, qBittorrent coupé | attendre 3-4 min (autoheal) ou `docker restart qbittorrent prowlarr` |
| gluetun ne devient pas *healthy* | serveur Mullvad injoignable / clé révoquée | `docker logs gluetun --tail 80` ; changer `VPN_HOSTNAMES` dans `.env` ou régénérer une config WireGuard Mullvad |
| « No indexers available » dans Sonarr/Radarr | Prowlarr pas synchronisé | Prowlarr → *Settings → Apps* → *Sync App Indexers* |
| Un titre reste « demandé » | aucune release trouvée / score trop bas | Sonarr/Radarr → *Wanted* → recherche manuelle (icône 👤) pour voir les releases et leurs scores |
| Lecture qui saccade | transcodage (le Pi ne suit pas) | qualité *Maximum/Original* dans l'appli, appli native plutôt que navigateur, Ethernet plutôt que Wi-Fi |
| `raspberrypi` ne répond pas hors de chez soi | Tailscale éteint sur le téléphone ou clé du Pi expirée | allumer Tailscale ; console Tailscale → *Disable key expiry* |
| Le disque n'est pas monté | débranché au démarrage | rebrancher, `sudo mount -a`, puis `docker compose restart` |
| Disque plein | — | supprimer depuis Sonarr/Radarr (pas à la main) ; vérifier `torrents/` (les hardlinks ne comptent qu'une fois) |

## Rembobine (optionnel)

Le dossier [`houseflix-proxy/`](../../houseflix-proxy/README.md) de ce dépôt contient un petit proxy qui permet à l'appli Rembobine de lancer un téléchargement et de lire un film via Tailscale. Il n'est pas encore déployé sur le Pi ; voir son README pour l'ajouter au compose.
