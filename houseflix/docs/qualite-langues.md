# 🎚️ Qualité, langues et sous-titres

## Profils de qualité (Sonarr et Radarr)

| Profil | Qualités autorisées | Objectif (cutoff) | Usage |
|---|---|---|---|
| **HD-1080p** (défaut) | HDTV, WEBRip, WEB-DL, Bluray en 720p et 1080p | Bluray-1080p | tout, par défaut |
| **4K** | WEB-DL, WEBRip, Bluray 2160p (sans Remux) | Bluray-2160p | à choisir à la demande |

- Pas de **Remux** (copies brutes de 20 à 60 Go).
- **Upgrades** actifs : un fichier est remplacé par une meilleure version jusqu'à atteindre l'objectif.
- **4K** : dans Seerr → *Request* → options avancées (⚙️) → profil `4K`. Un film 4K pèse 15 à 60 Go et le Pi ne peut pas le transcoder : à lire sur un appareil compatible (Android TV, Apple TV 4K avec Infuse/Swiftfin…).

## Langue : MULTi > VO > VF

Depuis Sonarr v4 / Radarr récents, la langue se règle par des **Custom Formats** : chaque release reçoit un score selon son nom, et la plus haute l'emporte.

| Custom Format | Regex (insensible à la casse) | Score |
|---|---|---|
| MULTi | `\bMULTi(?:[-. ]?(?:VFF\|VF2\|VFQ\|VFI\|TRUEFRENCH))?\b` | **+100** |
| VOSTFR | `\b(VOSTFR\|SUBFRENCH)\b` | **+50** |
| *(VO, aucun tag FR)* | — | 0 |
| VFF / TRUEFRENCH | `\b(VFF\|TRUEFRENCH\|VF2\|VFI)\b` | −20 |
| FRENCH | `\bFRENCH\b` | −30 |
| VFQ | `\bVFQ\b` | −40 |

- **Score minimum : −100** → la VF reste acceptée en dernier recours.
- **Upgrade jusqu'à 100** → si tu as une VO ou une VF et qu'une MULTi sort, elle la remplace automatiquement.
- Mêmes formats et scores dans les deux profils et dans les deux applis.
- Dans Radarr, la langue du profil est sur *Any* pour laisser les Custom Formats décider.

Pour changer l'ordre (par ex. VF > VO) : *Settings → Profiles → <profil>* et ajuste les scores. Pour tester une release : *Settings → Custom Formats* ou l'outil *Test Parsing* de Sonarr.

## Sous-titres : Bazarr

- Relié à Sonarr (`sonarr:8989`) et Radarr (`radarr:7878`).
- Profil de langue **Français** appliqué par défaut à toutes les séries et tous les films, actuels et futurs.
- Fournisseurs sans compte : Podnapisi, Gestdown (Addic7ed), YIFY Subtitles, TVsubtitles, plus la détection des sous-titres intégrés aux fichiers.
- Pour plus de résultats : crée un compte gratuit sur **OpenSubtitles.com** et ajoute-le dans *Bazarr → Settings → Providers*.

## Côté lecture (Jellyfin)

- *Ton profil → Lecture* : langue audio préférée.
- *Ton profil → Sous-titres* : **Français**, mode **Toujours** (puisque la VO passe avant la VF) ou **Intelligent** (affichés seulement si l'audio n'est pas en français).
- Qualité de lecture dans les applis : **Maximum / Original**.
