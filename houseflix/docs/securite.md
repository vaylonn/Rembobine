# 🔒 Réseau et sécurité

## Principes

1. **Rien n'est exposé sur Internet.** Aucune redirection de port sur la box, UPnP désactivé. L'accès distant passe uniquement par Tailscale.
2. **Le trafic torrent ne sort jamais avec l'IP de la maison.** qBittorrent et Prowlarr n'ont pas d'autre réseau que le tunnel Mullvad.
3. **Défense en profondeur** sur l'hôte : pare-feu, SSH par clé, fail2ban, mises à jour automatiques.

## Ce qui est en place

| Couche | Réglage |
|---|---|
| Box | IP réservée pour le Pi (bail DHCP statique), aucun port ouvert, UPnP coupé |
| Pare-feu `ufw` | entrées refusées par défaut ; autorisés : SSH depuis le LAN, tout sur `tailscale0`, `41641/udp` (Tailscale direct) |
| SSH | clé uniquement (`PasswordAuthentication no`, `KbdInteractiveAuthentication no`), root interdit |
| fail2ban | prison `sshd` (backend systemd), LAN et plage Tailscale en liste blanche |
| Mises à jour | `unattended-upgrades` actif (sécurité Debian + Tailscale via son dépôt apt) |
| VPN | Gluetun + Mullvad WireGuard, kill switch testé, DNS chiffré (DoT) |
| qBittorrent | lié à `tun0`, UPnP/NAT-PMP coupé, sans mot de passe uniquement depuis le réseau Docker |
| Applis | authentification par formulaire sur Sonarr, Radarr, Prowlarr, Bazarr ; comptes Jellyfin ; Seerr via Jellyfin |
| Secrets | `.env` en `chmod 600`, jamais versionné ; clé WireGuard jamais affichée |

Fichiers correspondants sur le Pi :

```ini
# /etc/ssh/sshd_config.d/10-hardening.conf
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
```

```ini
# /etc/fail2ban/jail.local
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1 192.168.1.0/24 100.64.0.0/10

[sshd]
enabled = true
backend = systemd
```

```bash
# ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp
sudo ufw allow in on tailscale0
sudo ufw allow 41641/udp
sudo ufw enable
```

## ⚠️ Docker et ufw

Docker écrit ses propres règles iptables : **les ports publiés par Docker contournent ufw**. Les interfaces web (8080, 8096, …) restent donc joignables depuis le LAN, c'est voulu. Elles ne sont pas joignables depuis Internet tant qu'aucun port n'est redirigé sur la box. Ne jamais ouvrir ces ports sur la box.

## Vérifier que tout va bien

```bash
# Le VPN est actif (doit répondre "You are connected to Mullvad")
docker exec gluetun wget -qO- https://am.i.mullvad.net/connected
docker exec qbittorrent curl -s https://am.i.mullvad.net/connected
docker exec prowlarr curl -s https://am.i.mullvad.net/connected

# Kill switch : qBittorrent ne doit plus rien joindre
docker stop gluetun
docker exec qbittorrent curl -s --max-time 5 https://1.1.1.1 || echo "OK : aucune fuite"
docker start gluetun   # autoheal relance qbittorrent et prowlarr en ~3 min

# Pare-feu, SSH, fail2ban
sudo ufw status verbose
sudo sshd -T | grep -E 'passwordauth|permitroot'
sudo fail2ban-client status sshd
```

## Clé SSH : ne pas la perdre

La connexion par mot de passe est désactivée. Sauvegarde la clé privée de ton PC (`C:\Users\<toi>\.ssh\id_ed25519` et `.pub`). Pour ajouter un appareil, génère une clé dessus et ajoute sa partie publique à `~/.ssh/authorized_keys` du Pi depuis un appareil déjà autorisé. En dernier recours : écran + clavier branchés sur le Pi.

## Tailscale

- Désactiver l'expiration de clé du Pi : <https://login.tailscale.com/admin/machines> → `…` → **Disable key expiry** (sinon il sort du tailnet au bout de ~180 jours).
- Pour partager l'accès : *Share* sur la machine, plutôt qu'inviter dans tout le tailnet.
