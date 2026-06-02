# Homepage Plateforme MASE — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre `HomePage.tsx` pour positionner MASE comme plateforme multi-outils, ajouter un modal "Me notifier" avec sauvegarde Supabase, et mettre à jour le SEO.

**Architecture:** Structure plateforme-first avec grille de 3 outils (1 disponible + 2 bientôt). Le `NotifyModal` est un composant autonome qui insère un email dans la table Supabase `tool_notifications`. Le style suit la direction "Soft & Élevé" avec micro-dégradés, ombres et hover lift sur les cards.

**Tech Stack:** React 19, Tailwind v4, TypeScript, Supabase JS v2, react-router-dom v7, Vitest 2, jsdom, @testing-library/react

---

## Fichiers impactés

| Action | Fichier | Responsabilité |
|---|---|---|
| Modifier | `vitest.config.ts` | Activer jsdom pour les tests React |
| Créer | `src/components/NotifyModal.tsx` | Modal email capture autonome |
| Créer | `src/components/NotifyModal.test.tsx` | Tests unitaires du modal |
| Réécrire | `src/pages/HomePage.tsx` | Page complète plateforme |
| Modifier | `index.html` | SEO title + meta + OG plateforme |
| Supabase | migration SQL | Table `tool_notifications` |

---

## Task 1 : Supabase — créer la table `tool_notifications`

**Files:**
- Migration SQL appliquée via Supabase dashboard ou MCP

- [ ] **Step 1 : Appliquer la migration SQL**

Ouvrir le dashboard Supabase → SQL Editor → coller et exécuter :

```sql
create table public.tool_notifications (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  tool_slug   text not null,
  created_at  timestamptz not null default now()
);

alter table public.tool_notifications enable row level security;

create policy "allow public insert"
  on public.tool_notifications
  for insert
  with check (true);
```

- [ ] **Step 2 : Vérifier que la table existe**

Dans le SQL Editor, exécuter :

```sql
select * from public.tool_notifications limit 1;
```

Résultat attendu : `0 rows` (pas d'erreur).

- [ ] **Step 3 : Insérer une ligne de test et la supprimer**

```sql
insert into public.tool_notifications (email, tool_slug)
values ('test@example.com', 'document-unique');

select * from public.tool_notifications;
-- Attendu : 1 ligne visible

delete from public.tool_notifications where email = 'test@example.com';
```

---

## Task 2 : Configurer jsdom pour les tests React

**Files:**
- Modify: `vitest.config.ts`
- Run: `npm install`

- [ ] **Step 1 : Installer les dépendances de test**

```bash
npm install -D jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Résultat attendu : packages ajoutés dans `package.json`, pas d'erreur npm.

- [ ] **Step 2 : Mettre à jour `vitest.config.ts`**

Remplacer le contenu entier de `vitest.config.ts` par :

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

- [ ] **Step 3 : Créer `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 4 : Vérifier que vitest démarre**

```bash
npx vitest run
```

Résultat attendu : `No test files found` (pas d'erreur de config).

- [ ] **Step 5 : Commit**

```bash
git add vitest.config.ts src/test-setup.ts package.json package-lock.json
git commit -m "test: setup jsdom + @testing-library/react for component tests"
```

---

## Task 3 : Composant `NotifyModal` — TDD

**Files:**
- Create: `src/components/NotifyModal.tsx`
- Create: `src/components/NotifyModal.test.tsx`

Le composant reçoit `toolName`, `toolSlug`, `onClose`. Il affiche un champ email, appelle `supabase.from('tool_notifications').insert(...)` au submit, et gère les états `idle / loading / success / error`.

- [ ] **Step 1 : Créer le fichier de test avec les tests échouants**

Créer `src/components/NotifyModal.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotifyModal } from './NotifyModal';

// Mock du client Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe('NotifyModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
  });

  it('affiche le nom de l\'outil dans le titre', () => {
    render(
      <NotifyModal
        toolName="Document Unique"
        toolSlug="document-unique"
        onClose={onClose}
      />
    );
    expect(screen.getByText(/Document Unique/)).toBeInTheDocument();
  });

  it('n\'appelle pas supabase si l\'email est vide', async () => {
    const { supabase } = await import('../lib/supabase');
    render(
      <NotifyModal
        toolName="Document Unique"
        toolSlug="document-unique"
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /M'inscrire/ }));
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('affiche "Inscrit !" après un insert réussi', async () => {
    render(
      <NotifyModal
        toolName="Document Unique"
        toolSlug="document-unique"
        onClose={onClose}
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/votre@email.com/), {
      target: { value: 'user@test.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /M'inscrire/ }));
    await waitFor(() =>
      expect(screen.getByText(/Inscrit/)).toBeInTheDocument()
    );
  });

  it('ferme le modal au clic sur la croix', () => {
    render(
      <NotifyModal
        toolName="Document Unique"
        toolSlug="document-unique"
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /×/ }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
npx vitest run src/components/NotifyModal.test.tsx
```

Résultat attendu : `FAIL — Cannot find module './NotifyModal'`

- [ ] **Step 3 : Implémenter `NotifyModal.tsx`**

Créer `src/components/NotifyModal.tsx` :

```tsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface NotifyModalProps {
  toolName: string;
  toolSlug: string;
  onClose: () => void;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export function NotifyModal({ toolName, toolSlug, onClose }: NotifyModalProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    const { error } = await supabase
      .from('tool_notifications')
      .insert({ email, tool_slug: toolSlug });
    setStatus(error ? 'error' : 'success');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="×"
          className="absolute right-4 top-4 text-xl text-slate-400 hover:text-slate-700"
        >
          ×
        </button>

        <h2 className="mb-1 text-lg font-bold text-[var(--mase-heading)]">
          Être notifié pour {toolName}
        </h2>
        <p className="mb-6 text-sm text-[var(--mase-muted)]">
          On vous prévient dès que l'outil est disponible.
        </p>

        {status === 'success' ? (
          <p className="text-center font-semibold text-emerald-600">
            ✓ Inscrit ! Vous serez notifié à la sortie.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="rounded-xl border border-[var(--mase-border)] px-4 py-3 text-sm outline-none focus:border-[var(--mase-primary)] focus:ring-2 focus:ring-[var(--mase-primary)]/20"
            />
            {status === 'error' && (
              <p className="text-xs text-red-500">
                Une erreur est survenue. Réessayez.
              </p>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="rounded-full py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: 'var(--mase-primary)' }}
            >
              {status === 'loading' ? 'Envoi…' : "M'inscrire"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
npx vitest run src/components/NotifyModal.test.tsx
```

Résultat attendu : `4 tests passed`

- [ ] **Step 5 : Commit**

```bash
git add src/components/NotifyModal.tsx src/components/NotifyModal.test.tsx
git commit -m "feat: add NotifyModal component with Supabase email capture"
```

---

## Task 4 : HomePage — Nav + Hero

**Files:**
- Modify: `src/pages/HomePage.tsx` (réécriture complète, on part de zéro)

- [ ] **Step 1 : Remplacer le contenu de `HomePage.tsx` par la structure Nav + Hero uniquement**

```tsx
import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>

      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <span className="text-lg font-bold text-white">MASE</span>
        <Link
          to="/outil"
          className="text-sm text-white/70 transition hover:text-white"
        >
          Se connecter
        </Link>
      </nav>

      {/* Hero */}
      <section
        className="relative overflow-hidden px-6 py-20 text-center"
        style={{
          background: 'linear-gradient(135deg, var(--mase-primary), #1e4d7b)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.06), transparent 60%)',
          }}
        />
        <span
          className="relative mb-4 inline-block rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white"
          style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          🌿 Plateforme MASE · Conforme V2024
        </span>
        <h1 className="relative mt-4 text-3xl font-extrabold text-white sm:text-4xl">
          Toute la documentation MASE,<br />facile
        </h1>
        <p className="relative mt-4 text-base text-white/70">
          Les outils pour obtenir et renouveler votre certification MASE
        </p>
        <a
          href="#outils"
          className="relative mt-8 inline-block rounded-full px-8 py-3 text-sm font-bold text-[var(--mase-primary)] transition hover:opacity-90"
          style={{
            backgroundColor: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          Découvrir les outils ↓
        </a>
      </section>

      {/* Footer provisoire */}
      <footer
        className="px-6 py-4 text-center"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <span className="text-xs text-white/40">
          © 2026 MASE Tools — Toute la documentation certifiante.
        </span>
      </footer>

    </div>
  );
}
```

- [ ] **Step 2 : Vérifier visuellement dans le navigateur**

```bash
npm run dev
```

Ouvrir `http://localhost:5173`. Vérifier :
- Nav verte avec "MASE" et "Se connecter"
- Hero avec dégradé vert → bleu, badge glassmorphism, H1, CTA blanc

- [ ] **Step 3 : Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: homepage nav + hero plateforme"
```

---

## Task 5 : HomePage — Grille d'outils + NotifyModal

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1 : Ajouter les imports et l'état modal en haut du fichier**

Remplacer le début de `HomePage.tsx` :

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { NotifyModal } from '../components/NotifyModal';

type ModalState = { toolName: string; toolSlug: string } | null;

export default function HomePage() {
  const [modal, setModal] = useState<ModalState>(null);
```

- [ ] **Step 2 : Ajouter la section grille d'outils entre le Hero et le Footer**

Insérer après la balise `</section>` du Hero et avant `{/* Footer */}` :

```tsx
      {/* Grille d'outils */}
      <section id="outils" className="bg-white px-6 py-14">
        <p className="mb-10 text-center text-xs font-bold uppercase tracking-widest text-[var(--mase-muted)]">
          Nos outils
        </p>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">

          {/* Politique SSE — disponible */}
          <div
            className="flex flex-col items-center rounded-2xl p-7 text-center transition-all duration-200 hover:-translate-y-1"
            style={{
              background: 'linear-gradient(145deg, #dcfce7, #bbf7d0)',
              border: '1.5px solid #86efac',
              boxShadow: '0 2px 8px rgba(22,101,52,0.12)',
            }}
            onMouseEnter={e =>
              ((e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 8px 20px rgba(22,101,52,0.18)')
            }
            onMouseLeave={e =>
              ((e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 2px 8px rgba(22,101,52,0.12)')
            }
          >
            <span className="mb-3 text-4xl">📋</span>
            <span className="mb-1 inline-block rounded-full bg-[var(--mase-primary)] px-3 py-0.5 text-xs font-bold text-white">
              ✓ Disponible
            </span>
            <h2 className="mt-3 text-base font-extrabold text-[var(--mase-heading)]">
              Politique SSE
            </h2>
            <p className="mt-1 text-xs text-[var(--mase-muted)]">
              Conforme Exig. 1.2 MASE V2024 · 10 min
            </p>
            <div className="mt-4">
              <span className="text-2xl font-extrabold text-[var(--mase-heading)]">
                29 €
              </span>
              <span className="ml-1 text-xs text-[var(--mase-muted)]">
                paiement unique
              </span>
            </div>
            <Link
              to="/outil"
              className="mt-5 inline-block rounded-full px-7 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: 'var(--mase-primary)' }}
            >
              Démarrer →
            </Link>
          </div>

          {/* Document Unique — bientôt */}
          <div
            className="flex flex-col items-center rounded-2xl p-7 text-center opacity-85 transition-all duration-200 hover:-translate-y-1"
            style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
            }}
            onMouseEnter={e =>
              ((e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 4px 12px rgba(0,0,0,0.08)')
            }
            onMouseLeave={e =>
              ((e.currentTarget as HTMLDivElement).style.boxShadow = 'none')
            }
          >
            <span className="mb-3 text-4xl">📂</span>
            <span className="mb-1 inline-block rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-400">
              Bientôt
            </span>
            <h2 className="mt-3 text-base font-extrabold text-[var(--mase-heading)]">
              Document Unique
            </h2>
            <p className="mt-1 text-xs text-[var(--mase-muted)]">
              Évaluation des risques professionnels
            </p>
            <button
              onClick={() =>
                setModal({ toolName: 'Document Unique', toolSlug: 'document-unique' })
              }
              className="mt-6 inline-block rounded-full px-7 py-2.5 text-sm font-bold transition hover:bg-[var(--mase-primary)] hover:text-white"
              style={{
                background: 'white',
                border: '1.5px solid var(--mase-primary)',
                color: 'var(--mase-primary)',
              }}
            >
              🔔 Me notifier
            </button>
          </div>

          {/* Plan de Prévention — bientôt */}
          <div
            className="flex flex-col items-center rounded-2xl p-7 text-center opacity-85 transition-all duration-200 hover:-translate-y-1"
            style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
            }}
            onMouseEnter={e =>
              ((e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 4px 12px rgba(0,0,0,0.08)')
            }
            onMouseLeave={e =>
              ((e.currentTarget as HTMLDivElement).style.boxShadow = 'none')
            }
          >
            <span className="mb-3 text-4xl">🛡️</span>
            <span className="mb-1 inline-block rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-400">
              Bientôt
            </span>
            <h2 className="mt-3 text-base font-extrabold text-[var(--mase-heading)]">
              Plan de Prévention
            </h2>
            <p className="mt-1 text-xs text-[var(--mase-muted)]">
              Co-activité et sous-traitance
            </p>
            <button
              onClick={() =>
                setModal({ toolName: 'Plan de Prévention', toolSlug: 'plan-prevention' })
              }
              className="mt-6 inline-block rounded-full px-7 py-2.5 text-sm font-bold transition hover:bg-[var(--mase-primary)] hover:text-white"
              style={{
                background: 'white',
                border: '1.5px solid var(--mase-primary)',
                color: 'var(--mase-primary)',
              }}
            >
              🔔 Me notifier
            </button>
          </div>

        </div>
      </section>

      {/* Modal */}
      {modal && (
        <NotifyModal
          toolName={modal.toolName}
          toolSlug={modal.toolSlug}
          onClose={() => setModal(null)}
        />
      )}
```

- [ ] **Step 3 : Vérifier visuellement dans le navigateur**

```bash
npm run dev
```

Vérifier sur `http://localhost:5173` :
- Grille de 3 cards visible sous le Hero
- Card SSE verte avec dégradé et bouton "Démarrer →"
- Cards grises avec bouton "🔔 Me notifier"
- Clic "Me notifier" → modal s'ouvre avec le bon nom d'outil
- Clic croix ou overlay → modal se ferme
- Hover sur les cards → léger soulèvement

- [ ] **Step 4 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 5 : Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: homepage tool grid with NotifyModal integration"
```

---

## Task 6 : HomePage — Sections SSE + Footer

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1 : Ajouter les sections SSE entre la grille d'outils et le Footer**

Insérer après la fermeture de `</section>` de la grille d'outils (avant `{/* Modal */}`) :

```tsx
      {/* Comment ça marche — Politique SSE */}
      <section
        className="px-6 py-14"
        style={{ backgroundColor: 'var(--mase-card-strong)' }}
      >
        <p className="mb-10 text-center text-xs font-bold uppercase tracking-widest text-[var(--mase-muted)]">
          Comment fonctionne la Politique SSE
        </p>
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: '📋', step: '1 — Diagnostic', desc: '~20 questions SWOT + PESTEL SSE' },
            { icon: '⚡', step: '2 — Génération', desc: 'Politique personnalisée à votre profil' },
            { icon: '📥', step: '3 — Téléchargement', desc: 'DOCX + PDF prêts à dater et signer' },
          ].map(({ icon, step, desc }) => (
            <div
              key={step}
              className="rounded-2xl bg-white p-5 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-2 text-3xl">{icon}</div>
              <div className="text-sm font-semibold text-[var(--mase-heading)]">{step}</div>
              <div className="mt-1 text-xs text-[var(--mase-muted)]">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Ce que contient le document */}
      <section className="bg-white px-6 py-14">
        <p className="mb-10 text-center text-xs font-bold uppercase tracking-widest text-[var(--mase-muted)]">
          Ce que contient le document
        </p>
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            'Préambule & engagement employeur',
            '6 principes essentiels SSE (§1.2.1)',
            'Engagements Sécurité, Santé, Environnement (§1.2.4/5/6)',
            'Axes prioritaires personnalisés',
            "Démarche d'amélioration continue",
            'Date + signature employeur (§1.2.2)',
          ].map(item => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ backgroundColor: '#f0f7ff' }}
            >
              <span className="text-base font-bold text-[var(--mase-primary)]">✓</span>
              <span className="text-sm text-slate-700">{item}</span>
            </div>
          ))}
        </div>
      </section>
```

- [ ] **Step 2 : Mettre à jour le Footer (déjà présent, vérifier le texte)**

S'assurer que le Footer contient :

```tsx
      <footer
        className="px-6 py-4 text-center"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <span className="text-xs text-white/40">
          © 2026 MASE Tools — Toute la documentation certifiante.
        </span>
      </footer>
```

- [ ] **Step 3 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 4 : Vérifier visuellement dans le navigateur**

Sur `http://localhost:5173`, vérifier le scroll complet de la page :
- Section "Comment fonctionne la Politique SSE" avec 3 cards sur fond vert clair
- Section "Ce que contient le document" avec checklist bleue
- Footer vert avec le nouveau texte

- [ ] **Step 5 : Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: homepage SSE detail sections and footer"
```

---

## Task 7 : SEO — mettre à jour `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Step 1 : Ouvrir `index.html` et localiser les balises à modifier**

Les balises à modifier sont dans le `<head>`. Chercher :
- `<title>` — actuellement focalisé sur la Politique SSE
- `<meta name="description">`
- `<meta property="og:title">`
- `<meta property="og:description">`
- `<meta name="twitter:title">`
- `<meta name="twitter:description">`

- [ ] **Step 2 : Remplacer le `<title>`**

Ancienne valeur :
```html
<title>Politique SSE MASE en 10 min — Conforme Exigence 1.2 | MASE Tools</title>
```

Nouvelle valeur :
```html
<title>MASE Tools — Toute la documentation certifiante MASE</title>
```

- [ ] **Step 3 : Remplacer la meta description**

Ancienne valeur :
```html
<meta name="description" content="Générez une Politique SSE conforme MASE V2024 en 10 minutes. Document Word + PDF prêt à signer. Pour PME du BTP et de l'industrie. 29 € paiement unique." />
```

Nouvelle valeur :
```html
<meta name="description" content="La plateforme des outils MASE : Politique SSE, Document Unique, Plan de Prévention. Documents conformes V2024 générés en 10 minutes. Pour PME du BTP et de l'industrie." />
```

- [ ] **Step 4 : Remplacer les balises OG et Twitter**

Remplacer `og:title` :
```html
<meta property="og:title" content="MASE Tools — Toute la documentation certifiante MASE" />
```

Remplacer `og:description` :
```html
<meta property="og:description" content="La plateforme des outils MASE : Politique SSE, Document Unique, Plan de Prévention. Documents conformes V2024 générés en 10 minutes." />
```

Remplacer `twitter:title` :
```html
<meta name="twitter:title" content="MASE Tools — Toute la documentation certifiante MASE" />
```

Remplacer `twitter:description` :
```html
<meta name="twitter:description" content="La plateforme des outils MASE : Politique SSE, Document Unique, Plan de Prévention. Documents conformes V2024 générés en 10 minutes." />
```

- [ ] **Step 5 : Vérifier dans le navigateur**

Dans les DevTools (`F12`) → onglet Elements → chercher `<title>`. Confirmer le nouveau texte.

- [ ] **Step 6 : Commit**

```bash
git add index.html
git commit -m "seo: update title and meta for multi-tool platform vision"
```

---

## Vérification finale

- [ ] `npx tsc --noEmit` → 0 erreur
- [ ] `npx vitest run` → tous les tests passent
- [ ] `npm run build` → build sans erreur
- [ ] Parcourir `http://localhost:5173` : scroll complet, modal fonctionnel, lien "Démarrer →" mène à `/outil`
- [ ] Vérifier dans Supabase que les inscriptions "Me notifier" apparaissent dans `tool_notifications`
