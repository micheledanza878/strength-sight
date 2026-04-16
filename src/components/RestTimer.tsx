import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface RestTimerProps {
  seconds: number;
  color?: string;
  onComplete: () => void;
  onDismiss: () => void;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export default function RestTimer({ seconds, color = "hsl(var(--primary))", onComplete, onDismiss }: RestTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const [total, setTotal] = useState(seconds);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (remaining <= 0) {
      onCompleteRef.current();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]); // onComplete escluso dalle deps — il re-render del parent resettava il timeout

  function addTime(delta: number) {
    setRemaining((r) => Math.max(0, r + delta));
    setTotal((t) => Math.max(0, t + delta));
  }

  const progress = total > 0 ? ((total - remaining) / total) * 100 : 100;
  const circumference = 2 * Math.PI * 45;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 w-full px-8">

        <button onClick={onDismiss} className="absolute top-14 right-6 text-muted-foreground">
          <X className="w-6 h-6" />
        </button>

        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Recupero</p>

        {/* Circular timer */}
        <div className="relative w-52 h-52">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--secondary))" strokeWidth="5" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress / 100)}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-bold tabular-nums">{formatTime(remaining)}</span>
          </div>
        </div>

        {/* +/- time buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => addTime(-15)}
            className="w-14 h-14 rounded-2xl bg-secondary text-foreground font-bold text-sm transition-transform active:scale-95"
          >
            −15s
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 h-14 rounded-2xl bg-secondary text-foreground font-semibold text-base px-8 transition-transform active:scale-95"
          >
            Salta
          </button>
          <button
            onClick={() => addTime(30)}
            className="w-14 h-14 rounded-2xl bg-secondary text-foreground font-bold text-sm transition-transform active:scale-95"
          >
            +30s
          </button>
        </div>

      </div>
    </div>
  );
}
