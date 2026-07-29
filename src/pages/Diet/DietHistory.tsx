import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getWeeklyPlans, getDayView } from '@/services/dietService';
import type { DietWeeklyPlan, DayView } from '@/types/diet';
import { MEAL_TYPES } from '@/types/diet';
import PageContainer from '@/components/PageContainer';

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '?';
  return new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DietHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<DietWeeklyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [dayView, setDayView] = useState<DayView | null>(null);
  const [dayLoading, setDayLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getWeeklyPlans(user.id)
      .then(setPlans)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (!expandedPlanId) {
      setDayView(null);
      return;
    }
    setDayLoading(true);
    getDayView(expandedPlanId, selectedDay)
      .then(setDayView)
      .catch(console.error)
      .finally(() => setDayLoading(false));
  }, [expandedPlanId, selectedDay]);

  function toggleExpand(plan: DietWeeklyPlan) {
    if (expandedPlanId === plan.id) {
      setExpandedPlanId(null);
      return;
    }
    setExpandedPlanId(plan.id);
    setSelectedDay(0);
  }

  return (
    <PageContainer variant="default" className="pt-14 pb-32 min-h-screen">
      <div className="flex items-center gap-3 px-4 mb-5">
        <button
          onClick={() => navigate('/diet')}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform flex-shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Storico diete</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Tutti i piani alimentari precedenti</p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <p className="text-sm font-medium text-muted-foreground">Nessun piano trovato</p>
          </div>
        ) : (
          plans.map((plan) => {
            const isExpanded = expandedPlanId === plan.id;
            return (
              <div
                key={plan.id}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => toggleExpand(plan)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 active:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold truncate">
                      {formatDate(plan.start_date)} — {plan.is_active ? 'oggi' : formatDate(plan.end_date)}
                    </span>
                    {plan.is_active && (
                      <span className="shrink-0 rounded-full bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5">
                        ATTIVO
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-4 py-3">
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3">
                      {DAY_LABELS.map((label, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedDay(index)}
                          className={`flex-shrink-0 w-10 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            selectedDay === index
                              ? 'gradient-primary text-white'
                              : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {dayLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : !dayView || dayView.meals.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        Nessun pasto per questo giorno
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {dayView.meals.map((meal) => (
                          <div key={meal.mealId}>
                            <p className="text-xs font-bold text-muted-foreground mb-1.5">
                              {MEAL_TYPES[meal.mealType as keyof typeof MEAL_TYPES] || meal.mealType}
                            </p>
                            <div className="space-y-1">
                              {meal.foods.map((food) => (
                                <div
                                  key={food.mealFoodId}
                                  className="flex items-center justify-between text-sm px-3 py-1.5 rounded-lg bg-secondary/50"
                                >
                                  <span className="truncate">{food.name}</span>
                                  <span className="shrink-0 text-muted-foreground tabular-nums ml-2">
                                    {food.portion}g
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </PageContainer>
  );
}
