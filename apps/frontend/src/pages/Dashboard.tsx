import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronRight, Flame, Trophy, ChevronLeft, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useActivePlan } from "@/contexts/ActivePlanContext";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/api/client";
import type { DashboardStats } from "@strength-sight/shared";

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { activePlanId, setActivePlanId } = useActivePlan();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => { loadStats(); }, [activePlanId]);

  async function loadStats() {
    try {
      const params = activePlanId ? `?activePlanId=${activePlanId}` : '';
      const data = await apiRequest<DashboardStats>(`/api/dashboard/stats${params}`);
      setStats(data);
      if (data.plans.length > 0 && !activePlanId) setActivePlanId(data.plans[0].id);
    } catch (error) {
      console.error("Errore caricamento dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function changePlan(planId: string) {
    setActivePlanId(planId);
  }

  const now = new Date();
  const monthDays = eachDayOfInterval({ start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) });
  const firstDayOffset = (startOfMonth(selectedMonth).getDay() + 6) % 7;
  const workoutDates = stats
    ? stats.volumeChart.map((p) => parseISO(`${p.date.split('/').reverse().join('-')}`)).filter(Boolean)
    : [];

  return (
    <div className="px-5 pt-14 pb-24 min-h-screen">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-bold">Workout</h1>
        <button onClick={() => { logout(); navigate("/login"); }} className="p-2 text-muted-foreground hover:text-foreground transition-colors" title="Logout">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
      <p className="text-muted-foreground text-sm mb-4">{format(now, "EEEE d MMMM", { locale: it })}</p>

      {stats && stats.plans.length > 0 && (
        <div className="mb-6">
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-2">Scheda allenamento</label>
          <Select value={activePlanId || ""} onValueChange={changePlan}>
            <SelectTrigger className="w-full bg-card border-0 h-12"><SelectValue placeholder="Seleziona scheda" /></SelectTrigger>
            <SelectContent>{stats.plans.map((plan) => <SelectItem key={plan.id} value={plan.id}>{plan.name}{plan.duration_weeks && ` • ${plan.duration_weeks} sett.`}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {loading && (
        <div className="space-y-3 mb-4">
          <Skeleton className="w-full h-24 rounded-2xl" />
          <div className="grid grid-cols-3 gap-3"><Skeleton className="h-16 rounded-2xl" /><Skeleton className="h-16 rounded-2xl" /><Skeleton className="h-16 rounded-2xl" /></div>
          <Skeleton className="w-full h-20 rounded-2xl" />
        </div>
      )}

      {!loading && stats?.nextPlanDay && (
        <button onClick={() => navigate(`/session/${stats.nextPlanDay!.id}`)} className="w-full bg-card rounded-2xl p-5 mb-4 text-left flex items-center justify-between active:scale-[0.98] transition-transform">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Prossimo</p>
            <p className="text-xl font-bold">{stats.nextPlanDay.day_name}</p>
            <p className="text-xs text-muted-foreground mt-1">Giorno {stats.nextPlanDay.day_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10"><Flame className="w-6 h-6 text-primary" /></div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </button>
      )}

      {!loading && stats && (
        <div className="bg-card rounded-2xl p-5 mb-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-4">Riassunto</p>
          <div className="space-y-3">
            {stats.topPRs.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">🏆 Top PR</p>
                <p className="text-sm font-semibold">{stats.topPRs[0].exercise}</p>
                <p className="text-xs text-muted-foreground">{stats.topPRs[0].weight}kg × {stats.topPRs[0].reps} rep</p>
              </div>
            )}
            {stats.lastMeasurementDaysAgo !== null && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">📅 Ultima misurazione</p>
                <p className="text-sm font-semibold">{stats.lastMeasurementDaysAgo} giorni fa</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && stats && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-card rounded-2xl p-4 text-center"><p className="text-2xl font-bold">{stats.streak}</p><p className="text-[11px] text-muted-foreground mt-0.5">🔥 streak</p></div>
          <div className="bg-card rounded-2xl p-4 text-center"><p className="text-2xl font-bold">{stats.weekCount}</p><p className="text-[11px] text-muted-foreground mt-0.5">questa sett.</p></div>
          <div className="bg-card rounded-2xl p-4 text-center"><p className="text-2xl font-bold">{stats.monthCount}</p><p className="text-[11px] text-muted-foreground mt-0.5">questo mese</p></div>
        </div>
      )}

      {!loading && stats?.weeklyVolumeChart && stats.weeklyVolumeChart.length > 1 && (
        <div className="bg-card rounded-2xl p-5 mb-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-4">Volume settimanale</p>
          <div className="h-44">
            <ResponsiveContainer width="95%" height="100%" style={{ margin: "0 auto" }}>
              <LineChart data={stats.weeklyVolumeChart} margin={{ top: 5, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={40} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11 }} formatter={(v: number) => [`${v.toLocaleString()} kg`, "Volume"]} />
                <Line type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!loading && stats?.volumeChart && stats.volumeChart.length > 1 && (
        <div className="bg-card rounded-2xl p-5 mb-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-4">Volume per sessione</p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.volumeChart} barSize={20}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11 }} formatter={(v: number) => [`${v.toLocaleString()} kg`, "Volume"]} />
                <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {stats.monthVolume > 0 && <p className="text-xs text-muted-foreground text-center mt-2">{stats.monthVolume.toLocaleString()} kg sollevati questo mese</p>}
        </div>
      )}

      <div className="bg-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))} className="text-muted-foreground hover:text-foreground transition-colors p-1"><ChevronLeft className="w-5 h-5" /></button>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{format(selectedMonth, "MMMM yyyy", { locale: it })}</p>
          <button onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} className="text-muted-foreground hover:text-foreground transition-colors p-1"><ChevronRight className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["L","M","M","G","V","S","D"].map((d, i) => <span key={i} className="text-[10px] text-muted-foreground font-medium pb-1">{d}</span>)}
          {Array.from({ length: firstDayOffset }).map((_, i) => <span key={`empty-${i}`} />)}
          {monthDays.map((day) => {
            const isToday = isSameDay(day, now);
            return (
              <div key={day.toISOString()} className={`w-9 h-9 flex items-center justify-center rounded-full text-xs font-medium mx-auto ${isToday ? "ring-1 ring-primary text-primary" : "text-muted-foreground"}`}>
                {format(day, "d")}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
