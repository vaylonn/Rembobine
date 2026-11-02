# 🚀 Réinstaller de zéro

Pour remonter HouseFlix sur un Pi neuf (ou après une carte SD morte).

## 1. Système

1. Raspberry Pi Imager → **Raspberry Pi OS Lite 64 bits**, SSH activé avec ta clé publique, utilisateur `val`.
2. Vérifier : `uname -m` → `aarch64`.
3. Mises à jour et outils :

```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y unattended-upgrades fail2ban ufw tmux
sudo dpkg-reconfigure -plow unattended-upgrades
```

4. Appliquer la config SSH, fail2ban et ufw décrite dans [securite.md](securite.md).

## 2. Disque

```bash
lsblk                                               # repérer le disque (ex. sda) ⚠️ la suite efface tout
sudo parted /dev/sda --script mklabel gpt mkpart media ext4 0% 100%
sudo mkfs.ext4 -L media -m 0 /dev/sda1
sudo blkid /dev/sda1                                # noter l'UUID
echo 'UUID=<uuid>  /mnt/media  ext4  defaults,noatime,nofail  0  2' | sudo tee -a /etc/fstab
sudo mkdir -p /mnt/media && sudo systemctl daemon-reload && sudo mount -a
sudo mkdir -p /mnt/media/data/{torrents/{movies,tv},media/{movies,tv}}
sudo chown -R val:val /mnt/media/data
```

## 3. Docker et Tailscale

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker val          # puis se reconnecter

# Tailscale, depuis son dépôt apt officiel : https://tailscale.com/download/linux
sudo tailscale up                    # ouvrir le lien affiché pour valider
```

Dans la console Tailscale : **Disable key expiry** sur le Pi.

## 4. La stack

```bash
mkdir -p ~/houseflix && cd ~/houseflix
# copier docker-compose.yml et .env.example de ce dossier
cp .env.example .env && chmod 600 .env
nano .env                            # clé WireGuard Mullvad, VPN_HOSTNAMES…
mkdir -p config/{gluetun,qbittorrent,prowlarr,sonarr,radarr,jellyfin,seerr,bazarr}
docker compose up -d
docker exec gluetun wget -qO- https://am.i.mullvad.net/connected
```

Config WireGuard : <https://mullvad.net/fr/account/wireguard-config> → Linux → copier `PrivateKey` et l'adresse IPv4 de `Address`. Ne jamais versionner `.env`.

Si une sauvegarde de `config/` existe, la restaurer **avant** `docker compose up -d` : toutes les applis reviennent configurées.

## 5. Configuration des applis (si pas de sauvegarde)

1. **qBittorrent** (`:8080`, mot de passe temporaire dans `docker logs qbittorrent`) : changer le mot de passe ; *Avancé → Interface réseau* `tun0` ; UPnP off ; chemin `/data/torrents` ; catégories `tv` → `/data/torrents/tv`, `movies` → `/data/torrents/movies` ; contourner l'authentification pour `172.16.0.0/12`.
2. **Sonarr / Radarr** : authentification *Forms* ; dossier racine `/data/media/tv` / `/data/media/movies` ; client qBittorrent `gluetun:8080`, catégorie `tv` / `movies` ; hardlinks ; Custom Formats et profils de [qualite-langues.md](qualite-langues.md).
3. **Prowlarr** : authentification ; *Settings → Apps* : Sonarr `http://sonarr:8989`, Radarr `http://radarr:7878`, Prowlarr Server `http://gluetun:9696` ; ajouter les indexeurs.
4. **Jellyfin** : compte admin ; bibliothèques Séries `/data/media/tv`, Films `/data/media/movies`.
5. **Seerr** : se connecter avec Jellyfin (hôte `jellyfin`, port `8096`) ; URL externe `http://raspberrypi:8096` ; ajouter Sonarr et Radarr (profil `HD-1080p` par défaut).
6. **Bazarr** : authentification ; Sonarr/Radarr ; profil de langue Français par défaut ; fournisseurs.
7. Box : réserver l'IP du Pi, vérifier qu'aucun port n'est redirigé et que l'UPnP est coupé.
