import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star } from "lucide-react";
import { SKILLS, Skill, SkillCategory } from "@/data/skills";

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

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {CATEGORY_ORDER.map((category) => {
            const skillsInCategory = SKILLS.filter((s) => s.category === category);
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
                        Step 1: {skill.steps[0].name}
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
      </DialogContent>
    </Dialog>
  );
}
