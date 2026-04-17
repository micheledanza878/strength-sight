import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { format, parseISO, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { Plus, Check, ChevronRight, X, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getUserId } from "@/lib/user";

type MeasurementStep = "base" | "upper" | "lower";

interface Measurement {
  id: string;
  weight: number | null;
  height_cm: number | null;
  collo_cm: number | null;
  braccio_front_cm: number | null;
  avambraccio_cm: number | null;
  petto_torace_cm: number | null;
  vita_cm: number | null;
  fianchi_cm: number | null;
  schiena_altezza_dorsali_cm: number | null;
  spalle_ampiezza_cm: number | null;
  glutei_circonferenza_cm: number | null;
  coscia_cm: number | null;
  polpaccio_cm: number | null;
  measured_at: string;
  notes: string | null;
}

export default function BodyTracking() {
  const { toast } = useToast();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<MeasurementStep>("base");
  const [form, setForm] = useState({
    weight: "", height_cm: "", collo_cm: "",
    braccio_front_cm: "", avambraccio_cm: "",
    petto_torace_cm: "", vita_cm: "",
    fianchi_cm: "",
    schiena_altezza_dorsali_cm: "", spalle_ampiezza_cm: "", glutei_circonferenza_cm: "",
    coscia_cm: "", polpaccio_cm: "", notes: ""
  });
  const [saving, setSaving] = useState(false);
  const [activeChart, setActiveChart] = useState<"weight" | "petto_torace_cm" | "collo_cm" | "braccio_front_cm" | "avambraccio_cm" | "vita_cm" | "fianchi_cm" | "schiena_altezza_dorsali_cm" | "spalle_ampiezza_cm" | "glutei_circonferenza_cm" | "coscia_cm" | "polpaccio_cm">("weight");
  const [chartGroup, setChartGroup] = useState<"none" | "base" | "upper" | "lower">("none");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data } = await supabase
      .from("body_measurements")
      .select("*")
      .order("measured_at", { ascending: true });
    if (data) setMeasurements(data as Measurement[]);
    setLoading(false);
  }

  async function saveMeasurement() {
    setSaving(true);

    try {
      const { error } = await supabase.from("body_measurements").insert({
        weight: form.weight ? parseFloat(form.weight) : null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        collo_cm: form.collo_cm ? parseFloat(form.collo_cm) : null,
        braccio_front_cm: form.braccio_front_cm ? parseFloat(form.braccio_front_cm) : null,
        avambraccio_cm: form.avambraccio_cm ? parseFloat(form.avambraccio_cm) : null,
        petto_torace_cm: form.petto_torace_cm ? parseFloat(form.petto_torace_cm) : null,
        vita_cm: form.vita_cm ? parseFloat(form.vita_cm) : null,
        fianchi_cm: form.fianchi_cm ? parseFloat(form.fianchi_cm) : null,
        schiena_altezza_dorsali_cm: form.schiena_altezza_dorsali_cm ? parseFloat(form.schiena_altezza_dorsali_cm) : null,
        spalle_ampiezza_cm: form.spalle_ampiezza_cm ? parseFloat(form.spalle_ampiezza_cm) : null,
        glutei_circonferenza_cm: form.glutei_circonferenza_cm ? parseFloat(form.glutei_circonferenza_cm) : null,
        coscia_cm: form.coscia_cm ? parseFloat(form.coscia_cm) : null,
        polpaccio_cm: form.polpaccio_cm ? parseFloat(form.polpaccio_cm) : null,
        notes: form.notes || null,
      });

      if (error) throw error;

      setSaveFeedback(true);
      setTimeout(() => setSaveFeedback(false), 2000);

      toast({
        title: "Misurazione salvata ✓",
        description: "I tuoi dati sono stati sincronizzati",
      });

      setForm({
        weight: "", height_cm: "", collo_cm: "",
        braccio_front_cm: "", avambraccio_cm: "",
        petto_torace_cm: "", vita_cm: "",
        fianchi_cm: "",
        schiena_altezza_dorsali_cm: "", spalle_ampiezza_cm: "", glutei_circonferenza_cm: "",
        coscia_cm: "", polpaccio_cm: "", notes: ""
      });
      setStep("base");
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error("Errore salvataggio misurazione:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la misurazione",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }

  const baseCharts = [
    { key: "weight" as const, label: "Peso", unit: "kg" },
  ];

  const upperCharts = [
    { key: "collo_cm" as const, label: "Collo", unit: "cm" },
    { key: "braccio_front_cm" as const, label: "Braccio", unit: "cm" },
    { key: "avambraccio_cm" as const, label: "Avambraccio", unit: "cm" },
    { key: "petto_torace_cm" as const, label: "Petto", unit: "cm" },
    { key: "schiena_altezza_dorsali_cm" as const, label: "Schiena", unit: "cm" },
    { key: "spalle_ampiezza_cm" as const, label: "Spalle", unit: "cm" },
  ];

  const lowerCharts = [
    { key: "vita_cm" as const, label: "Vita", unit: "cm" },
    { key: "fianchi_cm" as const, label: "Fianchi", unit: "cm" },
    { key: "glutei_circonferenza_cm" as const, label: "Glutei", unit: "cm" },
    { key: "coscia_cm" as const, label: "Coscia", unit: "cm" },
    { key: "polpaccio_cm" as const, label: "Polpaccio", unit: "cm" },
  ];

  const getChartTabs = () => {
    if (chartGroup === "base") return baseCharts;
    if (chartGroup === "upper") return upperCharts;
    if (chartGroup === "lower") return lowerCharts;
    return [];
  };

  const chartData = measurements
    .filter((m) => m[activeChart] != null)
    .map((m) => ({
      date: format(parseISO(m.measured_at), "d/M"),
      value: Number(m[activeChart]),
    }));

  const latest = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const previous = measurements.length > 1 ? measurements[measurements.length - 2] : null;

  function getTrend(key: keyof Measurement): "up" | "down" | "stable" {
    if (!latest || !previous) return "stable";
    const curr = latest[key];
    const prev = previous[key];
    if (typeof curr !== "number" || typeof prev !== "number") return "stable";
    if (curr > prev) return "up";
    if (curr < prev) return "down";
    return "stable";
  }

  function getStats(key: keyof Measurement) {
    const values = measurements
      .map((m) => m[key])
      .filter((v): v is number => typeof v === "number");
    if (values.length === 0) return { min: 0, max: 0, avg: 0, change: 0 };
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      change: latest && previous && typeof latest[key] === "number" && typeof previous[key] === "number"
        ? (latest[key] as number) - (previous[key] as number)
        : 0,
    };
  }

  function nextStep() {
    if (step === "base") setStep("upper");
    else if (step === "upper") setStep("lower");
  }

  function prevStep() {
    if (step === "upper") setStep("base");
    else if (step === "lower") setStep("upper");
  }

  function closeForm() {
    setShowForm(false);
    setStep("base");
  }

  const stepTitles = {
    base: "Base",
    upper: "Upper",
    lower: "Lower"
  };

  const getStepFields = () => {
    switch (step) {
      case "base":
        return [
          { key: "weight", label: "Peso (kg)", mode: "decimal" as const },
          { key: "height_cm", label: "Altezza (cm)", mode: "decimal" as const },
        ];
      case "upper":
        return [
          { key: "collo_cm", label: "Collo (cm)" },
          { key: "braccio_front_cm", label: "Braccio (cm)" },
          { key: "avambraccio_cm", label: "Avambraccio (cm)" },
          { key: "petto_torace_cm", label: "Petto (cm)" },
          { key: "schiena_altezza_dorsali_cm", label: "Schiena (cm)" },
          { key: "spalle_ampiezza_cm", label: "Spalle (cm)" },
        ];
      case "lower":
        return [
          { key: "vita_cm", label: "Vita (cm)" },
          { key: "fianchi_cm", label: "Fianchi (cm)" },
          { key: "glutei_circonferenza_cm", label: "Glutei (cm)" },
          { key: "coscia_cm", label: "Coscia (cm)" },
          { key: "polpaccio_cm", label: "Polpaccio (cm)" },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="px-5 pt-14 pb-24 min-h-screen max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Corpo</h1>
          <p className="text-muted-foreground text-sm">Misurazioni e progresso</p>
          {latest && (
            <p className="text-xs text-muted-foreground mt-2">
              📅 Ultima misurazione: {differenceInDays(new Date(), parseISO(latest.measured_at))} giorni fa
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-11 h-11 rounded-full bg-primary flex items-center justify-center"
        >
          <Plus className="w-5 h-5 text-primary-foreground" />
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-52 w-full rounded-2xl" />
        </div>
      )}

      {/* Latest Stats */}
      {!loading && latest && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {latest.weight && (
            <div className="bg-card rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold">{latest.weight}</p>
              <p className="text-xs text-muted-foreground mt-1">kg</p>
            </div>
          )}
          {latest.body_fat && (
            <div className="bg-card rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold">{latest.body_fat}</p>
              <p className="text-xs text-muted-foreground mt-1">% grasso</p>
            </div>
          )}
          {latest.arms && (
            <div className="bg-card rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold">{latest.arms}</p>
              <p className="text-xs text-muted-foreground mt-1">braccia cm</p>
            </div>
          )}
        </div>
      )}

      {/* Detailed Progress Cards */}
      {!loading && latest && (
        <div className="space-y-3 mb-6">
          {latest.weight && (
            <div className="bg-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Peso</p>
                <span className={`text-lg ${getTrend("weight") === "down" ? "text-green-500" : getTrend("weight") === "up" ? "text-red-500" : "text-muted-foreground"}`}>
                  {getTrend("weight") === "down" ? "↓" : getTrend("weight") === "up" ? "↑" : "→"}
                </span>
              </div>
              <p className="text-2xl font-bold mb-1">{latest.weight} kg</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Min</p>
                  <p className="font-semibold">{getStats("weight").min} kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg</p>
                  <p className="font-semibold">{getStats("weight").avg.toFixed(1)} kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max</p>
                  <p className="font-semibold">{getStats("weight").max} kg</p>
                </div>
              </div>
              {previous && typeof latest.weight === "number" && typeof previous.weight === "number" && (
                <p className={`text-xs mt-2 ${(latest.weight as number) - (previous.weight as number) < 0 ? "text-green-500" : "text-red-500"}`}>
                  {(latest.weight as number) - (previous.weight as number) > 0 ? "+" : ""}{((latest.weight as number) - (previous.weight as number)).toFixed(1)} kg da ultima volta
                </p>
              )}
            </div>
          )}
          {latest.braccio_front_cm && (
            <div className="bg-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Braccio</p>
                <span className={`text-lg ${getTrend("braccio_front_cm") === "up" ? "text-green-500" : getTrend("braccio_front_cm") === "down" ? "text-red-500" : "text-muted-foreground"}`}>
                  {getTrend("braccio_front_cm") === "up" ? "↑" : getTrend("braccio_front_cm") === "down" ? "↓" : "→"}
                </span>
              </div>
              <p className="text-2xl font-bold mb-1">{latest.braccio_front_cm} cm</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Min</p>
                  <p className="font-semibold">{getStats("braccio_front_cm").min} cm</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg</p>
                  <p className="font-semibold">{getStats("braccio_front_cm").avg.toFixed(1)} cm</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max</p>
                  <p className="font-semibold">{getStats("braccio_front_cm").max} cm</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {!loading && measurements.length > 0 && (
        <div className="bg-card rounded-2xl p-5 mb-6">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-4">Cronologia misurazioni</p>
          <div className="space-y-3">
            {measurements.slice(-5).reverse().map((m, idx) => (
              <div key={m.id} className="flex items-center justify-between pb-3 border-b border-border last:border-b-0">
                <div>
                  <p className="text-sm font-semibold">{format(parseISO(m.measured_at), "d MMM yyyy", { locale: it })}</p>
                  {m.notes && <p className="text-xs text-muted-foreground italic mt-1">"{m.notes}"</p>}
                </div>
                {m.weight && <p className="text-sm font-bold">{m.weight} kg</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart Group Selector */}
      {!loading && (
        <div className="space-y-4 mb-4">
          {chartGroup === "none" && (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { setChartGroup("base"); setActiveChart("weight"); }}
                className="h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm transition-transform active:scale-95"
              >
                Base
              </button>
              <button
                onClick={() => { setChartGroup("upper"); setActiveChart("collo_cm"); }}
                className="h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm transition-transform active:scale-95"
              >
                Upper
              </button>
              <button
                onClick={() => { setChartGroup("lower"); setActiveChart("vita_cm"); }}
                className="h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm transition-transform active:scale-95"
              >
                Lower
              </button>
            </div>
          )}

          {(chartGroup === "base" || chartGroup === "upper" || chartGroup === "lower") && (
            <>
              <button
                onClick={() => { setChartGroup("none"); setActiveChart("weight"); }}
                className="w-full h-10 rounded-xl bg-secondary text-secondary-foreground font-semibold text-xs transition-colors active:scale-95"
              >
                ← Indietro
              </button>
              <div className="grid grid-cols-2 gap-2">
                {getChartTabs().map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveChart(tab.key)}
                    className={`h-12 rounded-xl text-xs font-semibold transition-colors ${
                      activeChart === tab.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Chart */}
      {!loading && chartData.length > 1 ? (
        <div className="bg-card rounded-2xl p-4 mb-4 h-52 flex justify-center">
          <ResponsiveContainer width="95%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : !loading ? (
        <div className="bg-card rounded-2xl p-8 text-center mb-4">
          <p className="text-2xl mb-3">📊</p>
          <p className="text-muted-foreground text-sm font-medium">Nessun grafico disponibile</p>
          <p className="text-muted-foreground text-xs mt-2">Aggiungi almeno 2 misurazioni per visualizzare il progresso</p>
        </div>
      ) : null}

      {/* Add Form Fullscreen */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-background px-5 pt-14 pb-24 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={closeForm} className="text-muted-foreground">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Nuova misurazione</h1>
              <p className="text-xs text-muted-foreground mt-1">Step {["base", "upper", "lower"].indexOf(step) + 1} di 3</p>
            </div>
          </div>

          {/* Step progress */}
          <div className="flex gap-2 mb-6">
            {(["base", "upper", "lower"] as MeasurementStep[]).map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  step === s ? "bg-primary" : ["base", "upper", "lower"].indexOf(s) < ["base", "upper", "lower"].indexOf(step) ? "bg-primary/50" : "bg-secondary"
                }`}
              />
            ))}
          </div>

          {/* Current step label */}
          <p className="text-xs text-muted-foreground font-semibold uppercase mb-6">
            {stepTitles[step]}
          </p>

          {/* Fields for current step */}
          <div className="space-y-4 overflow-y-auto flex-1 mb-6 animate-in fade-in duration-300">
            {getStepFields().map((f) => (
              <div key={f.key}>
                <label className="text-xs text-muted-foreground font-medium block mb-2">{f.label}</label>
                <input
                  type="number"
                  inputMode={f.mode || "decimal"}
                  placeholder={f.label}
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full h-12 bg-card border border-border rounded-xl px-4 text-foreground outline-none focus:border-primary"
                />
              </div>
            ))}

            {/* Notes field (only on last step) */}
            {step === "lower" && (
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-2">Note (opzionale)</label>
                <textarea
                  placeholder="Es. Mi sento più snello, aumentato forza..."
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full h-20 bg-card border border-border rounded-xl px-4 py-2 text-sm text-foreground outline-none focus:border-primary resize-none"
                />
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3 shrink-0 pb-2">
            {step !== "base" && (
              <button
                onClick={prevStep}
                className="flex-1 h-14 rounded-2xl bg-secondary text-foreground font-bold transition-transform active:scale-95 text-sm"
              >
                Indietro
              </button>
            )}
            {step === "lower" ? (
              <button
                onClick={saveMeasurement}
                disabled={saving}
                className={`flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-bold transition-all active:scale-95 flex items-center justify-center gap-2 text-sm ${
                  saving ? "opacity-70" : ""
                }`}
              >
                {saving ? (
                  <>
                    <Check className="w-5 h-5 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Salva
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-bold transition-transform active:scale-95 text-sm flex items-center justify-center gap-2"
              >
                Avanti
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
