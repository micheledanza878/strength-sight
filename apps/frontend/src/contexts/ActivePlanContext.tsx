import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ActivePlanContextType {
  activePlanId: string | null;
  setActivePlanId: (planId: string | null) => void;
}

const ActivePlanContext = createContext<ActivePlanContextType | undefined>(undefined);

export function ActivePlanProvider({ children }: { children: ReactNode }) {
  const [activePlanId, setActivePlanIdState] = useState<string | null>(null);

  // Carica da localStorage al mount
  useEffect(() => {
    const saved = localStorage.getItem('activePlanId');
    if (saved) {
      setActivePlanIdState(saved);
    }
  }, []);

  // Salva in localStorage quando cambia
  const setActivePlanId = (planId: string | null) => {
    setActivePlanIdState(planId);
    if (planId) {
      localStorage.setItem('activePlanId', planId);
    } else {
      localStorage.removeItem('activePlanId');
    }
  };

  return (
    <ActivePlanContext.Provider value={{ activePlanId, setActivePlanId }}>
      {children}
    </ActivePlanContext.Provider>
  );
}

export function useActivePlan() {
  const context = useContext(ActivePlanContext);
  if (context === undefined) {
    throw new Error('useActivePlan must be used within ActivePlanProvider');
  }
  return context;
}
