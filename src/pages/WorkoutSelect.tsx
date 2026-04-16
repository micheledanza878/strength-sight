import { useNavigate } from "react-router-dom";
import { WORKOUT_DAYS } from "@/data/workouts";
import { ChevronRight } from "lucide-react";

export default function WorkoutSelect() {
  const navigate = useNavigate();

  return (
    <div className="px-5 pt-14 pb-24 min-h-screen">
      <h1 className="text-3xl font-bold mb-1">Schede</h1>
      <p className="text-muted-foreground text-sm mb-6">Scegli il tuo allenamento</p>

      <div className="flex flex-col gap-3">
        {WORKOUT_DAYS.map((day) => (
          <button
            key={day.id}
            onClick={() => navigate(`/session/${day.id}`)}
            className="w-full bg-card rounded-2xl p-5 text-left flex items-center justify-between active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: day.color + "22", color: day.color }}
              >
                {day.id}
              </div>
              <div>
                <p className="font-semibold text-base">{day.label}</p>
                <p className="text-sm text-muted-foreground">{day.title} · {day.exercises.length} esercizi</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
