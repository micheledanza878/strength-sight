import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ActivePlanProvider } from "@/contexts/ActivePlanContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import WorkoutSelect from "./pages/WorkoutSelect";
import WorkoutSession from "./pages/WorkoutSession";
import BodyTracking from "./pages/BodyTracking";
import History from "./pages/History";
import CreateWorkoutPlan from "./pages/CreateWorkoutPlan";
import EditWorkoutPlan from "./pages/EditWorkoutPlan";
import EditWorkoutDay from "./pages/EditWorkoutDay";
import DietViewer from "./pages/Diet/DietViewer";
import FoodGuide from "./pages/Diet/FoodGuide";
import ExerciseDetail from "./pages/ExerciseDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute element={<AppLayout />} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/workout" element={<WorkoutSelect />} />
        <Route path="/session/:dayId" element={<WorkoutSession />} />
        <Route path="/body" element={<BodyTracking />} />
        <Route path="/diet" element={<DietViewer />} />
        <Route path="/diet/foods" element={<FoodGuide />} />
        <Route path="/history" element={<History />} />
        <Route path="/create-plan" element={<CreateWorkoutPlan />} />
        <Route path="/edit-plan/:planId" element={<EditWorkoutPlan />} />
        <Route path="/edit-day/:dayId" element={<EditWorkoutDay />} />
        <Route path="/exercise/:name" element={<ExerciseDetail />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ActivePlanProvider>
            <AppContent />
          </ActivePlanProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
