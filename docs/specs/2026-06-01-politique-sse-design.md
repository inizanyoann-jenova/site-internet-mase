# Spec — Outil « Politique SSE » (Package MASE)

Date : 2026-06-01
Statut : design validé, en attente de relecture
Projet : `site-internet-mase` (racine du futur site multi-outils MASE)
Premier outil : générateur de Politique Sécurité Santé Environnement

## 1. Objectif

Premier outil du package MASE. Une application web qui :
1. fait remplir à l'entreprise un **diagnostic SWOT + PESTEL orienté SSE** (~20 questions fermées) ;
2. génère à partir des réponses une **Politique SSE personnalisée**, conforme à l'exigence **1.2 du référentiel MASE V2024** ;
3. permet de **télécharger** le document au format **DOCX** (Word), prêt à dater/signer.

Positionnement : l'outil fournit le document nécessaire à l'audit. Il ne promet pas l'obtention du MASE et ne remplace pas la mise en œuvre terrain.

## 2. Périmètre (ce build = MVP « cœur d'abord »)

**Dans le périmètre :**
- Écran d'accueil de l'outil (explication + démarrage).
- Questionnaire diagnostic SWOT + PESTEL SSE, ~20 questions fermées, par étapes.
- Saisie des informations entreprise.
- Moteur de génération déterministe (assemblage de blocs conditionnels par section MASE).
- Aperçu de la politique à l'écran.
- Téléchargement DOCX.

**Hors périmètre (itérations suivantes) :**
- Authentification et paiement (itération 2 : Supabase + Stripe).
- Sauvegarde serveur des réponses / reprise de session.
- Export PDF (suite rapide après le DOCX).
- Pages marketing du site et catalogue multi-outils.
- Les 24 autres outils du package.

## 3. Décisions de conception (validées)

| Sujet | Décision | Raison |
|---|---|---|
| Méthode de génération | **Templates déterministes** (assemblage de blocs conditionnels) | Conformité garantie et reproductible ; pas de coût ni de risque LLM sur un doc d'audit |
| Ordre de construction | **Cœur d'abord**, sans login/paiement | La qualité de génération est le vrai inconnu ; la plomberie auth/paiement est générique et viendra ensuite |
| Format de sortie | **DOCX** (PDF en suite rapide) | La politique est un document vivant : daté, signé, logo, révisé périodiquement → besoin d'éditabilité |
| Ampleur du diagnostic | **Moyen, ~15-25 questions** | Couvre SWOT (4) + PESTEL (6) sans provoquer l'abandon |
| Architecture de génération | **Assemblage de blocs conditionnels par section** (approche 2) | Différenciateur (politique adaptée) sans la sur-ingénierie d'un moteur de règles pondéré |
| Stack | React 19 + Vite + Tailwind 4 + TypeScript + lib `docx` + Vitest | Aligné sur le projet existant `qhse-dashboard2` (terrain connu) ; génération DOCX 100% navigateur |

## 4. Flux utilisateur

```
1. Accueil (explication + bouton « Démarrer le diagnostic »)
2. Questionnaire diagnostic (SWOT + PESTEL SSE, ~20 questions fermées, par étapes)
3. Infos entreprise (nom, secteur, effectif, activités, nom de l'employeur)
4. Génération (assemblage de blocs conditionnels)
5. Aperçu de la politique à l'écran
6. Téléchargement DOCX (prêt à dater/signer)
```

Tout l'état vit côté client. Pas de compte, pas de persistance serveur pour ce build. Fermer l'onglet = recommencer (acceptable pour un remplissage de quelques minutes).

## 5. Le diagnostic

Deux volets, ~20 questions, **toutes fermées** (choix / échelles) pour permettre le mapping déterministe. Quelques champs texte libres optionnels pour enrichir (ex. activités spécifiques) — non utilisés pour la sélection de blocs, seulement comme variables d'injection.

**Volet SWOT — SSE (~8 questions)** : Forces / Faiblesses / Opportunités / Menaces en matière SSE.
**Volet PESTEL — SSE (~12 questions)** : Politique-réglementaire / Économique / Socioculturel / Technologique / Environnemental / Légal, sous l'angle SSE.

**Exploitation des réponses :**
- Chaque réponse incrémente des **indicateurs internes** par domaine (Sécurité / Santé / Environnement) et par thème (formation, sous-traitance, culture, équipements, réglementation…), plus un **niveau de maturité** global.
- **Faiblesses + menaces** → déclenchent des **engagements prioritaires explicites** dans la politique.
- **Forces + opportunités** → orientent le **ton** (entreprise mature vs en structuration).

## 6. Structure de la politique générée (DOCX)

Chaque section est calée sur l'exigence 1.2 V2024 ; le point d'audit couvert est indiqué.

1. **En-tête** — Titre « Politique Sécurité Santé Environnement », nom de l'entreprise, emplacement logo.
2. **Préambule / engagement de l'employeur** — contextualisé par le diagnostic (taille, secteur, activités). *[adaptée à la taille et nature des activités]*
3. **Principes essentiels SSE** — les 6 principes du référentiel (identifier/prévenir les risques ; personnels formés/aptes/habilités ; limiter l'intérim ; sous-traitants de niveau équivalent ; veille et application réglementaire ; amélioration continue), formulés et pondérés selon le diagnostic. *[1.2.1]*
4. **Engagements par domaine** — trois sous-blocs obligatoires : **Sécurité**, **Santé**, **Environnement**, adaptés au profil. *[1.2.4 / 1.2.5 / 1.2.6]*
5. **Axes prioritaires** — liste générée à partir des faiblesses + menaces les plus fortes (bloc le plus personnalisé).
6. **Démarche d'amélioration continue** — engagement de révision périodique. *[cohérent avec « revue périodiquement »]*
7. **Diffusion** — mention de diffusion à tous les acteurs (organique + temporaire). *[1.2.3]*
8. **Date + signature** — emplacements datés/signés par l'employeur, préremplis avec son nom. *[1.2.2]*

Résultat : un DOCX qui couvre mécaniquement les 6 points d'évaluation 1.2, tout en variant son contenu (sections 2, 4, 5 surtout) selon le diagnostic.

## 7. Moteur de génération (unités isolées et testables)

| Unité | Fichier | Rôle | Nature |
|---|---|---|---|
| Config questionnaire | `engine/questionnaire.ts` | Définit les ~20 questions : id, volet, thème, domaine, choix → poids | Données |
| Calcul indicateurs | `engine/indicators.ts` | `computeIndicators(answers)` → scores par domaine/thème + maturité | Fonction pure (testée) |
| Bibliothèque de blocs | `engine/blocks.ts` | Blocs de texte : id, section MASE, condition (expression sur indicateurs), variante de ton, texte avec `{{variables}}` | Données (= le contenu qualitatif) |
| Sélection des blocs | `engine/selectBlocks.ts` | `selectBlocks(indicators)` → blocs obligatoires + conditionnels + axes prioritaires, ordonnés | Fonction pure (testée) |
| Rendu DOCX | `engine/renderDocx.ts` | Assemble blocs + infos entreprise → document Word → téléchargement | Lib `docx` |

Principe : **contenu séparé de la logique**. Les textes (`blocks.ts`) évoluent sans toucher au moteur. Chaque fonction pure se teste seule (ex. vérifier qu'un profil « faible en formation » produit l'engagement formation, sans ouvrir Word).

## 8. Stack & arborescence

Stack : **React 19 + Vite + Tailwind 4 + TypeScript**, lucide-react (icônes), **`docx`** (génération Word navigateur), **Vitest** (tests des fonctions pures). Aucun backend.

```
site-internet-mase/                 (racine du site, git)
  docs/specs/2026-06-01-politique-sse-design.md
  index.html
  package.json
  src/
    main.tsx
    App.tsx                         orchestration des étapes
    components/
      Welcome.tsx                   écran d'accueil
      Questionnaire.tsx             diagnostic par étapes
      CompanyInfo.tsx               infos entreprise
      PolicyPreview.tsx             aperçu + téléchargement
    engine/
      types.ts
      questionnaire.ts
      indicators.ts
      blocks.ts
      selectBlocks.ts
      renderDocx.ts
    engine/__tests__/
      indicators.test.ts
      selectBlocks.test.ts
```

Note d'évolution : pour ce MVP, l'application du générateur de politique occupe la racine du projet. À l'arrivée du **2e outil**, on introduira une organisation multi-outils (pages d'explication + catalogue + outils en sous-dossiers). Pas anticipé maintenant (YAGNI).

## 9. Contenu à produire et valider

La qualité du document dépend du **contenu des blocs** (`blocks.ts`) et du **libellé des questions** (`questionnaire.ts`), pas de l'architecture. SEGA rédige une première version ancrée dans le référentiel V2024, en langage SSE professionnel ; **Youn valide/corrige** (œil QHSE) avant de figer. Un bloc qui sonne faux ou plat est réécrit.

## 10. Critères de succès du MVP

- À partir d'un diagnostic rempli, l'outil produit un DOCX couvrant les **6 points d'évaluation 1.2** (principes, daté/signé, diffusion, Sécurité, Santé, Environnement).
- Deux profils d'entreprise différents produisent des politiques **visiblement différentes** (sections préambule, engagements, axes prioritaires).
- Les fonctions `computeIndicators` et `selectBlocks` sont couvertes par des tests unitaires.
- Le document généré est jugé **crédible et professionnel** par Youn (validation contenu).
```
