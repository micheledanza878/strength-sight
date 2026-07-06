import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Loader2 } from 'lucide-react';
import { MealCard } from '@/components/Diet/MealCard';
import { DAYS_OF_WEEK } from '@/types/diet';
import {
  getOrCreateWeeklyPlan,
  getDayView,
} from '@/services/dietService';
import type { DayView } from '@/types/diet';
import PageContainer from '@/components/PageContainer';

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export default function DietViewer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const getTodayAsAppDay = () => {
    const today = new Date().getDay();
    return (today - 1 + 7) % 7;
  };
  const todayIndex = getTodayAsAppDay();
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [dayView, setDayView] = useState<DayView | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyPlanId, setWeeklyPlanId] = useState<string | null>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);

  // Initialize: get or create weekly plan
  useEffect(() => {
    if (!user?.id) return;

    async function init() {
      try {
        setLoading(true);
        const plan = await getOrCreateWeeklyPlan(user.id);
        setWeeklyPlanId(plan.id);
      } catch (error) {
        console.error('Error initializing diet plan:', error);
      }
    }

    init();
  }, [user?.id]);

  // Load day view when plan or selected day changes
  useEffect(() => {
    if (!weeklyPlanId) return;

    async function loadDay() {
      try {
        setRefreshing(true);
        const view = await getDayView(weeklyPlanId, selectedDay);
        setDayView(view);
      } catch (error) {
        console.error('Error loading day view:', error);
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    }

    loadDay();
  }, [weeklyPlanId, selectedDay]);

  async function handleFoodSwapped() {
    if (!weeklyPlanId) return;
    try {
      const view = await getDayView(weeklyPlanId, selectedDay);
      setDayView(view);
    } catch (error) {
      console.error('Error refreshing day view:', error);
    }
  }

  function handleSelectDay(index: number) {
    setSelectedDay(index);
    // Scroll the selected pill into center view
    const container = dayScrollRef.current;
    const pill = container?.children[index] as HTMLElement | undefined;
    if (container && pill) {
      const offset = pill.offsetLeft - container.offsetWidth / 2 + pill.offsetWidth / 2;
      container.scrollTo({ left: offset, behavior: 'smooth' });
    }
  }

  // Total kcal for current day
  const totalKcal = dayView?.meals.reduce(
    (sum, meal) => sum + meal.foods.reduce((s, f) => s + (f.calories || 0), 0),
    0
  ) ?? 0;

  const sortedMeals = dayView?.meals.slice().sort((a, b) => {
    const order: Record<string, number> = { colazione: 0, pranzo: 1, cena: 2 };
    return (order[a.mealType] ?? 9) - (order[b.mealType] ?? 9);
  }) ?? [];

  return (
    <PageContainer variant="default" className="pt-14 pb-32 min-h-screen">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dieta</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Il tuo piano alimentare</p>
        </div>
        <button
          onClick={() => navigate('/diet/foods')}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-secondary text-muted-foreground text-xs font-semibold active:scale-95 transition-transform"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Guida
        </button>
      </div>

      {/* ── Day Selector ── */}
      <div
        ref={dayScrollRef}
        className="flex gap-2 overflow-x-auto no-scrollbar px-4 mb-4"
      >
        {DAY_LABELS.map((label, index) => {
          const isToday = index === todayIndex;
          const isSelected = index === selectedDay;
          return (
            <button
              key={index}
              onClick={() => handleSelectDay(index)}
              disabled={refreshing}
              className={[
                'flex-shrink-0 flex flex-col items-center gap-0.5 w-12 py-2.5 rounded-2xl text-xs font-semibold transition-all active:scale-95',
                isSelected
                  ? 'gradient-primary text-white glow-primary-sm'
                  : isToday
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-card border border-border text-muted-foreground',
              ].join(' ')}
            >
              <span>{label}</span>
              {isToday && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div className="px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6 items-start">
        {/* ── Daily kcal summary ── */}
        {!loading && totalKcal > 0 && (
          <div className="md:col-span-2 lg:col-span-3 bg-card border border-border rounded-2xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Totale giornaliero</span>
            <span className="text-sm font-bold text-primary">{totalKcal} kcal</span>
          </div>
        )}

        {loading ? (
          <>
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </>
        ) : refreshing ? (
          <div className="md:col-span-2 lg:col-span-3 flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sortedMeals.length > 0 ? (
          sortedMeals.map((meal) => (
            <MealCard
              key={meal.mealId}
              mealId={meal.mealId}
              mealType={meal.mealType}
              foods={meal.foods}
              onFoodSwapped={handleFoodSwapped}
              weeklyPlanId={weeklyPlanId || undefined}
              dayOfWeek={selectedDay}
            />
          ))
        ) : (
          <div className="md:col-span-2 lg:col-span-3 bg-card border border-border rounded-2xl p-10 text-center">
            <p className="text-2xl mb-2">🍽</p>
            <p className="text-sm font-medium text-muted-foreground">Nessun pasto per questo giorno</p>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
