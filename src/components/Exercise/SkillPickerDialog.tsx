import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader, Star } from "lucide-react";
import { fetchSkills, Skill, SkillCategory } from "@/services/skillsService";

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  "statiche-spinta": "Statiche — spinta",
  "statiche-trazione": "Statiche — trazione",
  core: "Core / compressione",
  "dinamiche-trazione": "Dinamiche — trazione",
  "dinamiche-spinta": "Dinamiche — spinta",
  gambe: "Gambe",
};

const CATEGORY_ORDER: SkillCategory[] = [
  "statiche-spinta",
  "statiche-trazione",
  "core",
  "dinamiche-trazione",
  "dinamiche-spinta",
  "gambe",
];

interface SkillPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (skill: Skill) => void;
}

export function SkillPickerDialog({ open, onOpenChange, onSelect }: SkillPickerDialogProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Il catalogo skill è read-only e cache-ato da fetchSkills(): caricarlo al
  // mount del dialog (anche se non ancora aperto) tiene i dati pronti al
  // primo click, senza penalizzare le riaperture successive.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchSkills();
        if (!cancelled) setSkills(data);
      } catch (err) {
        console.error("Errore caricamento catalogo skill:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Aggiungi skill</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground bg-secondary rounded-xl p-3 -mt-1">
          <Star className="w-3 h-3 inline text-primary mb-0.5" /> = le 4 skill consigliate ora. Il resto è un menù per
          i cicli futuri: meglio non aggiungerlo finché non chiudi almeno il muscle-up.
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive text-center py-6">
            Impossibile caricare il catalogo skill. Riprova più tardi.
          </p>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {CATEGORY_ORDER.map((category) => {
              const skillsInCategory = skills.filter((s) => s.category === category);
              if (skillsInCategory.length === 0) return null;
              return (
                <div key={category}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    {CATEGORY_LABELS[category]}
                  </p>
                  <div className="space-y-2">
                    {skillsInCategory.map((skill) => (
                      <button
                        key={skill.slug}
                        type="button"
                        onClick={() => {
                          onSelect(skill);
                          onOpenChange(false);
                        }}
                        className="w-full text-left bg-secondary rounded-xl p-3 active:scale-95 transition-transform"
                      >
                        <p className="font-semibold text-sm flex items-center gap-1.5">
                          {skill.isPriority && <Star className="w-3.5 h-3.5 text-primary fill-primary shrink-0" />}
                          {skill.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Step 1: {skill.steps[0]?.name}
                        </p>
                        {skill.warning && (
                          <p className="text-[11px] text-amber-500 mt-1">{skill.warning}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
