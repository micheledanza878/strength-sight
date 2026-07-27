import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { updateFoodPortion } from '@/services/dietService';

interface EditPortionModalProps {
  isOpen: boolean;
  onClose: () => void;
  food: {
    mealFoodId: string;
    name: string;
    portion: number;
  };
  onPortionUpdated: () => void;
}

export function EditPortionModal({ isOpen, onClose, food, onPortionUpdated }: EditPortionModalProps) {
  const [portion, setPortion] = useState<number>(food.portion);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setPortion(food.portion);
  }, [isOpen, food.portion]);

  async function handleSave() {
    if (portion <= 0) return;
    setSaving(true);
    try {
      await updateFoodPortion(food.mealFoodId, portion);
      onPortionUpdated();
      onClose();
    } catch (error) {
      console.error('Errore aggiornamento grammatura:', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Modifica grammatura</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <label className="text-sm font-medium text-primary">{food.name}</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={1}
                autoFocus
                value={portion}
                onChange={(e) => setPortion(parseInt(e.target.value) || 0)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <span className="text-sm text-muted-foreground">grammi</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={portion <= 0 || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? 'Salvataggio...' : 'Salva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
