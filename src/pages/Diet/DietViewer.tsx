import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { MealCard } from '@/components/Diet/MealCard';
import { DAYS_OF_WEEK } from '@/types/diet';
import {
  getOrCreateWeeklyPlan,
  getDayView,
  getWeeklyPlanWithMeals
} from '@/services/dietService';
import type { DayView } from '@/types/diet';

export default function DietViewer() {
  const { user } = useAuth();
  const getTodayAsAppDay = () => {
    const today = new Date().getDay();
    return (today - 1 + 7) % 7;
  };
  const [selectedDay, setSelectedDay] = useState(getTodayAsAppDay());
  const [dayView, setDayView] = useState<DayView | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyPlanId, setWeeklyPlanId] = useState<string | null>(null);

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

  function handlePreviousDay() {
    setSelectedDay((prev) => (prev === 0 ? 6 : prev - 1));
  }

  function handleNextDay() {
    setSelectedDay((prev) => (prev === 6 ? 0 : prev + 1));
  }

  async function handleFoodSwapped() {
    if (!weeklyPlanId) return;
    // Refresh current day view
    try {
      const view = await getDayView(weeklyPlanId, selectedDay);
      setDayView(view);
    } catch (error) {
      console.error('Error refreshing day view:', error);
    }
  }

  return (
    <div className="px-5 pt-14 pb-24 min-h-screen">
      <h1 className="text-3xl font-bold mb-1">Piano Dietetico</h1>
      <p className="text-muted-foreground text-sm mb-4">
        Consulta il tuo piano alimentare
      </p>

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Day Selector */}
          <div className="space-y-3 mb-6">
            {/* Day navigation */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviousDay}
                disabled={refreshing}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div className="flex-1 text-center">
                <p className="text-lg font-semibold">
                  {DAYS_OF_WEEK[selectedDay]}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextDay}
                disabled={refreshing}
                className="h-8 w-8"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Day indicators */}
            <div className="flex gap-1.5">
              {DAYS_OF_WEEK.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedDay(index)}
                  disabled={refreshing}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    selectedDay === index
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}
                  aria-label={`Day ${index}`}
                />
              ))}
            </div>
          </div>

          {/* Meals */}
          <div className="space-y-3">
            {refreshing ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : dayView && dayView.meals.length > 0 ? (
              dayView.meals
                .sort((a, b) => {
                  const order = { 'colazione': 0, 'pranzo': 1, 'cena': 2 };
                  const aOrder = order[a.mealType as keyof typeof order] ?? 999;
                  const bOrder = order[b.mealType as keyof typeof order] ?? 999;
                  return aOrder - bOrder;
                })
                .map((meal) => (
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
              <div className="bg-card rounded-2xl p-8 text-center border border-border">
                <p className="text-sm text-muted-foreground">
                  Nessun pasto configurato per questo giorno
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
