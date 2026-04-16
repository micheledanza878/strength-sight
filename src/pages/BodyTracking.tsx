import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Plus, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface Measurement {
  id: string;
  weight: number | null;
  body_fat: number | null;
  arms: number | null;
  waist: number | null;
  legs: number | null;
  measured_at: string;
}

export default function BodyTracking() {
  const { toast } = useToast();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ weight: "", body_fat: "", arms: "", waist: "", legs: "" });
  const [saving, setSaving] = useState(false);
  const [activeChart, setActiveChart] = useState<"weight" | "body_fat" | "arms" | "waist" | "legs">("weight");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveFeedback, setSaveFeedback] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        loadData();
      }
    };
    getUser();
  }, []);

  async function loadData() {
    if (!userId) return;
    const { data } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("user_id", userId)
      .order("measured_at", { ascending: true });
    if (data) setMeasurements(data as Measurement[]);
    setLoading(false);
  }

  async function saveMeasurement() {
    if (!userId) return;
    setSaving(true);

    try {
      const { error } = await supabase.from("body_measurements").insert({
        user_id: userId,
        weight: form.weight ? parseFloat(form.weight) : null,
        body_fat: form.body_fat ? parseFloat(form.body_fat) : null,
        arms: form.arms ? parseFloat(form.arms) : null,
        waist: form.waist ? parseFloat(form.waist) : null,
        legs: form.legs ? parseFloat(form.legs) : null,
      });

      if (error) throw error;

      // Show success feedback
      setSaveFeedback(true);
      setTimeout(() => setSaveFeedback(false), 2000);

      toast({
        title: "Misurazione salvata ✓",
        description: "I tuoi dati sono stati sincronizzati",
      });

      setForm({ weight: "", body_fat: "", arms: "", waist: "", legs: "" });
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

  const chartTabs = [
    { key: "weight" as const, label: "Peso", unit: "kg" },
    { key: "body_fat" as const, label: "Grasso %", unit: "%" },
    { key: "arms" as const, label: "Braccia", unit: "cm" },
    { key: "waist" as const, label: "Vita", unit: "cm" },
    { key: "legs" as const, label: "Gambe", unit: "cm" },
  ];

  const chartData = measurements
    .filter((m) => m[activeChart] != null)
    .map((m) => ({
      date: format(parseISO(m.measured_at), "d/M"),
      value: Number(m[activeChart]),
    }));

  const latest = measurements.length > 0 ? measurements[measurements.length - 1] : null;

  return (
    <div className="px-5 pt-14 pb-24 min-h-screen max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Corpo</h1>
          <p className="text-muted-foreground text-sm">Misurazioni e progresso</p>
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

      {/* Chart Tabs */}
      {!loading && <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {chartTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveChart(tab.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors
              ${activeChart === tab.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {!loading && chartData.length > 1 ? (
        <div className="bg-card rounded-2xl p-4 mb-4 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
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
          <p className="text-muted-foreground text-sm">Aggiungi almeno 2 misurazioni per vedere il grafico</p>
        </div>
      ) : null}

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-card rounded-t-3xl p-6 pb-8 max-w-[428px] mx-auto w-full max-h-[85vh] flex flex-col overflow-hidden safe-bottom">
            <p className="text-xl font-bold mb-6">Nuova misurazione</p>
            <div className="space-y-3 overflow-y-auto flex-1 pr-2">
              {[
                { key: "weight", label: "Peso (kg)", mode: "decimal" as const },
                { key: "body_fat", label: "Grasso corporeo (%)", mode: "decimal" as const },
                { key: "arms", label: "Braccia (cm)", mode: "decimal" as const },
                { key: "waist", label: "Vita (cm)", mode: "decimal" as const },
                { key: "legs", label: "Gambe (cm)", mode: "decimal" as const },
              ].map((f) => (
                <input
                  key={f.key}
                  type="number"
                  inputMode={f.mode}
                  placeholder={f.label}
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full h-14 bg-secondary rounded-2xl px-5 text-foreground text-base placeholder:text-muted-foreground outline-none"
                />
              ))}
            </div>
            <div className="flex gap-3 mt-6 shrink-0">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 h-14 rounded-2xl bg-secondary text-foreground font-semibold transition-colors active:scale-95"
              >
                Annulla
              </button>
              <button
                onClick={saveMeasurement}
                disabled={saving}
                className={`flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  saveFeedback ? "bg-green-500" : ""
                }`}
              >
                {saveFeedback ? (
                  <>
                    <Check className="w-5 h-5" />
                    Salvato
                  </>
                ) : saving ? (
                  "..."
                ) : (
                  "Salva"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
