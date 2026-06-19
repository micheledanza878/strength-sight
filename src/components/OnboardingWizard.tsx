/**
 * OnboardingWizard
 *
 * Modale a 3 step mostrato ai nuovi utenti che non hanno ancora nessuna
 * scheda di allenamento. Persiste il completamento in localStorage con la
 * chiave `onboarding_completed` per non riproporsi nelle sessioni successive.
 *
 * Step 1 – Benvenuto: introduce l'app e guida alla creazione della prima scheda.
 * Step 2 – Dieta: spiega la sezione dieta e offre un link diretto.
 * Step 3 – Allenamento: invita ad avviare la prima sessione.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell, Salad, Zap, ChevronRight, ChevronLeft, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ── Tipi ──────────────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  /** Callback invocato quando l'utente completa o salta il wizard. */
  onClose: () => void;
}

// ── Dati degli step ───────────────────────────────────────────────────────────

interface Step {
  icon: React.ReactNode;
  /** Emoji decorativa mostrata nel cerchio grande */
  emoji: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaPath: string;
  /** Colore del gradiente per l'icona principale (classi Tailwind) */
  accentFrom: string;
  accentTo: string;
}

const STEPS: Step[] = [
  {
    icon: <Dumbbell className="w-7 h-7 text-white" />,
    emoji: "💪",
    title: "Crea la tua prima scheda",
    description:
      "Una scheda raccoglie i tuoi giorni di allenamento e gli esercizi di ognuno. " +
      "Crea la tua prima scheda personalizzata: scegli i gruppi muscolari, aggiungi " +
      "gli esercizi e parti con il piede giusto.",
    ctaLabel: "Crea la tua prima scheda",
    ctaPath: "/create-plan",
    accentFrom: "from-violet-500",
    accentTo: "to-purple-600",
  },
  {
    icon: <Salad className="w-7 h-7 text-white" />,
    emoji: "🥗",
    title: "Tieni traccia della dieta",
    description:
      "La sezione Dieta ti permette di pianificare i pasti, consultare la guida " +
      "agli alimenti e monitorare l'apporto nutrizionale. " +
      "Un'alimentazione corretta amplifica ogni allenamento.",
    ctaLabel: "Vai alla dieta",
    ctaPath: "/diet",
    accentFrom: "from-emerald-500",
    accentTo: "to-green-600",
  },
  {
    icon: <Zap className="w-7 h-7 text-white" />,
    emoji: "⚡",
    title: "Avvia il tuo primo allenamento",
    description:
      "Quando hai la tua scheda pronta, vai nella sezione Allenamento, scegli il " +
      "giorno e inizia la sessione. Ogni serie registrata diventa un dato che " +
      "puoi analizzare nel tempo.",
    ctaLabel: "Avvia il primo allenamento",
    ctaPath: "/workout",
    accentFrom: "from-orange-500",
    accentTo: "to-amber-500",
  },
];

const STORAGE_KEY = "onboarding_completed";

// ── Componente ────────────────────────────────────────────────────────────────

export default function OnboardingWizard({ onClose }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const step = STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;

  /** Marca l'onboarding come completato e chiude il modale. */
  function complete() {
    localStorage.setItem(STORAGE_KEY, "true");
    onClose();
  }

  /** Naviga al link CTA dello step corrente e chiude il wizard. */
  function handleCta() {
    complete();
    navigate(step.ctaPath);
  }

  function handleNext() {
    if (isLast) {
      complete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(0, s - 1));
  }

  return (
    <Dialog
      open
      // Impedisce la chiusura cliccando l'overlay: l'utente deve usare "Salta"
      onOpenChange={(open) => {
        if (!open) complete();
      }}
    >
      <DialogContent
        // Stile coerente con il design system dark dell'app
        className="
          bg-card border border-border rounded-3xl
          w-[calc(100vw-2rem)] max-w-sm
          p-0 overflow-hidden
          focus:outline-none
        "
        // Nasconde la X di default di DialogContent: usiamo il pulsante Salta
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
      >
        {/* ── Pulsante Salta in alto a destra ── */}
        <button
          onClick={complete}
          aria-label="Salta onboarding"
          className="
            absolute top-3 right-3 z-10
            w-8 h-8 rounded-xl
            bg-secondary text-muted-foreground
            flex items-center justify-center
            hover:text-foreground transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          "
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── Hero visuale con gradiente per step ── */}
        <div
          className={`
            relative flex flex-col items-center justify-center
            h-44 bg-gradient-to-br ${step.accentFrom} ${step.accentTo}
            transition-all duration-500
          `}
          aria-hidden="true"
        >
          {/* Cerchio icona */}
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-2 shadow-lg">
            {step.icon}
          </div>
          {/* Emoji decorativa grande */}
          <span className="text-4xl select-none">{step.emoji}</span>

          {/* Step indicator sovrapposto in basso */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`
                  block rounded-full transition-all duration-300
                  ${i === currentStep
                    ? "w-6 h-2 bg-white"
                    : "w-2 h-2 bg-white/40"
                  }
                `}
              />
            ))}
          </div>
        </div>

        {/* ── Contenuto testuale ── */}
        <div className="px-6 pt-5 pb-6">
          {/* Label step */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Passo {currentStep + 1} di {STEPS.length}
          </p>

          <DialogTitle
            id="onboarding-title"
            className="text-xl font-bold tracking-tight mb-3 leading-tight"
          >
            {step.title}
          </DialogTitle>

          <DialogDescription
            id="onboarding-description"
            className="text-sm text-muted-foreground leading-relaxed mb-6"
          >
            {step.description}
          </DialogDescription>

          {/* ── CTA principale: link diretto alla sezione ── */}
          <button
            onClick={handleCta}
            className="
              w-full h-12 rounded-2xl
              gradient-primary text-white
              font-semibold text-sm tracking-wide
              flex items-center justify-center gap-2
              active:scale-[0.97] transition-transform
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              mb-3
            "
          >
            {step.ctaLabel}
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* ── Navigazione wizard: Indietro / Avanti ── */}
          <div className="flex items-center gap-2">
            {/* Indietro: visibile solo dallo step 2 in poi */}
            {!isFirst ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBack}
                className="flex-1 rounded-xl h-10"
                aria-label="Torna al passo precedente"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Indietro
              </Button>
            ) : (
              /* Placeholder per mantenere l'allineamento */
              <div className="flex-1" />
            )}

            <Button
              variant={isLast ? "secondary" : "outline"}
              size="sm"
              onClick={handleNext}
              className="flex-1 rounded-xl h-10"
              aria-label={isLast ? "Chiudi wizard" : "Vai al passo successivo"}
            >
              {isLast ? (
                "Chiudi"
              ) : (
                <>
                  Avanti
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
