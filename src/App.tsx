import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "./pages/Dashboard";
import WorkoutSelect from "./pages/WorkoutSelect";
import WorkoutSession from "./pages/WorkoutSession";
import BodyTracking from "./pages/BodyTracking";
import History from "./pages/History";
import CreateWorkoutPlan from "./pages/CreateWorkoutPlan";
import EditWorkoutPlan from "./pages/EditWorkoutPlan";
import EditWorkoutDay from "./pages/EditWorkoutDay";
import BottomNav from "./components/BottomNav";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/workout" element={<WorkoutSelect />} />
        <Route path="/session/:dayId" element={<WorkoutSession />} />
        <Route path="/body" element={<BodyTracking />} />
        <Route path="/history" element={<History />} />
        <Route path="/create-plan" element={<CreateWorkoutPlan />} />
        <Route path="/edit-plan/:planId" element={<EditWorkoutPlan />} />
        <Route path="/edit-day/:dayId" element={<EditWorkoutDay />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
