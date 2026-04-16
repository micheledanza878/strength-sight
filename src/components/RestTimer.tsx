import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface RestTimerProps {
  seconds: number;
  onComplete: () => void;
  onDismiss: () => void;
}

export default function RestTimer({ seconds, onComplete, onDismiss }: RestTimerProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onComplete]);

  const progress = ((seconds - remaining) / seconds) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        <button onClick={onDismiss} className="absolute top-12 right-6 text-muted-foreground">
          <X className="w-6 h-6" />
        </button>
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Recupero</p>
        <div className="relative w-48 h-48">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--secondary))" strokeWidth="4" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-bold tabular-nums text-foreground">{remaining}</span>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="mt-4 px-8 py-3 rounded-full bg-secondary text-foreground font-semibold text-base"
        >
          Salta
        </button>
      </div>
    </div>
  );
}
