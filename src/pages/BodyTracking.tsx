import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Plus } from "lucide-react";

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
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ weight: "", body_fat: "", arms: "", waist: "", legs: "" });
  const [saving, setSaving] = useState(false);
  const [activeChart, setActiveChart] = useState<"weight" | "body_fat" | "arms" | "waist" | "legs">("weight");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("user_id", user.id)
      .order("measured_at", { ascending: true });
    if (data) setMeasurements(data as Measurement[]);
  }

  async function saveMeasurement() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    await supabase.from("body_measurements").insert({
      user_id: user.id,
      weight: form.weight ? parseFloat(form.weight) : null,
      body_fat: form.body_fat ? parseFloat(form.body_fat) : null,
      arms: form.arms ? parseFloat(form.arms) : null,
      waist: form.waist ? parseFloat(form.waist) : null,
      legs: form.legs ? parseFloat(form.legs) : null,
    });
    setForm({ weight: "", body_fat: "", arms: "", waist: "", legs: "" });
    setShowForm(false);
    setSaving(false);
    loadData();
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
    <div className="px-5 pt-14 pb-24 min-h-screen">
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

      {/* Latest Stats */}
      {latest && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {latest.weight && (
            <div className="bg-card rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{latest.weight}</p>
              <p className="text-xs text-muted-foreground">kg</p>
            </div>
          )}
          {latest.body_fat && (
            <div className="bg-card rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{latest.body_fat}</p>
              <p className="text-xs text-muted-foreground">% grasso</p>
            </div>
          )}
          {latest.arms && (
            <div className="bg-card rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{latest.arms}</p>
              <p className="text-xs text-muted-foreground">braccia cm</p>
            </div>
          )}
        </div>
      )}

      {/* Chart Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
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
      {chartData.length > 1 ? (
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
      ) : (
        <div className="bg-card rounded-2xl p-8 text-center mb-4">
          <p className="text-muted-foreground text-sm">Aggiungi almeno 2 misurazioni per vedere il grafico</p>
        </div>
      )}

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-card rounded-t-3xl p-6 max-w-[428px] mx-auto w-full">
            <p className="text-lg font-bold mb-4">Nuova misurazione</p>
            <div className="space-y-3">
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
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 h-14 rounded-2xl bg-secondary text-foreground font-semibold"
              >
                Annulla
              </button>
              <button
                onClick={saveMeasurement}
                disabled={saving}
                className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-bold"
              >
                {saving ? "..." : "Salva"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
