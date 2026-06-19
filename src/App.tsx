import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { ActivePlanProvider } from '@/contexts/ActivePlanContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WorkoutSelect from './pages/WorkoutSelect';
import WorkoutSession from './pages/WorkoutSession';
import BodyTracking from './pages/BodyTracking';
import History from './pages/History';
import CreateWorkoutPlan from './pages/CreateWorkoutPlan';
import EditWorkoutPlan from './pages/EditWorkoutPlan';
import EditWorkoutDay from './pages/EditWorkoutDay';
import DietViewer from './pages/Diet/DietViewer';
import FoodGuide from './pages/Diet/FoodGuide';
import BottomNav from './components/BottomNav';
import Settings from './pages/Settings';

export default function App() {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <ActivePlanProvider>
          <TooltipProvider>
            <Sonner>
              <BrowserRouter>
                <Routes>
                  <Route path='/login' element={<Login />} />
                  <Route
                    path='/'
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path='/workout'
                    element={
                      <ProtectedRoute>
                        <WorkoutSelect />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path='/session'
                    element={
                      <ProtectedRoute>
                        <WorkoutSession />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path='/body'
                    element={
                      <ProtectedRoute>
                        <BodyTracking />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path='/history'
                    element={
                      <ProtectedRoute>
                        <History />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path='/create-plan'
                    element={
                      <ProtectedRoute>
                        <CreateWorkoutPlan />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path='/edit-plan'
                    element={
                      <ProtectedRoute>
                        <EditWorkoutPlan />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path='/edit-day'
                    element={
                      <ProtectedRoute>
                        <EditWorkoutDay />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path='/diet'
                    element={
                      <ProtectedRoute>
                        <DietViewer />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path='/food-guide'
                    element={
                      <ProtectedRoute>
                        <FoodGuide />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path='/settings'
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
                <BottomNav />
              </BrowserRouter>
            </Sonner>
          </TooltipProvider>
        </ActivePlanProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}