# Design : Amélioration de la génération IA de cartographie

**Date :** 2026-06-06
**Scope :** Edge Function `generate-process-map` + composant `Step2AIGeneration.tsx`

## Contexte et problème

La génération IA de cartographie des processus MASE utilise l'API Mistral Agents avec web_search pour personnaliser la cartographie à partir d'informations trouvées en ligne sur l'entreprise. Le système échoue fréquemment pour deux raisons :

1. **Lenteur :** deux appels réseau séquentiels (création agent + conversation) atteignent le timeout de 75s
2. **Ambiguïté des noms :** des noms comme "atexia" (entreprise BTP) retournent des résultats médicaux ("ataxie"), ce qui produit un JSON inexploitable

## Objectif

Rendre la recherche web fiable pour **toute entreprise** cherchant la certification MASE, petite ou grande, connue ou locale, sans changer la valeur différenciante (personnalisation par recherche internet).

## Architecture : pipeline deux phases

```
Phase 1 : searchCompanyContext()      Phase 2 : generateProcessMap()
──────────────────────────────        ──────────────────────────────
Mistral Agent + web_search            Mistral Chat Completions
mistral-small-latest                  mistral-large-latest
Timeout : 20s                         Timeout : ~5s
Output : string (texte libre)         Output : ProcessDefinition[] (JSON)
ou '' si échec                        Utilise le contexte de Phase 1
```

**Orchestration dans `Deno.serve` :**
1. `const context = await Promise.race([searchCompanyContext(...), timeout(20s)])`
2. `const result = await generateProcessMap(..., context)` — tourne toujours
3. Réponse en ~25s max (vs 60-75s actuellement)

## Phase 1 — Recherche d'entreprise

**Modèle :** `mistral-small-latest` (plus rapide pour une tâche de recherche simple)

**Prompt de recherche :**
```
Cherche l'ENTREPRISE (société commerciale, PME, groupe industriel)
nommée "{companyName}" à {city}, secteur "{sector}".

IMPORTANT : si tu trouves un terme médical ou scientifique, ignore-le
et cherche une société commerciale.

Retourne en 3 phrases maximum :
- Son activité principale
- Sa taille approximative
- Ses spécificités métier (ex: filiale de X, spécialisée en Y)
```

**Comportement :**
- Retourne le texte brut de la réponse de l'agent
- Si le texte contient "non trouvée" ou est vide → Phase 2 tourne sans contexte
- L'agent est supprimé en arrière-plan (fire & forget, ne bloque pas)
- Si la Phase 1 échoue ou dépasse 20s → Phase 2 tourne quand même avec context = ''

## Phase 2 — Génération de cartographie

**Modèle :** `mistral-large-latest`
**Mode :** Chat Completions avec `response_format: { type: 'json_object' }` (JSON garanti)
**Temperature :** 0.3

**Prompt (context injecté si disponible) :**
```
[Si context non vide :]
Contexte trouvé sur cette entreprise :
"{context}"

Génère une cartographie MASE complète pour "{companyName}" ({city}), secteur "{sector}".
Adapte les processus à l'activité réelle décrite ci-dessus.

Règles :
- 2-3 processus PILOTAGE (direction, amélioration continue...)
- 3-5 processus RÉALISATION séquentiels avec inputElement/outputElement/afterProcessId
- 3-4 processus SUPPORT avec linkedRealisationIds

Retourne uniquement ce JSON :
{
  "source": "web_search" | "sector_model",
  "sourceSummary": "...",
  "processes": [...]
}
```

**`source` :**
- `"web_search"` si Phase 1 a retourné un contexte non vide
- `"sector_model"` si Phase 1 a échoué ou est vide

**Avantage clé :** `response_format: json_object` élimine les erreurs de parsing JSON dues au markdown ou au texte parasite.

## Modifications frontend — `Step2AIGeneration.tsx`

### Nouveau template sectoriel `electricite`

```typescript
electricite: [
  { id: 'p1', type: 'pilotage', name: 'Direction générale', ... },
  { id: 'p2', type: 'pilotage', name: 'Amélioration continue', ... },
  { id: 'p3', type: 'realisation', name: 'Étude et chiffrage',
    inputElement: "Appel d'offre / Demande client",
    outputElement: 'Devis accepté' },
  { id: 'p4', type: 'realisation', name: 'Préparation chantier électrique',
    inputElement: 'Devis accepté',
    outputElement: 'Plan d\'installation + DICT', afterProcessId: 'p3' },
  { id: 'p5', type: 'realisation', name: 'Exécution des travaux (CFO/CFA)',
    inputElement: 'Plan validé',
    outputElement: 'Installation réalisée', afterProcessId: 'p4' },
  { id: 'p6', type: 'realisation', name: 'Mise en service et réception',
    inputElement: 'Installation réalisée',
    outputElement: 'PV de réception signé', afterProcessId: 'p5' },
  { id: 'p7', type: 'support', name: 'Ressources Humaines', ... },
  { id: 'p8', type: 'support', name: 'Matériel et outillage', ... },
  { id: 'p9', type: 'support', name: 'SSE et habilitations électriques', ... },
  { id: 'p10', type: 'support', name: 'Achats et fournisseurs', ... },
]
```

### Détection de secteur améliorée

```typescript
function getSectorTemplate(sector: string): ProcessDefinition[] {
  const lower = sector.toLowerCase();
  if (lower.includes('électricité') || lower.includes('electricit')
    || lower.includes('courant fort') || lower.includes('courant faible')
    || lower.includes('génie électrique') || lower.includes('cfo')
    || lower.includes('cfa')) {
    return SECTOR_TEMPLATES.electricite;
  }
  if (lower.includes('btp') || lower.includes('chantier')
    || lower.includes('construction') || lower.includes('travaux')) {
    return SECTOR_TEMPLATES.btp;
  }
  if (lower.includes('maintenance') || lower.includes('entretien')) {
    return SECTOR_TEMPLATES.maintenance;
  }
  return SECTOR_TEMPLATES.generique;
}
```

### Message d'erreur

Remplacer le message générique figé par le vrai message d'erreur retourné par l'Edge Function, pour faciliter le diagnostic.

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `supabase/functions/generate-process-map/index.ts` | Réécriture complète du pipeline |
| `src/components/cartographie/phase1/Step2AIGeneration.tsx` | Template électricité + détection secteur + message d'erreur |

## Ce qui ne change pas

- Interface `GenerateProcessMapResult` dans `types/cartographie.ts` — inchangée
- Hook `useCartographie.ts` — inchangé
- Comportement visible pour l'utilisateur — identique, juste plus fiable et plus rapide
