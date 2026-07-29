import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronLeft,
  CloudUpload,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
import PageContainer from '@/components/PageContainer';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResolveDietFoodModal,
  type NewDietFoodDraft,
} from '@/components/Diet/ResolveDietFoodModal';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getFoodsByIds } from '@/services/dietService';
import {
  MAX_PDF_BYTES,
  importDietPlan,
  parseDietPdf,
} from '@/services/dietImportService';
import {
  DAYS_OF_WEEK,
  MEAL_TYPES,
  type DietImportConfidence,
  type ImportDietPlanMeal,
  type ImportDietPlanNewFood,
} from '@/types/diet';

const MEAL_TYPE_KEYS = Object.keys(MEAL_TYPES) as (keyof typeof MEAL_TYPES)[];

type Step = 'upload' | 'analyzing' | 'review';

/** Un alimento estratto dal PDF, appiattito rispetto a days/meals per rendere
 * banale la riassegnazione di giorno/pasto in fase di revisione (basta
 * cambiare i due campi, il raggruppamento per il render è derivato). */
interface ReviewFoodItem {
  key: string;
  raw_name: string;
  /** Confidenza originale restituita dall'AI: immutabile, usata solo per il colore del badge. */
  confidence: DietImportConfidence;
  /** matched_food_id originale dell'AI: immutabile, usato solo per il colore del badge
   * (un match nullo va mostrato in rosso indipendentemente dalla confidence dichiarata). */
  originalMatchedFoodId: string | null;
  portionG: number;
  dayOfWeek: number;
  mealType: keyof typeof MEAL_TYPES;
  /** Risoluzione corrente (mutabile): alimento di catalogo scelto, se presente. */
  resolvedFoodId: string | null;
  resolvedFoodName: string | null;
  /** Risoluzione corrente (mutabile): bozza di alimento nuovo, se l'utente ne ha definito uno. */
  newFood: NewDietFoodDraft | null;
}

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Errore nella lettura del file'));
        return;
      }
      // FileReader.readAsDataURL produce "data:application/pdf;base64,<...>":
      // l'edge function vuole solo la parte dopo la virgola.
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Errore nella lettura del file'));
    reader.readAsDataURL(file);
  });
}

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const CONFIDENCE_BADGE: Record<DietImportConfidence, { label: string; className: string }> = {
  high: { label: 'Alta', className: 'bg-green-500/15 text-green-500 border-green-500/30' },
  medium: { label: 'Media', className: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30' },
  low: { label: 'Bassa', className: 'bg-red-500/15 text-red-500 border-red-500/30' },
};

function ConfidenceBadge({ item }: { item: ReviewFoodItem }) {
  // Un alimento senza match dell'AI va sempre mostrato come "bassa
  // confidenza" (rosso), anche se il campo confidence dichiarato fosse
  // diverso: l'assenza di match è di per sé il segnale più forte.
  const confidence: DietImportConfidence = item.originalMatchedFoodId ? item.confidence : 'low';
  const { label, className } = CONFIDENCE_BADGE[confidence];
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0', className)}>
      {label}
    </span>
  );
}

export default function DietImport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [warnings, setWarnings] = useState<string[]>([]);
  const [warningsDismissed, setWarningsDismissed] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewFoodItem[]>([]);
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(todayIsoDate());
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploadError(null);

    if (!isPdfFile(file)) {
      setUploadError('Il file selezionato non è un PDF. Seleziona un file .pdf.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setUploadError(
        `Il PDF è troppo grande (~${(file.size / (1024 * 1024)).toFixed(1)}MB). Limite massimo: ${MAX_PDF_BYTES / (1024 * 1024)}MB.`
      );
      return;
    }

    setStep('analyzing');
    try {
      const pdfBase64 = await readFileAsBase64(file);
      const plan = await parseDietPdf(pdfBase64, 'application/pdf');

      if (!plan.detected_format_ok) {
        setUploadError(
          plan.warnings.length > 0
            ? `Il PDF non sembra un piano alimentare settimanale valido. Dettagli: ${plan.warnings.join(' ')}`
            : 'Il PDF caricato non sembra essere un piano alimentare settimanale. Riprova con un altro file.'
        );
        setStep('upload');
        return;
      }

      const items: ReviewFoodItem[] = [];
      for (const day of plan.days) {
        for (const meal of day.meals) {
          for (const food of meal.foods) {
            items.push({
              key: crypto.randomUUID(),
              raw_name: food.raw_name,
              confidence: food.confidence,
              originalMatchedFoodId: food.matched_food_id,
              portionG: food.portion_g,
              dayOfWeek: day.day_of_week,
              mealType: meal.meal_type,
              resolvedFoodId: food.matched_food_id,
              resolvedFoodName: null,
              newFood: null,
            });
          }
        }
      }

      // Risolviamo in un colpo solo nome/categoria di tutti gli alimenti già
      // abbinati dall'AI, per mostrarli nella revisione senza dover scaricare
      // l'intero catalogo categoria per categoria.
      const matchedIds = Array.from(
        new Set(items.filter((i) => i.resolvedFoodId).map((i) => i.resolvedFoodId as string))
      );
      const matchedFoods = matchedIds.length > 0 ? await getFoodsByIds(matchedIds) : [];
      const nameById = new Map(matchedFoods.map((f) => [f.id, f.name]));
      const itemsWithNames = items.map((item) =>
        item.resolvedFoodId
          ? { ...item, resolvedFoodName: nameById.get(item.resolvedFoodId) ?? null }
          : item
      );

      setReviewItems(itemsWithNames);
      setWarnings(plan.warnings);
      setWarningsDismissed(false);
      setCommitError(null);
      setStep('review');
    } catch (error) {
      console.error('Errore analisi PDF dieta:', error);
      setUploadError(
        error instanceof Error ? error.message : 'Errore imprevisto durante l\'analisi del PDF.'
      );
      setStep('upload');
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset per permettere di riselezionare lo stesso file (es. dopo un errore).
    e.target.value = '';
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleRestart() {
    setStep('upload');
    setUploadError(null);
    setReviewItems([]);
    setWarnings([]);
    setCommitError(null);
  }

  function updateItem(key: string, patch: Partial<ReviewFoodItem>) {
    setReviewItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function handleResolveExisting(key: string, food: { id: string; name: string }) {
    updateItem(key, { resolvedFoodId: food.id, resolvedFoodName: food.name, newFood: null });
  }

  function handleResolveNew(key: string, draft: NewDietFoodDraft) {
    updateItem(key, { resolvedFoodId: null, resolvedFoodName: null, newFood: draft });
  }

  const unresolvedCount = useMemo(
    () => reviewItems.filter((i) => !i.resolvedFoodId && !i.newFood).length,
    [reviewItems]
  );

  // Raggruppamento per giorno (solo i giorni effettivamente presenti,
  // ordinati Lunedì..Domenica) e, all'interno, per tipo pasto nell'ordine
  // canonico colazione → ... → cena.
  const dayGroups = useMemo(() => {
    const byDay = new Map<number, ReviewFoodItem[]>();
    for (const item of reviewItems) {
      if (!byDay.has(item.dayOfWeek)) byDay.set(item.dayOfWeek, []);
      byDay.get(item.dayOfWeek)!.push(item);
    }
    return Array.from(byDay.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([dayOfWeek, items]) => {
        const byMeal = new Map<string, ReviewFoodItem[]>();
        for (const item of items) {
          if (!byMeal.has(item.mealType)) byMeal.set(item.mealType, []);
          byMeal.get(item.mealType)!.push(item);
        }
        const meals = MEAL_TYPE_KEYS.filter((mt) => byMeal.has(mt)).map((mealType) => ({
          mealType,
          items: byMeal.get(mealType)!,
        }));
        return { dayOfWeek, meals };
      });
  }, [reviewItems]);

  async function handleCommit() {
    if (unresolvedCount > 0 || committing) return;
    if (!startDate) {
      setCommitError('Seleziona la data di inizio del nuovo piano.');
      return;
    }

    const newFoods: ImportDietPlanNewFood[] = [];
    const mealMap = new Map<string, ImportDietPlanMeal>();

    for (const item of reviewItems) {
      const mapKey = `${item.dayOfWeek}|${item.mealType}`;
      if (!mealMap.has(mapKey)) {
        mealMap.set(mapKey, { day_of_week: item.dayOfWeek, meal_type: item.mealType, foods: [] });
      }
      const meal = mealMap.get(mapKey)!;

      if (item.newFood) {
        newFoods.push({
          temp_id: item.newFood.tempId,
          name: item.newFood.name,
          category_id: item.newFood.categoryId,
          standard_portion_g: item.newFood.standardPortionG,
        });
      }

      meal.foods.push({
        food_id: item.resolvedFoodId,
        new_food_temp_id: item.newFood ? item.newFood.tempId : null,
        portion_size_g: item.portionG,
        order_index: meal.foods.length,
      });
    }

    setCommitting(true);
    setCommitError(null);
    try {
      await importDietPlan(startDate, newFoods, Array.from(mealMap.values()));
      toast({
        title: 'Dieta importata',
        description: 'Il nuovo piano alimentare è stato attivato.',
      });
      navigate('/diet');
    } catch (error) {
      console.error('Errore import dieta:', error);
      setCommitError(
        error instanceof Error ? error.message : 'Errore imprevisto durante l\'importazione.'
      );
    } finally {
      setCommitting(false);
    }
  }

  const resolvingItem = reviewItems.find((i) => i.key === resolvingKey) ?? null;

  return (
    <PageContainer variant="default" className="px-4 pt-14 pb-32 min-h-screen">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate('/diet')}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform flex-shrink-0"
          aria-label="Torna alla dieta"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importa dieta da PDF</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Carica il PDF, l'AI lo analizza, tu confermi prima di attivarlo
          </p>
        </div>
      </div>

      {/* ── Step A: Dropzone ── */}
      {step === 'upload' && (
        <div className="space-y-4">
          {uploadError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{uploadError}</p>
            </div>
          )}

          <label
            htmlFor="diet-pdf-input"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center cursor-pointer transition-colors',
              dragOver ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
            )}
          >
            <input
              ref={fileInputRef}
              id="diet-pdf-input"
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={handleFileInputChange}
            />
            <CloudUpload className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm font-semibold">Trascina qui il PDF del piano alimentare</p>
              <p className="text-xs text-muted-foreground mt-1">
                oppure clicca per selezionarlo · un solo file · max {MAX_PDF_BYTES / (1024 * 1024)}MB
              </p>
            </div>
          </label>
        </div>
      )}

      {/* ── Step Analisi in corso ── */}
      {step === 'analyzing' && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div>
            <p className="text-sm font-semibold">Analisi del PDF in corso</p>
            <p className="text-xs text-muted-foreground mt-1">
              Può richiedere anche un minuto, l'AI sta leggendo il documento e abbinando gli alimenti al catalogo.
            </p>
          </div>
        </div>
      )}

      {/* ── Step B: Revisione ── */}
      {step === 'review' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {reviewItems.length} alimenti estratti su {dayGroups.length} giorni
            </p>
            <button
              onClick={handleRestart}
              className="text-xs font-semibold text-primary active:opacity-70"
            >
              Ricomincia con un altro file
            </button>
          </div>

          {warnings.length > 0 && !warningsDismissed && (
            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-500" />
                  <p className="font-semibold text-yellow-600 dark:text-yellow-400">
                    {warnings.length} {warnings.length === 1 ? 'avviso' : 'avvisi'} dall'analisi AI
                  </p>
                </div>
                <button
                  onClick={() => setWarningsDismissed(true)}
                  aria-label="Chiudi avvisi"
                  className="shrink-0 text-muted-foreground active:opacity-70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="mt-2 space-y-1 pl-6 list-disc text-xs text-muted-foreground">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {unresolvedCount > 0 && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive font-semibold">
              {unresolvedCount} {unresolvedCount === 1 ? 'alimento da risolvere' : 'alimenti da risolvere'} prima di poter importare
            </div>
          )}

          {dayGroups.map(({ dayOfWeek, meals }) => (
            <div key={dayOfWeek} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="font-bold text-sm tracking-tight">{DAYS_OF_WEEK[dayOfWeek]}</p>
              </div>
              <div className="divide-y divide-border">
                {meals.map(({ mealType, items }) => (
                  <div key={mealType} className="px-4 py-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      {MEAL_TYPES[mealType]}
                    </p>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.key} className="rounded-xl bg-secondary/50 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">{item.raw_name}</p>
                            <ConfidenceBadge item={item} />
                          </div>

                          {/* Risoluzione */}
                          {item.resolvedFoodId ? (
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-muted-foreground truncate">
                                Abbinato a <span className="text-foreground font-medium">{item.resolvedFoodName ?? '…'}</span>
                              </span>
                              <button
                                onClick={() => setResolvingKey(item.key)}
                                className="shrink-0 font-semibold text-primary active:opacity-70"
                              >
                                Cambia
                              </button>
                            </div>
                          ) : item.newFood ? (
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-muted-foreground truncate">
                                Nuovo alimento <span className="text-foreground font-medium">"{item.newFood.name}"</span> ({item.newFood.standardPortionG}g std.)
                              </span>
                              <button
                                onClick={() => setResolvingKey(item.key)}
                                className="shrink-0 font-semibold text-primary active:opacity-70"
                              >
                                Modifica
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-semibold text-destructive">Non abbinato</span>
                              <button
                                onClick={() => setResolvingKey(item.key)}
                                className="shrink-0 rounded-lg bg-primary px-2.5 py-1 font-semibold text-primary-foreground active:opacity-70"
                              >
                                Risolvi
                              </button>
                            </div>
                          )}

                          {/* Grammatura + riassegnazione giorno/pasto */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={1}
                                value={item.portionG}
                                onChange={(e) =>
                                  updateItem(item.key, { portionG: parseInt(e.target.value) || 0 })
                                }
                                className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-xs"
                                aria-label={`Grammatura per ${item.raw_name}`}
                              />
                              <span className="text-[11px] text-muted-foreground">g</span>
                            </div>

                            <Select
                              value={String(item.dayOfWeek)}
                              onValueChange={(v) => updateItem(item.key, { dayOfWeek: Number(v) })}
                            >
                              <SelectTrigger className="h-7 w-[7.5rem] text-[11px] px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DAYS_OF_WEEK.map((label, idx) => (
                                  <SelectItem key={idx} value={String(idx)} className="text-xs">
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={item.mealType}
                              onValueChange={(v) =>
                                updateItem(item.key, { mealType: v as keyof typeof MEAL_TYPES })
                              }
                            >
                              <SelectTrigger className="h-7 w-[9.5rem] text-[11px] px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MEAL_TYPE_KEYS.map((mt) => (
                                  <SelectItem key={mt} value={mt} className="text-xs">
                                    {MEAL_TYPES[mt]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* ── Step C: Commit ── */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="diet-import-start-date">
                Data di inizio del nuovo piano
              </label>
              <input
                id="diet-import-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <FileText className="h-3 w-3 shrink-0" />
                Il piano attualmente attivo verrà chiuso il giorno precedente a questa data.
              </p>
            </div>

            {commitError && (
              <div role="alert" className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
                {commitError}
              </div>
            )}

            <Button
              onClick={handleCommit}
              disabled={unresolvedCount > 0 || committing}
              className="w-full"
            >
              {committing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {committing
                ? 'Importazione in corso...'
                : unresolvedCount > 0
                ? `Risolvi ${unresolvedCount} ${unresolvedCount === 1 ? 'alimento' : 'alimenti'} per continuare`
                : 'Importa e attiva il piano'}
            </Button>
          </div>
        </div>
      )}

      {resolvingItem && (
        <ResolveDietFoodModal
          isOpen={!!resolvingItem}
          onClose={() => setResolvingKey(null)}
          rawName={resolvingItem.raw_name}
          initialPortionG={resolvingItem.portionG}
          onResolveExisting={(food) => handleResolveExisting(resolvingItem.key, food)}
          onResolveNew={(draft) => handleResolveNew(resolvingItem.key, draft)}
        />
      )}
    </PageContainer>
  );
}
