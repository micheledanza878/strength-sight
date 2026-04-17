import { useState } from "react";
import { X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BodyMetricsModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function BodyMetricsModal({
  userId,
  isOpen,
  onClose,
  onSave,
}: BodyMetricsModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    weight: "",
    body_fat: "",
    arms: "",
    waist: "",
    legs: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);

  const metrics = [
    { key: "weight", label: "Peso (kg)", mode: "decimal" as const },
    { key: "body_fat", label: "Grasso corporeo (%)", mode: "decimal" as const },
    { key: "arms", label: "Braccia (cm)", mode: "decimal" as const },
    { key: "waist", label: "Vita (cm)", mode: "decimal" as const },
    { key: "legs", label: "Gambe (cm)", mode: "decimal" as const },
  ];

  async function handleSave() {
    if (!userId) return;
    setSaving(true);

    try {
      const { error } = await supabase.from("body_measurements").insert({
        weight: form.weight ? parseFloat(form.weight) : null,
        body_fat: form.body_fat ? parseFloat(form.body_fat) : null,
        arms: form.arms ? parseFloat(form.arms) : null,
        waist: form.waist ? parseFloat(form.waist) : null,
        legs: form.legs ? parseFloat(form.legs) : null,
      });

      if (error) throw error;

      setSaveFeedback(true);
      setTimeout(() => setSaveFeedback(false), 2000);

      toast({
        title: "Misurazione salvata ✓",
        description: "I tuoi dati sono stati sincronizzati",
      });

      setForm({ weight: "", body_fat: "", arms: "", waist: "", legs: "" });
      onSave();
    } catch (error) {
      console.error("Errore salvataggio misurazione:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la misurazione",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col justify-end">
      <div className="bg-card rounded-t-3xl p-6 pb-8 max-w-[428px] mx-auto w-full max-h-[85vh] flex flex-col overflow-hidden safe-bottom">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xl font-bold">Nuova misurazione</p>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto flex-1 pr-2">
          {metrics.map((m) => (
            <div key={m.key}>
              <label className="text-xs text-muted-foreground font-medium mb-2 block">
                {m.label}
              </label>
              <input
                type="number"
                inputMode={m.mode}
                placeholder={m.label}
                value={form[m.key as keyof typeof form]}
                onChange={(e) =>
                  setForm((p) => ({ ...p, [m.key]: e.target.value }))
                }
                className="w-full h-12 bg-secondary rounded-xl px-4 text-foreground text-base placeholder:text-muted-foreground outline-none border border-transparent focus:border-primary transition-colors"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 h-14 rounded-2xl bg-secondary text-foreground font-semibold transition-colors active:scale-95"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
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
  );
}
