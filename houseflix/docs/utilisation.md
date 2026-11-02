# 📱 Utilisation au quotidien

## 0. Une seule fois : installer les applis

Sur le téléphone :

1. **Tailscale** (App Store / Play Store) → connecte-toi avec le même compte que le Pi. C'est ce qui te donne accès à HouseFlix hors de chez toi.
2. **Streamyfin** (iOS et Android, gratuit, open source) → l'appli recommandée : lecture, **téléchargement hors ligne** et demandes Seerr intégrées.
   - Alternatives : **Jellyfin** (officielle), **Findroid** (Android, très bon hors ligne), **Swiftfin** ou **Infuse** (iOS, lisent plus de formats).
3. Dans Streamyfin : serveur `http://raspberrypi:8096`, puis ton compte Jellyfin.

> À la maison, `http://192.168.1.50:8096` marche aussi sans Tailscale. Avec Tailscale allumé, `raspberrypi` marche partout : le plus simple est de le laisser allumé.

Si le nom court `raspberrypi` ne répond pas, utilise le nom complet `raspberrypi.<ton-tailnet>.ts.net` (visible dans l'appli Tailscale) ou l'IP Tailscale `100.x.y.z` du Pi.

## 1. Chercher et demander un film ou une série

**Option A, dans Streamyfin** : onglet de recherche → active la recherche Seerr dans les réglages de l'appli (*Paramètres → Plugins → Jellyseerr/Seerr*, adresse `http://raspberrypi:5055`) → tu vois les titres absents de ta bibliothèque avec un bouton **Request**.

**Option B, Seerr dans le navigateur** :

1. Ouvre `http://raspberrypi:5055`, connecte-toi avec ton compte Jellyfin.
2. Ajoute la page à l'écran d'accueil (Safari : Partager → *Sur l'écran d'accueil* ; Chrome : ⋮ → *Ajouter à l'écran d'accueil*). Elle s'ouvre alors comme une appli.
3. Cherche un titre → **Request**.
   - Série : choisis les saisons voulues.
   - **4K** : ouvre les options avancées (⚙️) dans la fenêtre de demande et choisis le profil `4K` (réservé aux appareils qui lisent la 4K directement, voir plus bas).

Ensuite tout est automatique :

```
Request → Sonarr/Radarr → Prowlarr cherche (via VPN) → qBittorrent télécharge (via VPN)
       → rangé dans la bibliothèque → Bazarr ajoute les sous-titres FR → visible dans Jellyfin
```

Compte de quelques minutes à quelques heures selon la disponibilité. Seerr affiche le statut (*Demandé → En cours → Disponible*).

## 2. Regarder

Ouvre Streamyfin (ou Jellyfin) → bibliothèques **Films** et **Séries** → lecture.

Réglages conseillés dans l'appli :

- **Qualité de lecture : Maximum / Original.** Le Pi 4 ne sait pas convertir une vidéo à la volée ; s'il doit transcoder, ça saccade.
- **Langue audio** : Jellyfin → ton profil → *Lecture*.
- **Sous-titres** : Jellyfin → ton profil → *Sous-titres* → Français. Comme les releases sont souvent en VO, le mode **Toujours** ou **Intelligent** est pratique.

À distance, la qualité dépend du **débit montant** de ta box : fibre = OK en 1080p, ADSL = juste.

## 3. Télécharger pour regarder hors ligne

Dans **Streamyfin** :

1. Ouvre le film ou l'épisode (ou la saison entière).
2. Appuie sur l'icône **⬇ Télécharger**.
3. Retrouve-le dans l'onglet **Téléchargements**, lisible sans réseau (avion, métro…).

À savoir :

- Le fichier est copié **tel quel**, sans conversion : compte **1 à 4 Go** par épisode ou film en 1080p. Fais-le en Wi-Fi.
- Le téléchargement passe par Tailscale : il marche aussi hors de chez toi, au débit montant de ta box.
- Si le bouton n'apparaît pas : Jellyfin → *Tableau de bord → Utilisateurs → ton compte* → coche **Autoriser le téléchargement de médias**.
- Findroid (Android) et Infuse (iOS, version Pro) savent aussi télécharger.

## 4. Sur la télé

| Appareil | Appli | Remarque |
|---|---|---|
| Android TV / Google TV / Chromecast Google TV / Fire TV | Jellyfin for Android TV | le meilleur choix, gère presque tous les formats |
| Apple TV | Swiftfin (gratuit) ou Infuse | Infuse lit tout, y compris 4K HDR |
| TV LG (webOS) | Jellyfin (LG Content Store) | |
| TV Samsung (Tizen) | pas d'appli officielle | brancher une clé Fire TV / Chromecast (~30-40 €) |

À la maison : adresse `http://192.168.1.50:8096`, pas besoin de Tailscale.
Ailleurs (chez des amis, en vacances) : il faut Tailscale sur l'appareil → Android TV, Apple TV ou Fire TV uniquement. Le cast depuis le téléphone ne marche pas hors de chez toi (la TV ne voit pas le Pi).

## 5. Partager avec la famille / des amis

1. Jellyfin → *Tableau de bord → Utilisateurs* → crée un compte par personne.
2. Seerr → *Settings → Users → Import Jellyfin Users* pour qu'ils puissent faire leurs demandes (tu peux limiter le nombre de demandes ou exiger ton approbation).
3. Pour l'accès distant, invite-les dans ton tailnet ou partage uniquement le Pi : <https://login.tailscale.com/admin/machines> → *Share*.

## Les adresses

| | Chez toi | Partout (Tailscale) |
|---|---|---|
| Jellyfin | http://192.168.1.50:8096 | http://raspberrypi:8096 |
| Seerr | http://192.168.1.50:5055 | http://raspberrypi:5055 |
| Sonarr | http://192.168.1.50:8989 | http://raspberrypi:8989 |
| Radarr | http://192.168.1.50:7878 | http://raspberrypi:7878 |
| Prowlarr | http://192.168.1.50:9696 | http://raspberrypi:9696 |
| qBittorrent | http://192.168.1.50:8080 | http://raspberrypi:8080 |
| Bazarr | http://192.168.1.50:6767 | http://raspberrypi:6767 |
