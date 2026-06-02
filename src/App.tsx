import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { useAccess } from './hooks/useAccess';
import { AuthButton } from './components/AuthButton';
import { AccessGate } from './components/AccessGate';
import Welcome from './components/Welcome';
import { Questionnaire } from './components/Questionnaire';
import { CompanyInfoForm } from './components/CompanyInfo';
import { PolicyPreview } from './components/PolicyPreview';
import { QUESTIONS } from './engine/questionnaire';
import { computeIndicators } from './engine/indicators';
import { selectBlocks } from './engine/selectBlocks';
import { downloadPolicyDocx } from './engine/renderDocx';
import { downloadPolicyPdf } from './engine/renderPdf';
import { enhanceWithMistral } from './engine/enhanceWithMistral';
import type { CompanyInfo, Indicators, SelectedBlock } from './engine/types';

export type Step = 'welcome' | 'questionnaire' | 'company' | 'preview';

const STEPS: { id: Step; label: string }[] = [
  { id: 'welcome',       label: 'Accueil' },
  { id: 'questionnaire', label: 'Questionnaire' },
  { id: 'company',       label: 'Infos entreprise' },
  { id: 'preview',       label: 'Politique SSE' },
];

export default function App() {
  const [step, setStep]       = useState<Step>('welcome');
  const [session, setSession] = useState<Session | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [answers, setAnswersState] = useState<Record<string, string>>({});
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '', sector: '', headcount: '', activities: '', employerName: '',
  });
  const [indicators,     setIndicators]     = useState<Indicators | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<SelectedBlock[]>([]);
  const [isEnhanced,   setIsEnhanced]   = useState(false);
  const [isEnhancing,  setIsEnhancing]  = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [paymentPending, setPaymentPending] = useState(false);

  // Gestion session auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const { hasPurchase, isLoading: accessLoading, savedAnswers, refetch } = useAccess(session);

  // Détection retour Stripe (?payment=success) — polling jusqu'à confirmation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'success') return;
    window.history.replaceState({}, '', '/');
    setPaymentPending(true);

    let count = 0;
    const interval = setInterval(() => {
      count++;
      refetch();
      if (count >= 5) clearInterval(interval);
    }, 2000);

    return () => clearInterval(interval);
  // refetch est stable (useCallback), pas de boucle infinie
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quand l'achat est confirmé après le retour Stripe
  useEffect(() => {
    if (paymentPending && hasPurchase) {
      setPaymentPending(false);
      setShowGate(false);
    }
  }, [paymentPending, hasPurchase]);

  // Fermer la gate automatiquement si l'achat est confirmé (ex: OAuth puis vérification)
  useEffect(() => {
    if (hasPurchase && showGate) {
      setShowGate(false);
    }
  }, [hasPurchase, showGate]);

  const setAnswer = (questionId: string, choiceValue: string) =>
    setAnswersState((prev) => ({ ...prev, [questionId]: choiceValue }));

  // Sauvegarde best-effort des réponses en fin de questionnaire
  const handleSaveAnswers = useCallback(async (answersToSave: Record<string, string>) => {
    if (!session) return;
    await supabase.from('questionnaire_progress').upsert(
      { user_id: session.user.id, answers: answersToSave, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  }, [session]);

  const handleStart = () => {
    if (hasPurchase) {
      setStep('questionnaire');
    } else {
      setShowGate(true);
    }
  };

  const handleResume = () => {
    if (savedAnswers) {
      setAnswersState(savedAnswers);
      setStep('company');
    }
  };

  const goToPreview = () => {
    const ind = computeIndicators(answers);
    setIndicators(ind);
    setSelectedBlocks(selectBlocks(ind));
    setIsEnhanced(false);
    setEnhanceError(null);
    setStep('preview');
  };

  const handleEnhance = async () => {
    if (!indicators) return;
    setIsEnhancing(true);
    setEnhanceError(null);
    try {
      setSelectedBlocks(await enhanceWithMistral(selectedBlocks, companyInfo, indicators));
      setIsEnhanced(true);
    } catch (err) {
      setEnhanceError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleRestart = () => {
    setAnswersState({});
    setCompanyInfo({ name: '', sector: '', headcount: '', activities: '', employerName: '' });
    setSelectedBlocks([]);
    setIsEnhanced(false);
    setEnhanceError(null);
    setStep('welcome');
  };

  const stepIndex     = STEPS.findIndex((s) => s.id === step);
  const answeredCount = Object.keys(answers).length;
  const progressPct   = (stepIndex / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#f5f5f3' }}>
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl bg-white p-6 shadow-lg md:p-8">

          {/* En-tête global */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[var(--mase-heading)] sm:text-3xl">
                Générateur de Politique SSE — MASE
              </h1>
              <p className="mt-1 text-sm text-[var(--mase-muted)]">
                Outil MVP pour créer une politique Santé, Sécurité, Environnement conforme aux exigences MASE.
              </p>
            </div>
            <AuthButton session={session} />
          </div>

          {/* Stepper global */}
          <div className="mt-6 rounded-2xl bg-[var(--mase-card-strong)] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--mase-primary)]">
                  ÉTAPE {stepIndex + 1} / {STEPS.length}
                </p>
                <p className="mt-0.5 text-sm text-[var(--mase-muted)]">{STEPS[stepIndex].label}</p>
              </div>
              <p className="shrink-0 text-sm text-[var(--mase-muted)]">
                {answeredCount} / {QUESTIONS.length} questions remplies
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--mase-primary-light)]/40">
              <div
                className="h-full rounded-full bg-[var(--mase-primary)] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Message paiement en attente */}
          {paymentPending && !hasPurchase && !accessLoading && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Paiement reçu, vérification en cours… rechargez la page dans quelques instants si l'accès ne s'ouvre pas automatiquement.
            </div>
          )}

          {/* Contenu de l'étape */}
          <div className="mt-6">
            {step === 'welcome' && (
              <Welcome
                onNext={handleStart}
                savedAnswers={savedAnswers}
                onResume={handleResume}
              />
            )}
            {step === 'questionnaire' && (
              <Questionnaire
                questions={QUESTIONS}
                answers={answers}
                setAnswer={setAnswer}
                onBack={() => setStep('welcome')}
                onContinue={() => setStep('company')}
                onSaveAnswers={handleSaveAnswers}
              />
            )}
            {step === 'company' && (
              <CompanyInfoForm
                companyInfo={companyInfo}
                setCompanyInfo={setCompanyInfo}
                onBack={() => setStep('questionnaire')}
                onNext={goToPreview}
              />
            )}
            {step === 'preview' && (
              <PolicyPreview
                companyInfo={companyInfo}
                selectedBlocks={selectedBlocks}
                isEnhanced={isEnhanced}
                isEnhancing={isEnhancing}
                enhanceError={enhanceError}
                onEnhance={handleEnhance}
                onBack={() => setStep('company')}
                onRestart={handleRestart}
                onDownload={() => downloadPolicyDocx(selectedBlocks, companyInfo)}
                onDownloadPdf={() => downloadPolicyPdf(selectedBlocks, companyInfo)}
              />
            )}
          </div>

        </div>
      </div>

      {/* Overlay de gating */}
      {showGate && (
        <AccessGate
          session={session}
          onClose={() => setShowGate(false)}
        />
      )}
    </div>
  );
}
