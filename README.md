# Rembobine

App perso pour suivre les films et séries que tu regardes, avec des
recommandations calculées à partir de ton historique et des tendances du moment.
Pensée pour un seul utilisateur et un déploiement gratuit sur Vercel.

## Fonctionnalités

- **Recherche** de films et séries (TMDB, en français).
- **Suivi** : Vu, En cours, À voir, Abandonné, note sur 10.
- **Historique** : revisionnages datés pour les films (date modifiable), et
  suivi épisode par épisode pour les séries (grille par saison, « +1 épisode »).
- **Ajout rapide** depuis les affiches (À voir, Déjà vu), et « Pas intéressé »
  sur une recommandation pour qu'elle ne revienne plus.
- **Notes au demi-point** (appuie deux fois sur une note) et **avis perso** sur
  chaque titre.
- **Listes perso** (`/listes`) : « À voir avec X », « Films de Noël »…
- **Pages acteur et réalisateur** (`/personne/…`), et sur Découvrir des
  rangées « Parce que tu aimes … » pour les personnes qui reviennent dans tes
  titres préférés.
- **Stats et bilan annuel** (`/stats`) : temps passé, films, épisodes, notes,
  genres, mois par mois, et le meilleur de chaque année.
- **Installable sur mobile** (PWA) : depuis le navigateur, « Ajouter à l'écran
  d'accueil » donne une icône et un affichage plein écran.
- **Fiche** de chaque titre : synopsis, genres, distribution, et où le regarder
  en France (streaming, location, achat).
- **Recommandations** (`/decouvrir` et page d'accueil) qui combinent :
  - les recommandations TMDB de tes titres les mieux notés, pondérées par ta note ;
  - ton profil de genres calculé sur toute ta bibliothèque (les titres mal notés
    ou abandonnés font baisser leurs genres) ;
  - un bonus pour ce qui est en tendance cette semaine.

  Les titres déjà dans ta bibliothèque sont exclus. La logique est dans
  `src/lib/scoring.ts`.
- **À suivre** (`/a-suivre`) : les épisodes sortis que tu n'as pas encore vus
  pour tes séries en cours, les prochaines sorties, et les séries terminées qui
  ont repris.
- **Bibliothèque** filtrable par type et statut, avec recherche, tri, pagination
  et quelques statistiques.
- Accès protégé par un **mot de passe unique**, avec blocage temporaire après
  5 essais ratés depuis une même adresse (30 au total) en 15 minutes.

## Stack

Next.js 16 (App Router, Server Actions) · Tailwind CSS 4 · Postgres (Neon) via
Drizzle ORM · API TMDB.

## Déployer sur Vercel

1. **Clé TMDB** : crée un compte sur [themoviedb.org](https://www.themoviedb.org),
   puis dans *Paramètres → API*, récupère le **jeton d'accès en lecture (v4)**.
2. **Projet Vercel** : importe ce dépôt depuis le tableau de bord Vercel.
3. **Base de données** : dans le projet Vercel, onglet *Storage*, ajoute une base
   **Neon** (offre gratuite). Vercel crée automatiquement `DATABASE_URL`
   (ou `NEON_DATABASE_URL` si l'intégration ajoute un préfixe : les deux marchent).
4. **Variables d'environnement** (*Settings → Environment Variables*) :

   | Variable | Valeur |
   | --- | --- |
   | `TMDB_API_TOKEN` | le jeton v4 de l'étape 1 |
   | `APP_PASSWORD` | le mot de passe de ton choix |
   | `SESSION_SECRET` | 32 caractères aléatoires ou plus (`openssl rand -base64 32`) |

5. **Redéploie**. Les migrations de la base s'appliquent toutes seules pendant le
   build (`scripts/migrate.mjs`).

## En local

```bash
cp .env.example .env.local   # puis remplis les valeurs
npm install
npm run db:migrate           # crée les tables
npm run dev
```

Après une modification de `src/lib/schema.ts`, génère une migration avec
`npm run db:generate` et commite le dossier `drizzle/`.

---

Données fournies par [TMDB](https://www.themoviedb.org). Ce produit utilise
l'API TMDB sans être approuvé ni certifié par TMDB.
