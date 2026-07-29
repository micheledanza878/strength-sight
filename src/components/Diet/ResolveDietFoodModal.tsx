import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { getFoodCategories, getFoodsByCategory } from '@/services/dietService';
import type { Food, FoodCategory } from '@/types/diet';

export interface NewDietFoodDraft {
  tempId: string;
  name: string;
  categoryId: string;
  standardPortionG: number;
}

interface ResolveDietFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Nome grezzo estratto dal PDF, usato come titolo e come prefill del nome per un nuovo alimento. */
  rawName: string;
  /** Grammatura letta dal PDF, usata come prefill della porzione standard per un nuovo alimento. */
  initialPortionG: number;
  onResolveExisting: (food: Food) => void;
  onResolveNew: (draft: NewDietFoodDraft) => void;
}

/**
 * Modale per risolvere un alimento non abbinato (o abbinato male) durante
 * l'import di una dieta da PDF: l'utente può scegliere un alimento già a
 * catalogo (stesso pattern tab-categoria + lista di AddFoodModal.tsx) oppure
 * definirne uno nuovo. La creazione vera e propria avviene lato server nella
 * RPC import_diet_plan al momento del commit: qui raccogliamo solo i dati.
 */
export function ResolveDietFoodModal({
  isOpen,
  onClose,
  rawName,
  initialPortionG,
  onResolveExisting,
  onResolveNew,
}: ResolveDietFoodModalProps) {
  const [tab, setTab] = useState<'existing' | 'new'>('existing');

  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingFoods, setLoadingFoods] = useState(false);

  const [newName, setNewName] = useState(rawName);
  const [newCategoryId, setNewCategoryId] = useState<string>('');
  const [newPortion, setNewPortion] = useState<number>(Math.round(initialPortionG) || 100);

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const cats = await getFoodCategories();
      setCategories(cats);
      if (cats.length > 0) {
        setActiveCategory(cats[0].id);
        setNewCategoryId((prev) => prev || cats[0].id);
      }
    } catch (error) {
      console.error('Errore caricamento categorie:', error);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const loadFoods = useCallback(async (categoryId: string) => {
    setLoadingFoods(true);
    try {
      const list = await getFoodsByCategory(categoryId);
      setFoods(list);
    } catch (error) {
      console.error('Errore caricamento alimenti:', error);
      setFoods([]);
    } finally {
      setLoadingFoods(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTab('existing');
      setNewName(rawName);
      setNewPortion(Math.round(initialPortionG) || 100);
      loadCategories();
    }
    // Deliberatamente non includiamo rawName/initialPortionG tra le
    // dipendenze: vogliamo re-inizializzare lo stato solo quando la modale
    // si riapre (isOpen passa a true), non ad ogni render del genitore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, loadCategories]);

  useEffect(() => {
    if (isOpen && activeCategory) {
      loadFoods(activeCategory);
    }
  }, [isOpen, activeCategory, loadFoods]);

  function handleSelectExisting(food: Food) {
    onResolveExisting(food);
    onClose();
  }

  function handleConfirmNew() {
    const trimmedName = newName.trim();
    if (!trimmedName || !newCategoryId || newPortion <= 0) return;
    onResolveNew({
      tempId: crypto.randomUUID(),
      name: trimmedName,
      categoryId: newCategoryId,
      standardPortionG: newPortion,
    });
    onClose();
  }

  const canConfirmNew = newName.trim().length > 0 && !!newCategoryId && newPortion > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="truncate">Risolvi "{rawName}"</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'existing' | 'new')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Alimento esistente</TabsTrigger>
            <TabsTrigger value="new">Nuovo alimento</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4 pt-2">
            {loadingCategories ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {categories.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          activeCategory === cat.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}

                <ScrollArea className="h-56">
                  <div className="space-y-2 pr-4">
                    {loadingFoods ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : foods.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground">
                        Nessun alimento in questa categoria
                      </p>
                    ) : (
                      foods.map((food) => (
                        <button
                          key={food.id}
                          type="button"
                          onClick={() => handleSelectExisting(food)}
                          className="w-full rounded-lg border-2 border-border p-3 text-left transition-colors hover:border-primary/50"
                        >
                          <p className="font-medium">{food.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {food.standard_portion_g}g
                            {food.calories_approx ? ` · ${food.calories_approx} kcal` : ''}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>

          <TabsContent value="new" className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Nome alimento</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="Es. Petto di pollo"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Categoria</label>
              <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleziona una categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Porzione standard</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={newPortion}
                  onChange={(e) => setNewPortion(parseInt(e.target.value) || 0)}
                  className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <span className="text-sm text-muted-foreground">grammi</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {tab === 'new' && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button onClick={handleConfirmNew} disabled={!canConfirmNew}>
              Crea e usa
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
