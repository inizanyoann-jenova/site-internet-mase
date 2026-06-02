import { useMemo, useState } from 'react';
import type { Question } from '../engine/types';

interface Props {
  questions: Question[];
  answers: Record<string, string>;
  setAnswer: (questionId: string, choiceValue: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onSaveAnswers: (answers: Record<string, string>) => void;
}

const QUESTIONS_PER_PAGE = 5;

export function Questionnaire({ questions, answers, setAnswer, onBack, onContinue, onSaveAnswers }: Props) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(questions.length / QUESTIONS_PER_PAGE);

  const pageQuestions = useMemo(
    () => questions.slice(page * QUESTIONS_PER_PAGE, page * QUESTIONS_PER_PAGE + QUESTIONS_PER_PAGE),
    [page, questions],
  );

  const answeredCount = questions.filter((question) => answers[question.id]).length;
  const missingOnPage = pageQuestions.filter((question) => !answers[question.id]).length;
  const canContinue = missingOnPage === 0;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-[var(--mase-card-strong)] p-6 sm:p-8">
        <div className="flex flex-col gap-4 rounded-3xl bg-[var(--mase-surface)] p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--mase-heading)]">Questionnaire diagnostique</h2>
              <p className="mt-2 text-[var(--mase-muted)]">
                Répondez aux questions fermées pour que l'outil génère une politique SSE adaptée.
              </p>
            </div>
            <div className="space-y-2 text-right">
              <div className="rounded-full bg-[var(--mase-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm">
                Étape {page + 1} sur {pageCount}
              </div>
              <div className="text-sm text-[var(--mase-muted)]">{answeredCount} / {questions.length} questions complétées</div>
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[var(--mase-primary-light)]/40">
            <div
              className="h-full rounded-full bg-[var(--mase-primary)] transition-all duration-300"
              style={{ width: `${Math.round(((page + 1) / pageCount) * 100)}%` }}
            />
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {pageQuestions.map((question) => (
            <div key={question.id} className="rounded-3xl border mase-card p-5">
              <p className="font-medium text-[var(--mase-heading)]">{question.label}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-1">
                {question.choices.map((choice) => (
                  <label
                    key={choice.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                      answers[question.id] === choice.value
                        ? 'border-[var(--mase-primary)] bg-[var(--mase-primary)] text-white'
                        : 'border-[var(--mase-border)] bg-[var(--mase-surface)] text-[var(--mase-text)] hover:border-[var(--mase-primary)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={choice.value}
                      checked={answers[question.id] === choice.value}
                      onChange={() => setAnswer(question.id, choice.value)}
                      className="h-4 w-4 accent-slate-900"
                    />
                    <span>{choice.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-slate-500">
          {missingOnPage > 0 ? `Il reste ${missingOnPage} question(s) à répondre sur cette page.` : 'Toutes les questions de cette page sont répondues.'}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={page === 0 ? onBack : () => setPage((current) => Math.max(0, current - 1))}
          className="inline-flex items-center justify-center rounded-full border border-[var(--mase-border)] bg-[var(--mase-surface)] px-5 py-3 text-sm font-semibold text-[var(--mase-primary)] transition hover:bg-[var(--mase-primary-light)]/20"
        >
          {page === 0 ? 'Retour' : 'Page précédente'}
        </button>

        <button
          type="button"
          onClick={() => {
            if (!canContinue) return;
            if (page < pageCount - 1) {
              setPage((current) => current + 1);
            } else {
              onSaveAnswers(answers);
              onContinue();
            }
          }}
          disabled={!canContinue}
          className="inline-flex items-center justify-center rounded-full bg-[var(--mase-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--mase-primary-dark)] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {page < pageCount - 1 ? 'Suivant' : 'Voir les infos entreprise'}
        </button>
      </div>
    </div>
  );
}
