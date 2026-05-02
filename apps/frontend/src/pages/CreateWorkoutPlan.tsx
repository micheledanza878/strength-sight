import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, Loader, ChevronRight } from "lucide-react";
import { apiRequest } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BodyPart } from "@strength-sight/shared";

interface Exercise { exercise_name: string; sets: number; reps_min: number; reps_max: number; rest_seconds: number; notes: string; primary_body_part_id?: string; }
interface WorkoutDay { day_name: string; exercises: Exercise[]; }
type Step = "plan" | "days" | "exercises";

export default function CreateWorkoutPlan() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("plan");
  const [planName, setPlanName] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("4");
  const [numDays, setNumDays] = useState("4");
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [currentDayIdx, setCurrentDayIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([]);

  useEffect(() => {
    apiRequest<BodyPart[]>('/api/body-parts').then(setBodyParts).catch(() => {});
  }, []);

  function handlePlanNext() {
    if (!planName.trim()) { toast({ title: "Errore", description: "Inserisci il nome della scheda", variant: "destructive" }); return; }
    const num = parseInt(numDays) || 1;
    setDays(Array.from({ length: num }, (_, i) => ({ day_name: `Giorno ${i + 1}`, exercises: [] })));
    setStep("days");
  }

  function handleDaysNext() {
    for (let i = 0; i < days.length; i++) {
      if (!days[i].day_name.trim()) { toast({ title: "Errore", description: `Inserisci il nome del giorno ${i + 1}`, variant: "destructive" }); return; }
    }
    setStep("exercises"); setCurrentDayIdx(0);
  }

  function addExercise() { const updated = [...days]; updated[currentDayIdx].exercises.push({ exercise_name: "", sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90, notes: "" }); setDays(updated); }
  function removeExercise(exIdx: number) { const updated = [...days]; updated[currentDayIdx].exercises.splice(exIdx, 1); setDays(updated); }
  function updateExercise(exIdx: number, field: keyof Exercise, value: any) { const updated = [...days]; updated[currentDayIdx].exercises[exIdx] = { ...updated[currentDayIdx].exercises[exIdx], [field]: value }; setDays(updated); }
  function updateDayName(idx: number, name: string) { const updated = [...days]; updated[idx].day_name = name; setDays(updated); }

  async function savePlan() {
    for (let i = 0; i < days.length; i++) {
      if (days[i].exercises.length === 0) { toast({ title: "Errore", description: `Aggiungi almeno un esercizio a "${days[i].day_name}"`, variant: "destructive" }); return; }
      for (let j = 0; j < days[i].exercises.length; j++) {
        if (!days[i].exercises[j].exercise_name.trim()) { toast({ title: "Errore", description: `Esercizio ${j + 1} in "${days[i].day_name}" senza nome`, variant: "destructive" }); return; }
      }
    }
    setSaving(true);
    try {
      const payload = {
        name: planName,
        duration_weeks: parseInt(durationWeeks) || null,
        days: days.map((day, idx) => ({
          day_name: day.day_name, day_number: idx + 1,
          exercises: day.exercises.map((ex, exIdx) => ({ ...ex, order_number: exIdx + 1, primary_body_part_id: ex.primary_body_part_id || null })),
        })),
      };
      const data = await apiRequest<{ id: string }>('/api/workout-plans', { method: 'POST', body: JSON.stringify(payload) });
      toast({ title: "Successo", description: "Scheda creata con successo!" });
      localStorage.setItem('activePlanId', data.id);
      navigate("/workout");
    } catch (error) {
      console.error("Errore salvataggio scheda:", error);
      toast({ title: "Errore", description: "Impossibile salvare la scheda", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen px-5 pt-14 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => { if (step === "plan") navigate(-1); else if (step === "days") setStep("plan"); else setStep("days"); }} className="text-muted-foreground"><ArrowLeft className="w-6 h-6" /></button>
        <div><h1 className="text-3xl font-bold">Nuova Scheda</h1><p className="text-xs text-muted-foreground mt-1">{step === "plan" ? "Informazioni generali" : step === "days" ? "Configura i giorni" : `Esercizi - ${days[currentDayIdx]?.day_name}`}</p></div>
      </div>

      {step === "plan" && (
        <div className="space-y-4 mb-8 animate-in fade-in duration-300">
          <div><label className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-2">Nome scheda</label><input type="text" placeholder="es. Upper/Lower 4 Giorni" value={planName} onChange={(e) => setPlanName(e.target.value)} className="w-full h-12 bg-card border border-border rounded-xl px-4 text-foreground outline-none focus:border-primary" /></div>
          <div><label className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-2">Durata (settimane)</label><input type="number" placeholder="4" value={durationWeeks} onChange={(e) => setDurationWeeks(e.target.value)} min="1" max="52" className="w-full h-12 bg-card border border-border rounded-xl px-4 text-foreground outline-none focus:border-primary" /></div>
          <div><label className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-2">Numero di giorni</label><input type="number" placeholder="4" value={numDays} onChange={(e) => setNumDays(e.target.value)} min="1" max="7" className="w-full h-12 bg-card border border-border rounded-xl px-4 text-foreground outline-none focus:border-primary" /></div>
        </div>
      )}

      {step === "days" && (
        <div className="space-y-3 mb-8 animate-in fade-in duration-300">
          {days.map((day, idx) => (
            <div key={idx} className="bg-card rounded-2xl p-4">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-2">Giorno {idx + 1}</label>
              <input type="text" placeholder="es. Upper A, Lower B..." value={day.day_name} onChange={(e) => updateDayName(idx, e.target.value)} className="w-full h-10 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground outline-none focus:border-primary" />
            </div>
          ))}
        </div>
      )}

      {step === "exercises" && (
        <div className="animate-in fade-in duration-300">
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {days.map((day, idx) => <button key={idx} onClick={() => setCurrentDayIdx(idx)} className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${idx === currentDayIdx ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{day.day_name}</button>)}
          </div>
          <div className="space-y-3 mb-8">
            <div className="flex items-center justify-between mb-4"><label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Esercizi</label><button onClick={addExercise} className="flex items-center gap-1.5 text-primary text-xs font-semibold"><Plus className="w-4 h-4" />Aggiungi</button></div>
            {days[currentDayIdx].exercises.map((ex, exIdx) => (
              <div key={exIdx} className="bg-card rounded-xl p-3 space-y-2">
                <div className="flex gap-2 items-start">
                  <input type="text" placeholder="Nome esercizio" value={ex.exercise_name} onChange={(e) => updateExercise(exIdx, "exercise_name", e.target.value)} className="flex-1 h-9 bg-secondary border border-border rounded px-2 text-sm text-foreground outline-none focus:border-primary" />
                  <button onClick={() => removeExercise(exIdx)} className="text-muted-foreground hover:text-destructive mt-0.5"><X className="w-4 h-4" /></button>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Parte del corpo</label>
                  <Select value={ex.primary_body_part_id || ""} onValueChange={(val) => updateExercise(exIdx, "primary_body_part_id", val)}>
                    <SelectTrigger className="w-full h-9 bg-secondary border border-border rounded"><SelectValue placeholder="Seleziona muscolo" /></SelectTrigger>
                    <SelectContent>{bodyParts.map((bp) => <SelectItem key={bp.id} value={bp.id}>{bp.icon} {bp.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[10px] text-muted-foreground block mb-1">Serie</label><input type="number" value={ex.sets} onChange={(e) => updateExercise(exIdx, "sets", parseInt(e.target.value) || 0)} min="1" max="10" className="w-full h-8 bg-secondary border border-border rounded px-2 text-xs text-foreground outline-none focus:border-primary" /></div>
                  <div><label className="text-[10px] text-muted-foreground block mb-1">Reps min-max</label><div className="flex gap-1"><input type="number" value={ex.reps_min} onChange={(e) => updateExercise(exIdx, "reps_min", parseInt(e.target.value) || 0)} min="1" max="100" className="flex-1 h-8 bg-secondary border border-border rounded px-2 text-xs text-foreground outline-none focus:border-primary" /><input type="number" value={ex.reps_max} onChange={(e) => updateExercise(exIdx, "reps_max", parseInt(e.target.value) || 0)} min="1" max="100" className="flex-1 h-8 bg-secondary border border-border rounded px-2 text-xs text-foreground outline-none focus:border-primary" /></div></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[10px] text-muted-foreground block mb-1">Rest (sec)</label><input type="number" value={ex.rest_seconds} onChange={(e) => updateExercise(exIdx, "rest_seconds", parseInt(e.target.value) || 0)} min="0" step="15" className="w-full h-8 bg-secondary border border-border rounded px-2 text-xs text-foreground outline-none focus:border-primary" /></div>
                  <div><label className="text-[10px] text-muted-foreground block mb-1">Note (opz.)</label><input type="text" placeholder="es. RPE 8" value={ex.notes} onChange={(e) => updateExercise(exIdx, "notes", e.target.value)} className="w-full h-8 bg-secondary border border-border rounded px-2 text-xs text-foreground outline-none focus:border-primary" /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="fixed bottom-8 left-4 right-4 max-w-[412px] mx-auto flex gap-3">
        {step === "plan" && <button onClick={handlePlanNext} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95">Avanti<ChevronRight className="w-5 h-5" /></button>}
        {step === "days" && <button onClick={handleDaysNext} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95">Avanti<ChevronRight className="w-5 h-5" /></button>}
        {step === "exercises" && <button onClick={savePlan} disabled={saving} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60">{saving ? <><Loader className="w-5 h-5 animate-spin" />Salvataggio...</> : "✓ Salva Scheda"}</button>}
      </div>
    </div>
  );
}
