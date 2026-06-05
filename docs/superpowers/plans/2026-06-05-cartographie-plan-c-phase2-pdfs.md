# Cartographie des Processus — Plan C : Phase 2 + PDFs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter le wizard Phase 2 complet — fiches de processus avec objectifs SMART (reformulation IA), aide IA à la demande, et génération des PDFs fiches + bundle complet.

**Architecture:** `Phase2Wizard` itère sur chaque processus de la cartographie et affiche un formulaire `ProcessSheetForm` divisé en 4 blocs (A: identité, B: flux, C: SMART, D: risques). Les données sont sauvegardées dans `process_sheets` après chaque fiche. Les PDFs utilisent `@react-pdf/renderer`, le bundle combine cartographie + toutes les fiches en un seul PDF.

**Tech Stack:** React 19 + TypeScript + Tailwind v4 + Supabase (via `useCartographie`) + `@react-pdf/renderer` + Mistral (via Edge Functions `reformulate-smart` et `ai-assist-process`)

**Prérequis Plans A et B :** types `src/types/cartographie.ts`, hook `useCartographie`, `CartographieWizardPage`, `Phase1Wizard`, `MapPreview`, `renderCartographyPdf`.

**Spec :** `docs/superpowers/specs/2026-06-04-cartographie-processus-design.md`

---

## File Structure

```text
src/
  components/
    cartographie/
      shared/
        AiAssistButton.tsx           ← NOUVEAU — bouton "✨ Aide IA" réutilisable
        TagInput.tsx                 ← NOUVEAU — saisie de liste (tags séparés par Entrée)
      phase2/
        Phase2Wizard.tsx             ← NOUVEAU — orchestrateur Phase 2 (itère sur processus)
        ProcessSheetForm.tsx         ← NOUVEAU — formulaire complet d'une fiche processus
        BlockA.tsx                   ← NOUVEAU — identité + finalité
        BlockB.tsx                   ← NOUVEAU — flux + activités + ressources
        BlockC.tsx                   ← NOUVEAU — objectif SMART + KPIs
        BlockD.tsx                   ← NOUVEAU — risques + documents + révision
  engine/
    cartographie/
      renderProcessSheetPdf.tsx      ← NOUVEAU — PDF fiche processus individuelle
      renderBundlePdf.tsx            ← NOUVEAU — PDF bundle (cartographie + toutes fiches)

src/pages/CartographieWizardPage.tsx ← MODIFIÉ — ajouter écran Phase2Wizard
```

---

## Task 1 : AiAssistButton + TagInput

**Files:**
- Create: `src/components/cartographie/shared/AiAssistButton.tsx`
- Create: `src/components/cartographie/shared/TagInput.tsx`
- Create: `src/components/cartographie/shared/TagInput.test.tsx`

- [ ] **Étape 1 : Écrire le test TagInput**

```tsx
// src/components/cartographie/shared/TagInput.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TagInput from './TagInput';

describe('TagInput', () => {
  it('affiche les tags existants', () => {
    render(<TagInput value={['Alpha', 'Beta']} onChange={vi.fn()} />);
    expect(screen.getByText('Alpha')).toBeDefined();
    expect(screen.getByText('Beta')).toBeDefined();
  });

  it('ajoute un tag sur Entrée', () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Nouveau' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['Nouveau']);
  });

  it('supprime un tag au clic sur ×', () => {
    const onChange = vi.fn();
    render(<TagInput value={['Alpha', 'Beta']} onChange={onChange} />);
    const removeButtons = screen.getAllByTitle('Supprimer');
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith(['Beta']);
  });
});
```

- [ ] **Étape 2 : Lancer le test — vérifier qu'il échoue**

```bash
npx vitest run src/components/cartographie/shared/TagInput.test.tsx
```

Résultat attendu : `FAIL — cannot find module`

- [ ] **Étape 3 : Créer TagInput**

```tsx
// src/components/cartographie/shared/TagInput.tsx
import { useState } from 'react';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ value, onChange, placeholder = 'Tapez et appuyez sur Entrée…' }: Props) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: '#e0e7ff', color: '#3730a3' }}
          >
            {tag}
            <button
              onClick={() => remove(tag)}
              title="Supprimer"
              className="ml-1 text-indigo-400 hover:text-red-500"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="input-field flex-1"
        />
        <button
          onClick={add}
          className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
        >
          +
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Étape 4 : Créer AiAssistButton**

```tsx
// src/components/cartographie/shared/AiAssistButton.tsx
import { useState } from 'react';

interface Props {
  onSuggest: () => Promise<string | string[]>;
  onAccept: (suggestion: string | string[]) => void;
  label?: string;
}

export default function AiAssistButton({ onSuggest, onAccept, label = 'Aide IA' }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async () => {
    setIsLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      const result = await onSuggest();
      setSuggestion(result);
    } catch {
      setError('L\'IA n\'a pas pu générer de suggestion. Essayez de nouveau.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    if (suggestion !== null) {
      onAccept(suggestion);
      setSuggestion(null);
    }
  };

  return (
    <div>
      <button
        onClick={handleSuggest}
        disabled={isLoading}
        className="flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold disabled:opacity-50"
        style={{ backgroundColor: '#ede9fe', color: '#6d28d9' }}
      >
        {isLoading ? '⏳ Génération…' : `✨ ${label}`}
      </button>

      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}

      {suggestion !== null && (
        <div
          className="mt-2 rounded-lg p-3"
          style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe' }}
        >
          <div className="mb-2 text-xs font-semibold text-purple-700">Suggestion IA :</div>
          {Array.isArray(suggestion) ? (
            <ul className="mb-3 pl-4 text-xs text-purple-900">
              {suggestion.map((s, i) => <li key={i} className="mb-1">• {s}</li>)}
            </ul>
          ) : (
            <p className="mb-3 text-xs text-purple-900">{suggestion}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              className="rounded px-3 py-1 text-xs font-semibold text-white"
              style={{ backgroundColor: '#7c3aed' }}
            >
              ✓ Accepter
            </button>
            <button
              onClick={() => setSuggestion(null)}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50"
            >
              Ignorer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Étape 5 : Lancer les tests**

```bash
npx vitest run src/components/cartographie/shared/TagInput.test.tsx
```

Résultat attendu : `3 passed`

- [ ] **Étape 6 : Commit**

```bash
git add src/components/cartographie/shared/TagInput.tsx src/components/cartographie/shared/TagInput.test.tsx src/components/cartographie/shared/AiAssistButton.tsx
git commit -m "feat(cartographie): TagInput + AiAssistButton composants partagés"
```

---

## Task 2 : BlockA + BlockB

**Files:**
- Create: `src/components/cartographie/phase2/BlockA.tsx`
- Create: `src/components/cartographie/phase2/BlockB.tsx`

Ces deux blocs constituent la première moitié du formulaire de fiche processus.

- [ ] **Étape 1 : Créer BlockA (identité + finalité)**

```tsx
// src/components/cartographie/phase2/BlockA.tsx
import AiAssistButton from '../shared/AiAssistButton';
import TagInput from '../shared/TagInput';
import type { ProcessSheet } from '../../../types/cartographie';
import type { useCartographie } from '../../../hooks/useCartographie';

type CartographieHook = ReturnType<typeof useCartographie>;

interface Props {
  sheet: ProcessSheet;
  onChange: (patch: Partial<ProcessSheet>) => void;
  cartographie: CartographieHook;
  sector: string;
}

export default function BlockA({ sheet, onChange, cartographie, sector }: Props) {
  const { process } = sheet;

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm mb-4">
      <h3 className="mb-4 text-base font-bold text-gray-900 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">A</span>
        Identité et finalité du processus
      </h3>

      <div className="flex flex-col gap-4">
        {/* Nom + type (pré-remplis) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Nom du processus</label>
            <div className="input-field bg-gray-50 text-gray-700">{process.name}</div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Type</label>
            <div className="input-field bg-gray-50 text-gray-700 capitalize">{process.type}</div>
          </div>
        </div>

        {/* Pilote + poste (pré-remplis, modifiables) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Pilote du processus</label>
            <input
              type="text"
              value={process.pilotName}
              onChange={(e) => onChange({ process: { ...process, pilotName: e.target.value } })}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Poste / Fonction</label>
            <input
              type="text"
              value={process.pilotRole}
              onChange={(e) => onChange({ process: { ...process, pilotRole: e.target.value } })}
              className="input-field"
            />
          </div>
        </div>

        {/* Participants */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Participants / Acteurs
            <span className="ml-1 font-normal text-gray-400">(personnes ou fonctions impliquées)</span>
          </label>
          <TagInput
            value={sheet.participants}
            onChange={(tags) => onChange({ participants: tags })}
            placeholder="Ex: Chef de chantier — appuyez sur Entrée pour ajouter"
          />
        </div>

        {/* Finalité */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-600">
              Finalité du processus
              <span className="ml-1 font-normal text-gray-400">(à quoi sert ce processus ?)</span>
            </label>
            <AiAssistButton
              label="Suggérer la finalité"
              onSuggest={() =>
                cartographie.callAiAssist({
                  questionType: 'purpose',
                  processName: process.name,
                  processType: process.type,
                  sector,
                  context: {},
                }).then((r) => r.suggestion)
              }
              onAccept={(s) => onChange({ purpose: s as string })}
            />
          </div>
          <textarea
            rows={2}
            value={sheet.purpose}
            onChange={(e) => onChange({ purpose: e.target.value })}
            placeholder="Ex: Ce processus a pour but de transformer les demandes clients en chantiers réalisés dans les délais et conformes aux exigences."
            className="input-field resize-none"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : Créer BlockB (flux + activités + ressources)**

```tsx
// src/components/cartographie/phase2/BlockB.tsx
import AiAssistButton from '../shared/AiAssistButton';
import TagInput from '../shared/TagInput';
import type { ProcessSheet } from '../../../types/cartographie';
import type { useCartographie } from '../../../hooks/useCartographie';

type CartographieHook = ReturnType<typeof useCartographie>;

interface Props {
  sheet: ProcessSheet;
  onChange: (patch: Partial<ProcessSheet>) => void;
  cartographie: CartographieHook;
  sector: string;
}

export default function BlockB({ sheet, onChange, cartographie, sector }: Props) {
  const { process } = sheet;

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm mb-4">
      <h3 className="mb-4 text-base font-bold text-gray-900 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">B</span>
        Flux et activités
      </h3>

      <div className="flex flex-col gap-4">
        {/* Données d'entrée (pré-remplies depuis Phase 1) */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Données / documents d'entrée
            <span className="ml-1 font-normal text-gray-400">(ce qui déclenche ce processus)</span>
          </label>
          <TagInput
            value={sheet.inputs}
            onChange={(tags) => onChange({ inputs: tags })}
            placeholder={process.inputElement ? `Ex: ${process.inputElement}` : 'Ex: Bon de commande signé'}
          />
          {process.inputElement && sheet.inputs.length === 0 && (
            <button
              onClick={() => onChange({ inputs: [process.inputElement!] })}
              className="mt-1 text-xs text-blue-600 underline hover:text-blue-800"
            >
              Utiliser "{process.inputElement}" depuis la cartographie
            </button>
          )}
        </div>

        {/* Activités principales */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-600">
              Activités principales
              <span className="ml-1 font-normal text-gray-400">(3 à 6 grandes étapes internes)</span>
            </label>
            <AiAssistButton
              label="Suggérer les activités"
              onSuggest={() =>
                cartographie.callAiAssist({
                  questionType: 'activities',
                  processName: process.name,
                  processType: process.type,
                  sector,
                  context: { inputs: sheet.inputs },
                }).then((r) => r.suggestion)
              }
              onAccept={(s) => onChange({ activities: Array.isArray(s) ? s : [s] })}
            />
          </div>
          <TagInput
            value={sheet.activities}
            onChange={(tags) => onChange({ activities: tags })}
            placeholder="Ex: Analyser le plan de prévention — appuyez sur Entrée"
          />
        </div>

        {/* Données de sortie (pré-remplies depuis Phase 1) */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Données / documents de sortie
            <span className="ml-1 font-normal text-gray-400">(ce que produit ce processus)</span>
          </label>
          <TagInput
            value={sheet.outputs}
            onChange={(tags) => onChange({ outputs: tags })}
            placeholder={process.outputElement ? `Ex: ${process.outputElement}` : 'Ex: PV de réception signé'}
          />
          {process.outputElement && sheet.outputs.length === 0 && (
            <button
              onClick={() => onChange({ outputs: [process.outputElement!] })}
              className="mt-1 text-xs text-blue-600 underline hover:text-blue-800"
            >
              Utiliser "{process.outputElement}" depuis la cartographie
            </button>
          )}
        </div>

        {/* Ressources */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-600">
              Ressources nécessaires
              <span className="ml-1 font-normal text-gray-400">(humaines, matérielles, logiciels)</span>
            </label>
            <AiAssistButton
              label="Suggérer les ressources"
              onSuggest={() =>
                cartographie.callAiAssist({
                  questionType: 'resources',
                  processName: process.name,
                  processType: process.type,
                  sector,
                  context: {},
                }).then((r) => r.suggestion)
              }
              onAccept={(s) => onChange({ resources: Array.isArray(s) ? s : [s] })}
            />
          </div>
          <TagInput
            value={sheet.resources}
            onChange={(tags) => onChange({ resources: tags })}
            placeholder="Ex: Chef de chantier habilité — appuyez sur Entrée"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Étape 3 : Commit**

```bash
git add src/components/cartographie/phase2/BlockA.tsx src/components/cartographie/phase2/BlockB.tsx
git commit -m "feat(cartographie): BlockA (identité/finalité) + BlockB (flux/activités/ressources)"
```

---

## Task 3 : BlockC — Objectif SMART

**Files:**
- Create: `src/components/cartographie/phase2/BlockC.tsx`

C'est le bloc le plus complexe : reformulation automatique via l'IA + 5 sous-champs SMART + 2 KPIs.

- [ ] **Étape 1 : Créer BlockC**

```tsx
// src/components/cartographie/phase2/BlockC.tsx
import { useState } from 'react';
import type { ProcessSheet, SmartObjective } from '../../../types/cartographie';
import type { useCartographie } from '../../../hooks/useCartographie';

type CartographieHook = ReturnType<typeof useCartographie>;

interface Props {
  sheet: ProcessSheet;
  onChange: (patch: Partial<ProcessSheet>) => void;
  cartographie: CartographieHook;
  sector: string;
}

const EMPTY_SMART: SmartObjective = {
  rawText: '',
  objectiveText: '',
  indicator: '',
  target: '',
  frequency: 'Mensuelle',
  deadline: new Date().getFullYear() + '-12-31',
};

const FREQUENCIES = ['Mensuelle', 'Trimestrielle', 'Semestrielle', 'Annuelle'];

export default function BlockC({ sheet, onChange, cartographie, sector }: Props) {
  const smart = sheet.smartObjective ?? EMPTY_SMART;
  const [isReformulating, setIsReformulating] = useState(false);
  const [reformulated, setReformulated] = useState(false);

  const updateSmart = (patch: Partial<SmartObjective>) =>
    onChange({ smartObjective: { ...smart, ...patch } });

  const handleReformulate = async () => {
    if (!smart.rawText.trim()) return;
    setIsReformulating(true);
    try {
      const result = await cartographie.callReformulateSmart({
        rawObjective: smart.rawText,
        processName: sheet.process.name,
        sector,
      });
      updateSmart({
        objectiveText: result.objectiveText,
        indicator: result.indicator,
        target: result.target,
        frequency: result.frequency,
        deadline: result.deadline,
      });
      setReformulated(true);
    } catch {
      // Échec silencieux — l'utilisateur peut remplir manuellement
    } finally {
      setIsReformulating(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm mb-4">
      <h3 className="mb-1 text-base font-bold text-gray-900 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">C</span>
        Objectif SMART
        <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: '#7c3aed' }}>Obligatoire MASE</span>
      </h3>
      <p className="mb-4 text-xs text-gray-500">
        Un objectif SMART est précis, mesurable et daté. Écrivez votre objectif en langage naturel
        et l'IA le reformulera automatiquement.
      </p>

      <div className="flex flex-col gap-4">
        {/* Étape 1: objectif brut */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Mon objectif pour ce processus (en langage naturel)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={smart.rawText}
              onChange={(e) => updateSmart({ rawText: e.target.value })}
              placeholder={`Ex: Livrer tous les chantiers dans les délais`}
              className="input-field flex-1"
            />
            <button
              onClick={handleReformulate}
              disabled={!smart.rawText.trim() || isReformulating}
              className="flex-shrink-0 rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: '#7c3aed' }}
            >
              {isReformulating ? '⏳ IA…' : '✨ Reformuler en SMART'}
            </button>
          </div>
        </div>

        {/* Résultat SMART */}
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: reformulated ? '#f5f3ff' : '#f9fafb',
            border: `1px solid ${reformulated ? '#ddd6fe' : '#e5e7eb'}`,
          }}
        >
          {reformulated && (
            <div className="mb-3 text-xs font-semibold text-purple-700">
              ✨ Reformulé par l'IA — vérifiez et ajustez si nécessaire
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Objectif reformulé (précis et mesurable)
              </label>
              <input
                type="text"
                value={smart.objectiveText}
                onChange={(e) => updateSmart({ objectiveText: e.target.value })}
                placeholder="Ex: Atteindre 90% de chantiers livrés dans les délais contractuels"
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Indicateur de mesure (KPI de résultat)
                </label>
                <input
                  type="text"
                  value={smart.indicator}
                  onChange={(e) => updateSmart({ indicator: e.target.value })}
                  placeholder="Ex: Taux de respect des délais"
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Valeur cible
                </label>
                <input
                  type="text"
                  value={smart.target}
                  onChange={(e) => updateSmart({ target: e.target.value })}
                  placeholder="Ex: ≥ 90%"
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Fréquence de mesure
                </label>
                <select
                  value={smart.frequency}
                  onChange={(e) => updateSmart({ frequency: e.target.value })}
                  className="input-field"
                >
                  {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Échéance
                </label>
                <input
                  type="date"
                  value={smart.deadline}
                  onChange={(e) => updateSmart({ deadline: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPIs complémentaires */}
        <div className="rounded-lg bg-gray-50 p-4" style={{ border: '1px solid #e5e7eb' }}>
          <div className="mb-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Indicateurs de suivi complémentaires (MASE V2024)
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Indicateur de résultat (lagging)
                <span className="ml-1 font-normal text-gray-400">— mesure après coup</span>
              </label>
              <input
                type="text"
                value={sheet.kpiLagging}
                onChange={(e) => onChange({ kpiLagging: e.target.value })}
                placeholder="Ex: Nombre de retards constatés par mois"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Indicateur de suivi (leading)
                <span className="ml-1 font-normal text-gray-400">— mesure en cours d'action</span>
              </label>
              <input
                type="text"
                value={sheet.kpiLeading}
                onChange={(e) => onChange({ kpiLeading: e.target.value })}
                placeholder="Ex: Nombre de réunions de suivi chantier réalisées"
                className="input-field"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/components/cartographie/phase2/BlockC.tsx
git commit -m "feat(cartographie): BlockC objectif SMART avec reformulation IA automatique"
```

---

## Task 4 : BlockD + ProcessSheetForm

**Files:**
- Create: `src/components/cartographie/phase2/BlockD.tsx`
- Create: `src/components/cartographie/phase2/ProcessSheetForm.tsx`

- [ ] **Étape 1 : Créer BlockD (risques + documents + révision)**

```tsx
// src/components/cartographie/phase2/BlockD.tsx
import AiAssistButton from '../shared/AiAssistButton';
import TagInput from '../shared/TagInput';
import type { ProcessSheet } from '../../../types/cartographie';
import type { useCartographie } from '../../../hooks/useCartographie';

type CartographieHook = ReturnType<typeof useCartographie>;

const REVISION_OPTIONS = ['Mensuelle', 'Trimestrielle', 'Semestrielle', 'Annuelle'];

interface Props {
  sheet: ProcessSheet;
  onChange: (patch: Partial<ProcessSheet>) => void;
  cartographie: CartographieHook;
  sector: string;
}

export default function BlockD({ sheet, onChange, cartographie, sector }: Props) {
  const { process } = sheet;

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm mb-4">
      <h3 className="mb-4 text-base font-bold text-gray-900 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">D</span>
        Risques et documentation
      </h3>

      <div className="flex flex-col gap-4">
        {/* Risques */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-600">
              Risques principaux
              <span className="ml-1 font-normal text-gray-400">(1 à 3 risques pouvant affecter ce processus)</span>
            </label>
            <AiAssistButton
              label="Suggérer les risques"
              onSuggest={() =>
                cartographie.callAiAssist({
                  questionType: 'risks',
                  processName: process.name,
                  processType: process.type,
                  sector,
                  context: { activities: sheet.activities },
                }).then((r) => r.suggestion)
              }
              onAccept={(s) => onChange({ risks: Array.isArray(s) ? s : [s] })}
            />
          </div>
          <TagInput
            value={sheet.risks}
            onChange={(tags) => onChange({ risks: tags })}
            placeholder="Ex: Absence de chef de chantier lors de l'exécution — Entrée pour ajouter"
          />
        </div>

        {/* Documents associés */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-600">
              Documents associés
              <span className="ml-1 font-normal text-gray-400">(procédures, formulaires, instructions)</span>
            </label>
            <AiAssistButton
              label="Suggérer les documents"
              onSuggest={() =>
                cartographie.callAiAssist({
                  questionType: 'documents',
                  processName: process.name,
                  processType: process.type,
                  sector,
                  context: {},
                }).then((r) => r.suggestion)
              }
              onAccept={(s) => onChange({ documents: Array.isArray(s) ? s : [s] })}
            />
          </div>
          <TagInput
            value={sheet.documents}
            onChange={(tags) => onChange({ documents: tags })}
            placeholder="Ex: Plan de prévention — Entrée pour ajouter"
          />
        </div>

        {/* Fréquence de révision */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Fréquence de révision de cette fiche
          </label>
          <select
            value={sheet.revisionFrequency}
            onChange={(e) => onChange({ revisionFrequency: e.target.value })}
            className="input-field"
          >
            {REVISION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            MASE recommande une révision annuelle minimum.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : Créer ProcessSheetForm**

```tsx
// src/components/cartographie/phase2/ProcessSheetForm.tsx
import type { ProcessSheet } from '../../../types/cartographie';
import type { useCartographie } from '../../../hooks/useCartographie';
import BlockA from './BlockA';
import BlockB from './BlockB';
import BlockC from './BlockC';
import BlockD from './BlockD';

type CartographieHook = ReturnType<typeof useCartographie>;

interface Props {
  sheet: ProcessSheet;
  onChange: (patch: Partial<ProcessSheet>) => void;
  onSave: () => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  isSaving: boolean;
  processIndex: number;
  totalProcesses: number;
  cartographie: CartographieHook;
  sector: string;
}

export default function ProcessSheetForm({
  sheet, onChange, onSave, onNext, onBack, isSaving,
  processIndex, totalProcesses, cartographie, sector,
}: Props) {
  const typeColor = {
    pilotage: '#3b82f6',
    realisation: '#16a34a',
    support: '#ca8a04',
  }[sheet.process.type];

  const typeLabel = {
    pilotage: '🔵 Pilotage',
    realisation: '🟢 Réalisation',
    support: '🟡 Support',
  }[sheet.process.type];

  const handleSaveAndNext = async () => {
    await onSave();
    onNext();
  };

  return (
    <div>
      {/* Header processus */}
      <div
        className="mb-6 rounded-xl p-4 text-white"
        style={{ backgroundColor: typeColor }}
      >
        <div className="text-xs font-semibold opacity-80 mb-1">
          Processus {processIndex + 1} / {totalProcesses} — {typeLabel}
        </div>
        <div className="text-xl font-bold">{sheet.process.name}</div>
      </div>

      <BlockA sheet={sheet} onChange={onChange} cartographie={cartographie} sector={sector} />
      <BlockB sheet={sheet} onChange={onChange} cartographie={cartographie} sector={sector} />
      <BlockC sheet={sheet} onChange={onChange} cartographie={cartographie} sector={sector} />
      <BlockD sheet={sheet} onChange={onChange} cartographie={cartographie} sector={sector} />

      <div className="flex justify-between mt-4">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          ← Processus précédent
        </button>
        <button
          onClick={handleSaveAndNext}
          disabled={isSaving}
          className="rounded-lg px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isSaving
            ? 'Sauvegarde…'
            : processIndex < totalProcesses - 1
            ? 'Sauvegarder et continuer →'
            : 'Terminer et générer les PDFs →'
          }
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Étape 3 : Commit**

```bash
git add src/components/cartographie/phase2/BlockD.tsx src/components/cartographie/phase2/ProcessSheetForm.tsx
git commit -m "feat(cartographie): BlockD (risques/docs) + ProcessSheetForm assembleur"
```

---

## Task 5 : Phase2Wizard + intégration CartographieWizardPage

**Files:**
- Create: `src/components/cartographie/phase2/Phase2Wizard.tsx`
- Modify: `src/pages/CartographieWizardPage.tsx`

- [ ] **Étape 1 : Créer Phase2Wizard**

```tsx
// src/components/cartographie/phase2/Phase2Wizard.tsx
import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { ProcessSheet, ProcessDefinition, SmartObjective } from '../../../types/cartographie';
import type { useCartographie } from '../../../hooks/useCartographie';
import WizardProgress from '../shared/WizardProgress';
import ProcessSheetForm from './ProcessSheetForm';
import Phase2Complete from './Phase2Complete';

type CartographieHook = ReturnType<typeof useCartographie>;

interface Props {
  session: Session;
  cartographie: CartographieHook;
}

const EMPTY_SMART: SmartObjective = {
  rawText: '',
  objectiveText: '',
  indicator: '',
  target: '',
  frequency: 'Annuelle',
  deadline: new Date().getFullYear() + '-12-31',
};

function makeEmptySheet(process: ProcessDefinition, mapId: string): ProcessSheet {
  return {
    mapId,
    process,
    participants: [],
    purpose: '',
    inputs: process.inputElement ? [process.inputElement] : [],
    activities: [],
    outputs: process.outputElement ? [process.outputElement] : [],
    resources: [],
    smartObjective: EMPTY_SMART,
    kpiLagging: '',
    kpiLeading: '',
    risks: [],
    documents: [],
    revisionFrequency: 'Annuelle',
  };
}

// Ordre : réalisation en premier, puis pilotage, puis support
function sortProcesses(processes: ProcessDefinition[]): ProcessDefinition[] {
  return [
    ...processes.filter((p) => p.type === 'realisation'),
    ...processes.filter((p) => p.type === 'pilotage'),
    ...processes.filter((p) => p.type === 'support'),
  ];
}

export default function Phase2Wizard({ session, cartographie }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sheets, setSheets] = useState<ProcessSheet[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const map = cartographie.map;
  const processes = map ? sortProcesses(map.cartographyData.processes) : [];

  const initSheets = useCallback(async () => {
    if (!map?.id) return;
    const existing = await cartographie.getSheets(map.id);
    const initialized: ProcessSheet[] = processes.map((process) => {
      const found = existing.find((s) => s.process.name === process.name && s.process.type === process.type);
      return found ?? makeEmptySheet(process, map.id!);
    });
    setSheets(initialized);
  }, [map?.id]);

  useEffect(() => { initSheets(); }, [initSheets]);

  const updateCurrentSheet = (patch: Partial<ProcessSheet>) => {
    setSheets((prev) => prev.map((s, i) => i === currentIndex ? { ...s, ...patch } : s));
  };

  const saveCurrentSheet = async () => {
    if (!sheets[currentIndex]) return;
    setIsSaving(true);
    try {
      const saved = await cartographie.saveSheet(sheets[currentIndex]);
      setSheets((prev) => prev.map((s, i) => i === currentIndex ? { ...s, id: saved.id } : s));
    } catch (e) {
      console.error('Erreur sauvegarde fiche:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < processes.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  if (!map || processes.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="mb-4 text-gray-600">
            Complétez d'abord la Phase 1 pour créer votre cartographie.
          </p>
          <a
            href="/cartographie/wizard"
            className="rounded-lg px-6 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: 'var(--mase-primary)' }}
          >
            Retour à la Phase 1
          </a>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return <Phase2Complete cartographie={cartographie} sheets={sheets} mapId={map.id!} />;
  }

  if (sheets.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Chargement des fiches…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>
      <nav
        className="flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <a href="/" className="text-lg font-bold text-white">MASE</a>
        <span className="text-sm text-white/70">{session.user.email}</span>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-6">
          <div className="mb-2 text-sm font-semibold text-gray-600">
            Phase 2 — Fiches de processus
          </div>
          <WizardProgress currentStep={currentIndex + 1} totalSteps={processes.length} />
        </div>

        <ProcessSheetForm
          sheet={sheets[currentIndex]}
          onChange={updateCurrentSheet}
          onSave={saveCurrentSheet}
          onNext={handleNext}
          onBack={handleBack}
          isSaving={isSaving}
          processIndex={currentIndex}
          totalProcesses={processes.length}
          cartographie={cartographie}
          sector={map.sector}
        />
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : Créer Phase2Complete (écran de fin Phase 2)**

```tsx
// src/components/cartographie/phase2/Phase2Complete.tsx
import { useState } from 'react';
import type { ProcessSheet } from '../../../types/cartographie';
import type { useCartographie } from '../../../hooks/useCartographie';
import { generateAndDownloadBundlePdf } from '../../../engine/cartographie/renderBundlePdf';

type CartographieHook = ReturnType<typeof useCartographie>;

interface Props {
  cartographie: CartographieHook;
  sheets: ProcessSheet[];
  mapId: string;
}

export default function Phase2Complete({ cartographie, sheets, mapId }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const map = cartographie.map;

  const handleDownloadBundle = async () => {
    if (!map) return;
    setIsGenerating(true);
    try {
      await generateAndDownloadBundlePdf({ map, sheets });
    } catch (e) {
      console.error('Erreur génération bundle:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>
      <nav
        className="flex items-center px-6 py-3"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <a href="/" className="text-lg font-bold text-white">MASE</a>
      </nav>

      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <div className="mb-4 text-5xl">🏆</div>
        <h1 className="mb-3 text-2xl font-extrabold text-gray-900">
          Votre cartographie est complète !
        </h1>
        <p className="mb-10 text-gray-500">
          Toutes vos fiches de processus sont renseignées. Téléchargez le document complet
          à remettre à votre auditeur MASE.
        </p>

        <div className="flex flex-col gap-3 mb-8">
          <button
            onClick={handleDownloadBundle}
            disabled={isGenerating}
            className="flex items-center justify-center gap-3 rounded-xl py-4 text-base font-bold text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--mase-primary)' }}
          >
            {isGenerating
              ? <><span className="animate-spin">⏳</span> Génération du PDF…</>
              : <><span>📚</span> Télécharger le document complet (cartographie + fiches)</>
            }
          </button>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm text-left">
          <h2 className="mb-3 font-bold text-gray-800">Ce document contient :</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>✓ La cartographie visuelle au format MASE</li>
            <li>✓ {sheets.length} fiches de processus détaillées</li>
            <li>✓ Les objectifs SMART pour chaque processus</li>
            <li>✓ Les indicateurs de résultat et de suivi</li>
            <li>✓ Les risques identifiés par processus</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Étape 3 : Mettre à jour CartographieWizardPage pour intégrer Phase 2**

Dans `src/pages/CartographieWizardPage.tsx`, modifier le type `Screen` et le routing :

```typescript
// Ajouter l'import
import Phase2Wizard from '../components/cartographie/phase2/Phase2Wizard';

// Modifier le type Screen
type Screen = 'loading' | 'no-access' | 'intro' | 'phase1' | 'phase2';
```

Dans l'`useEffect`, après `setScreen(cartographie.map?.phase1Completed ? 'phase1' : 'intro')` :
```typescript
// Si phase 1 complète, proposer phase 2
if (data) {
  if (cartographie.map?.phase1Completed) {
    setScreen('phase2');
  } else {
    setScreen('intro');
  }
}
```

Ajouter dans le JSX après le bloc `phase1` :
```tsx
if (screen === 'phase2') {
  return <Phase2Wizard session={session!} cartographie={cartographie} />;
}
```

Et dans Step8Export, le lien "Démarrer la Phase 2" pointe vers `/cartographie/wizard` — il rechargera la page et détectera `phase1Completed = true` pour passer en phase 2.

- [ ] **Étape 4 : Commit**

```bash
git add src/components/cartographie/phase2/Phase2Wizard.tsx src/components/cartographie/phase2/Phase2Complete.tsx src/pages/CartographieWizardPage.tsx
git commit -m "feat(cartographie): Phase2Wizard orchestrateur + Phase2Complete + intégration wizard"
```

---

## Task 6 : renderProcessSheetPdf + renderBundlePdf

**Files:**
- Create: `src/engine/cartographie/renderProcessSheetPdf.tsx`
- Create: `src/engine/cartographie/renderBundlePdf.tsx`

- [ ] **Étape 1 : Créer renderProcessSheetPdf**

```tsx
// src/engine/cartographie/renderProcessSheetPdf.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ProcessSheet } from '../../types/cartographie';

const S = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 10 },
  header: { marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', borderBottomStyle: 'solid' },
  headerTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  headerSub: { fontSize: 9, color: '#6b7280' },

  block: { marginBottom: 14 },
  blockTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 6, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', borderBottomStyle: 'solid' },

  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 140, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#374151' },
  value: { flex: 1, fontSize: 9, color: '#1f2937' },

  tag: { backgroundColor: '#f3f4f6', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, marginRight: 4, marginBottom: 3, fontSize: 8 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap' },

  smartBox: { backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe', borderStyle: 'solid', borderRadius: 4, padding: 8, marginBottom: 8 },
  smartTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#7c3aed', marginBottom: 5 },
  smartGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  smartChip: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd6fe', borderStyle: 'solid', borderRadius: 3, padding: 4, minWidth: 80 },
  chipLabel: { fontSize: 7, color: '#7c3aed', fontFamily: 'Helvetica-Bold' },
  chipValue: { fontSize: 8, color: '#1f2937' },

  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', fontSize: 7, color: '#9ca3af' },
});

function Tags({ values }: { values: string[] }) {
  if (!values.length) return <Text style={{ fontSize: 9, color: '#9ca3af' }}>Non renseigné</Text>;
  return (
    <View style={S.tagsRow}>
      {values.map((v, i) => <Text key={i} style={S.tag}>{v}</Text>)}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={S.row}>
      <Text style={S.label}>{label}</Text>
      <Text style={S.value}>{value || '—'}</Text>
    </View>
  );
}

export function ProcessSheetDocument({ sheet, companyName }: { sheet: ProcessSheet; companyName: string }) {
  const { process, smartObjective } = sheet;
  const typeLabel = process.type === 'pilotage' ? 'Processus de Pilotage' :
                    process.type === 'realisation' ? 'Processus de Réalisation' : 'Processus Support';

  return (
    <Page size="A4" style={S.page}>
      <View style={S.header}>
        <Text style={S.headerTitle}>FICHE DE PROCESSUS — {process.name.toUpperCase()}</Text>
        <Text style={S.headerSub}>{companyName} · {typeLabel} · Révision : {sheet.revisionFrequency}</Text>
      </View>

      {/* Bloc A */}
      <View style={S.block}>
        <Text style={S.blockTitle}>A — Identité et finalité</Text>
        <Row label="Pilote du processus" value={`${process.pilotName} (${process.pilotRole})`} />
        <View style={S.row}>
          <Text style={S.label}>Participants</Text>
          <View style={{ flex: 1 }}><Tags values={sheet.participants} /></View>
        </View>
        <Row label="Finalité" value={sheet.purpose} />
      </View>

      {/* Bloc B */}
      <View style={S.block}>
        <Text style={S.blockTitle}>B — Flux et activités</Text>
        <View style={S.row}>
          <Text style={S.label}>Données d'entrée</Text>
          <View style={{ flex: 1 }}><Tags values={sheet.inputs} /></View>
        </View>
        <View style={S.row}>
          <Text style={S.label}>Activités principales</Text>
          <View style={{ flex: 1 }}>
            {sheet.activities.map((a, i) => (
              <Text key={i} style={{ fontSize: 9, marginBottom: 2 }}>• {a}</Text>
            ))}
          </View>
        </View>
        <View style={S.row}>
          <Text style={S.label}>Données de sortie</Text>
          <View style={{ flex: 1 }}><Tags values={sheet.outputs} /></View>
        </View>
        <View style={S.row}>
          <Text style={S.label}>Ressources</Text>
          <View style={{ flex: 1 }}><Tags values={sheet.resources} /></View>
        </View>
      </View>

      {/* Bloc C — SMART */}
      <View style={S.block}>
        <Text style={S.blockTitle}>C — Objectif SMART (Axe 1 & 4 MASE V2024)</Text>
        <View style={S.smartBox}>
          <Text style={S.smartTitle}>✦ Objectif SMART</Text>
          <Text style={{ fontSize: 9, marginBottom: 6, color: '#1f2937' }}>{smartObjective.objectiveText || '—'}</Text>
          <View style={S.smartGrid}>
            <View style={S.smartChip}>
              <Text style={S.chipLabel}>Indicateur</Text>
              <Text style={S.chipValue}>{smartObjective.indicator || '—'}</Text>
            </View>
            <View style={S.smartChip}>
              <Text style={S.chipLabel}>Cible</Text>
              <Text style={S.chipValue}>{smartObjective.target || '—'}</Text>
            </View>
            <View style={S.smartChip}>
              <Text style={S.chipLabel}>Fréquence</Text>
              <Text style={S.chipValue}>{smartObjective.frequency || '—'}</Text>
            </View>
            <View style={S.smartChip}>
              <Text style={S.chipLabel}>Échéance</Text>
              <Text style={S.chipValue}>{smartObjective.deadline || '—'}</Text>
            </View>
          </View>
        </View>
        <Row label="KPI de résultat (lagging)" value={sheet.kpiLagging} />
        <Row label="KPI de suivi (leading)" value={sheet.kpiLeading} />
      </View>

      {/* Bloc D */}
      <View style={S.block}>
        <Text style={S.blockTitle}>D — Risques et documentation</Text>
        <View style={S.row}>
          <Text style={S.label}>Risques principaux</Text>
          <View style={{ flex: 1 }}>
            {sheet.risks.map((r, i) => <Text key={i} style={{ fontSize: 9, marginBottom: 2 }}>⚠ {r}</Text>)}
            {!sheet.risks.length && <Text style={{ fontSize: 9, color: '#9ca3af' }}>—</Text>}
          </View>
        </View>
        <View style={S.row}>
          <Text style={S.label}>Documents associés</Text>
          <View style={{ flex: 1 }}><Tags values={sheet.documents} /></View>
        </View>
      </View>

      <Text style={S.footer}>
        Fiche générée par site-internet-mase.vercel.app · Conforme MASE V2024 · Révision : {sheet.revisionFrequency}
      </Text>
    </Page>
  );
}
```

- [ ] **Étape 2 : Créer renderBundlePdf**

```tsx
// src/engine/cartographie/renderBundlePdf.tsx
import React from 'react';
import { Document, pdf } from '@react-pdf/renderer';
import type { ProcessMap, ProcessSheet } from '../../types/cartographie';
import { CartographyDocument } from './renderCartographyPdf';
import { ProcessSheetDocument } from './renderProcessSheetPdf';

interface BundleProps {
  map: ProcessMap;
  sheets: ProcessSheet[];
}

function BundleDocument({ map, sheets }: BundleProps) {
  return (
    <Document>
      {/* Page 1: Cartographie */}
      <CartographyDocument
        processes={map.cartographyData.processes}
        companyName={map.companyName}
        sector={map.sector}
        headcount={map.headcount}
        sseManagerName={map.sseManagerName}
        sseManagerRole={map.sseManagerRole}
        documentDate={map.documentDate}
      />
      {/* Pages suivantes: une fiche par processus */}
      {sheets.map((sheet, i) => (
        <ProcessSheetDocument
          key={i}
          sheet={sheet}
          companyName={map.companyName}
        />
      ))}
    </Document>
  );
}

export async function generateAndDownloadBundlePdf({ map, sheets }: BundleProps): Promise<void> {
  const doc = <BundleDocument map={map} sheets={sheets} />;
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cartographie-complete-${map.companyName.toLowerCase().replace(/\s+/g, '-')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Note importante :** `CartographyDocument` doit être exporté depuis `renderCartographyPdf.tsx`. Vérifier que la fonction est bien exportée (pas seulement `generateAndDownloadCartographyPdf`).

Modifier `src/engine/cartographie/renderCartographyPdf.tsx` — s'assurer que `CartographyDocument` est exporté :
```typescript
export function CartographyDocument({ ... }: CartographyPdfProps) { ... }
```

- [ ] **Étape 3 : Commit**

```bash
git add src/engine/cartographie/renderProcessSheetPdf.tsx src/engine/cartographie/renderBundlePdf.tsx src/engine/cartographie/renderCartographyPdf.tsx
git commit -m "feat(cartographie): renderProcessSheetPdf + renderBundlePdf (PDF complet auditeur MASE)"
```

---

## Task 7 : Tests + Build final + Push

- [ ] **Étape 1 : Lancer tous les tests**

```bash
npx vitest run src/types/cartographie.test.ts src/hooks/useCartographie.test.ts src/components/cartographie/shared/MapPreview.test.tsx src/components/cartographie/shared/TagInput.test.tsx src/pages/CartographieWizardPage.test.tsx
```

Résultat attendu : tous passent (20+ tests)

- [ ] **Étape 2 : Build de production**

```bash
npx vite build 2>&1 | tail -5
```

Résultat attendu : `✓ built in X.Xs` sans erreur TypeScript bloquante.

- [ ] **Étape 3 : Push**

```bash
git push origin main
```

---

## Self-Review

**Couverture spec Phase 2 :**

| Exigence | Tâche |
|---|---|
| Bloc A : identité + finalité + participants | Task 2 (BlockA) |
| Bloc B : flux + activités + ressources | Task 2 (BlockB) |
| Bloc C : objectif SMART + reformulation IA | Task 3 (BlockC) |
| KPIs lagging + leading (MASE Axe 4) | Task 3 (BlockC) |
| Bloc D : risques + documents + révision | Task 4 (BlockD) |
| Bouton "✨ Aide IA" réutilisable | Task 1 (AiAssistButton) |
| Saisie de listes (TagInput) | Task 1 (TagInput) |
| Phase2Wizard itère sur tous les processus | Task 5 |
| Ordre : réalisation → pilotage → support | Task 5 |
| Pré-remplissage inputs/outputs depuis Phase 1 | Task 2 (BlockB) |
| Sauvegarde Supabase après chaque fiche | Task 5 |
| PDF fiche de processus individuelle | Task 6 |
| PDF bundle complet (cartographie + fiches) | Task 6 |
| Écran de fin avec bouton téléchargement | Task 5 (Phase2Complete) |

**Hors périmètre (future itération) :**
- Export Word (.docx)
- Notifications email de révision annuelle
- Comparaison entre deux versions
- Collaboration multi-utilisateurs
