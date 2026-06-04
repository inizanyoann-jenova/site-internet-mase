# Spec — Matrice de Polyvalence

**Date :** 2026-06-02  
**Tool slug :** `matrice-polyvalence`  
**Route :** `/matrice-polyvalence`  
**Prix :** 29 € (paiement unique, même pattern que Politique SSE)

---

## 1. Vue d'ensemble

Outil interactif React permettant à toute entreprise de construire, maintenir et exporter sa **matrice de polyvalence** (compétences × collaborateurs). Inspiré du prototype HTML `matrice de polyvalence/matrice_DEF.html` — adapté pour être générique et intégré à la plateforme MASE.

L'utilisateur accède à l'outil après paiement Stripe. Ses données sont sauvegardées automatiquement dans Supabase (par user_id). L'outil génère un PDF A4 professionnel exportable à tout moment.

---

## 2. Modèle de données

### Table Supabase : `matrices`

```sql
create table matrices (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  data       jsonb not null,
  updated_at timestamptz default now()
);
-- RLS : chaque utilisateur ne lit/écrit que sa propre ligne
alter table matrices enable row level security;
create policy "own" on matrices using (auth.uid() = user_id);
```

### Structure du champ `data` (JSONB)

```json
{
  "config": {
    "company": "BTP Martin & Fils",
    "docTitle": "Matrice de Polyvalence 2025",
    "categories": [
      { "id": "cat1", "name": "Habilitations", "color": "#c0392b" },
      { "id": "cat2", "name": "Compétences Techniques", "color": "#1f4d7a" },
      { "id": "cat3", "name": "Management", "color": "#7c3aed" }
    ]
  },
  "comps": [
    { "id": "c1", "name": "Habilitation électrique", "categoryId": "cat1", "isKey": true, "minBackups": 2 }
  ],
  "employees": [
    {
      "id": "e1", "name": "Martin Pierre", "role": "Chef de chantier",
      "isAbsent": false, "absenceReason": "",
      "skills": { "c1": 3, "c2": 2 }
    }
  ]
}
```

### Niveaux de compétence

| Niveau | Couleur          | Label                  |
| ------ | ---------------- | ---------------------- |
| 0      | Gris `#8e9eab`   | — (pas de compétence)  |
| 1      | Orange `#e67e22` | En formation           |
| 2      | Vert `#27ae60`   | Autonome               |
| 3      | Bleu `#2980b9`   | Expert / Formateur     |

---

## 3. Données de démonstration

Chargées automatiquement à la première visite (aucune donnée en Supabase pour cet utilisateur) :

- **3 catégories** : Habilitations & Sécurité · Compétences Techniques · Management & Support
- **2-3 compétences par catégorie** (total ~8), dont 2 marquées "poste clé"
- **4-5 employés** avec des rôles variés et des niveaux variés

Permet à l'utilisateur de comprendre immédiatement le fonctionnement sans page blanche.

---

## 4. Architecture des composants

```
src/pages/
  MatricePage.tsx            ← AccessGate(tool_slug="matrice-polyvalence") + layout principal

src/components/matrice/
  MatriceContext.tsx         ← Context + useReducer + auto-save Supabase (debounce 1.5s)
  MatriceHeader.tsx          ← Header dégradé bleu : nom entreprise + titre + indicateur "Sauvegardé ✓"
  MatriceTabs.tsx            ← Barre onglets sticky + boutons Imprimer / Exporter PDF
  MatricePDF.tsx             ← Document @react-pdf/renderer (page 1 matrice + page 2 synthèse)

  views/
    MatriceView.tsx          ← Tableau interactif (clic cellule = cycle 0→1→2→3→0)
    CollaborateursView.tsx   ← Liste + CRUD salariés (modal ajout/édition)
    AbsencesView.tsx         ← Déclaration absences + alertes couverture automatiques
    CompetencesView.tsx      ← Liste + CRUD compétences (modal ajout/édition + isKey/minBackups)
    CategoriesView.tsx       ← Liste + CRUD catégories (nom + couleur picker)
    ParametresView.tsx       ← Infos entreprise + export JSON + import JSON
```

---

## 5. Interface — Barre d'onglets

Structure identique au prototype HTML `matrice_DEF.html` :

```
[Header dégradé : Nom entreprise | Titre document | Sauvegardé ✓]
[📊 Matrice | 👥 Collaborateurs | 🏖 Absences | ⚡ Compétences | 🗂 Catégories | ⚙️ Paramètres]  [🖨 Imprimer] [📄 Exporter PDF]
[Contenu de l'onglet actif]
```

### Onglet Matrice
- En-tête de tableau sur 2 lignes : ligne 1 = catégories colorées (spanning), ligne 2 = noms des compétences
- Colonne gauche sticky : nom salarié + rôle (avec barre de couleur par rôle comme prototype)
- Cellules cliquables : cycle 0→1→2→3→0 au clic
- Ligne de redondance en pied de tableau : nombre de personnes niveau ≥2 par compétence, fond rouge si < minBackups, vert sinon
- Légende des niveaux en haut

### Onglet Collaborateurs
- Liste des salariés avec nom, rôle, badge "ABSENT" si applicable
- Bouton "+ Ajouter" → modal (nom, rôle)
- Actions par ligne : éditer, supprimer

### Onglet Absences
- Section "Absences en cours" : liste des salariés absents avec motif
- Alertes automatiques : pour chaque compétence clé où un absent était le seul niveau ≥2 disponible → alerte rouge ; si minBackups non atteint → alerte orange
- Section "Salariés présents" : tableau avec bouton "Déclarer absent"
- Modal motif d'absence : Arrêt maladie / Congés payés / Formation / Accident du travail / Autre

### Onglet Compétences
- Liste des compétences groupées par catégorie
- Bouton "+ Ajouter" → modal (nom, catégorie, poste clé oui/non, minBackups)
- Actions par ligne : éditer, supprimer

### Onglet Catégories
- Liste des catégories avec color picker inline
- Bouton "+ Ajouter" → modal (nom, couleur)
- Actions : renommer, changer couleur, supprimer (si aucune compétence liée)

### Onglet Paramètres
- Champs : nom de l'entreprise, titre du document
- Boutons : Exporter JSON (backup) · Importer JSON (restaurer)
- Zone danger : Réinitialiser avec données de démonstration

---

## 6. Auto-save Supabase

- À chaque modification du state → debounce 1.5s → `upsert` dans `matrices` (user_id, data, updated_at)
- Indicateur dans le header : "Sauvegarde..." pendant l'écriture, "Sauvegardé ✓ · il y a Xs" après succès
- Au montage : `select` dans `matrices` par user_id → si résultat → charger les données ; si vide → charger données démo + `insert`

---

## 7. Export PDF (`MatricePDF.tsx`)

Généré côté client avec `@react-pdf/renderer`. Format A4.

### Page 1 — Matrice colorée (orientation landscape)
- Header dégradé bleu : nom entreprise, titre document, date de génération
- Légende compacte des 4 niveaux
- Tableau complet : en-têtes catégories colorés (2 lignes), cellules de niveaux colorées, ligne de redondance rouge/vert
- Footer : "Confidentiel · Usage interne"

### Page 2 — Synthèse & alertes (orientation portrait)
- Header identique
- 3 stats : nombre de collaborateurs / compétences / alertes actives
- Liste des compétences à risque (rouge = 0 remplaçant, orange = sous le minimum)
- Barres de couverture par compétence (personnes niveau ≥2 / total)

Déclenchement : bouton "📄 Exporter PDF" dans la barre d'onglets → `PDFDownloadLink` avec nom de fichier `matrice-polyvalence-[company]-[date].pdf`.

---

## 8. Intégration dans le projet existant

### Fichiers modifiés
- `src/App.tsx` — ajouter `<Route path="/matrice-polyvalence" element={<MatricePage />} />`
- `src/pages/HomePage.tsx` — ajouter une 4e carte "Matrice de Polyvalence" (disponible, lien vers `/matrice-polyvalence`) ; Document Unique et Plan de Prévention restent en "bientôt". La grille passe de `sm:grid-cols-3` à `sm:grid-cols-2 lg:grid-cols-4`.

### Fichiers créés (nouveaux)
- `src/pages/MatricePage.tsx`
- `src/components/matrice/` (tous les fichiers listés section 4)

### Infrastructure Supabase
- Migration SQL : créer table `matrices` + RLS (voir section 2)
- Aucune nouvelle Edge Function nécessaire — le paiement passe par `create-checkout-session` existante avec `tool_slug: "matrice-polyvalence"`

### Stripe
- Aucune modification — `AccessGate` et `create-checkout-session` gèrent déjà les tool_slugs dynamiquement

---

## 9. Hors scope

- Historique de versions de la matrice
- Partage de la matrice entre utilisateurs
- Multi-sites / multi-entités
- Import depuis Excel/CSV
- Notifications email lors d'alertes d'absence
