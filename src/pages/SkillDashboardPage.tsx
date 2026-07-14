import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PageContainer from "@/components/PageContainer";
import { SkillDashboard } from "@/components/skillDashboard/SkillDashboard";

export default function SkillDashboardPage() {
  const navigate = useNavigate();

  return (
    <PageContainer variant="wide" className="px-4 pt-14 pb-32 min-h-screen">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard Skill</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Progressi, volume e aderenza allo split</p>
        </div>
      </div>

      <SkillDashboard />
    </PageContainer>
  );
}
