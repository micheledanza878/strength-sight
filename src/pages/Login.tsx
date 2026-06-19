import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validazioni
    if (!email.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci l'email",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Errore",
        description: "Inserisci un'email valida",
        variant: "destructive",
      });
      return;
    }

    if (!password) {
      toast({
        title: "Errore",
        description: "Inserisci la password",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Errore",
        description: "La password deve avere almeno 6 caratteri",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isRegister) {
        await register(email, password);
        toast({ title: "Successo", description: "Account creato con successo!" });
      } else {
        await login(email, password);
      }
      navigate("/");
    } catch (error) {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore di autenticazione",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-end px-5 pb-10 bg-background relative overflow-hidden">

      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-primary/20 blur-2xl pointer-events-none" />

      {/* Logo block */}
      <div className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center" style={{ top: "12%" }}>
        <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center mb-5 glow-primary shadow-2xl">
          <span className="text-4xl">💪</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Strength Sight</h1>
        <p className="text-sm text-muted-foreground mt-2">Traccia i tuoi progressi in palestra</p>
      </div>

      {/* Form card */}
      <div className="w-full bg-card border border-border rounded-3xl p-6 shadow-2xl">
        <h2 className="text-lg font-bold mb-5">
          {isRegister ? "Crea account" : "Accedi"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tue.email@example.com"
              className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary transition-all"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary transition-all"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl font-bold text-white gradient-primary glow-primary transition-all active:scale-95 disabled:opacity-60 mt-1"
          >
            {isLoading ? "Caricamento..." : isRegister ? "Crea account" : "Accedi"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-sm text-muted-foreground">
            {isRegister ? "Hai già un account?" : "Non hai un account?"}
            <button
              onClick={() => setIsRegister(!isRegister)}
              disabled={isLoading}
              className="ml-1.5 text-primary font-semibold disabled:opacity-60"
            >
              {isRegister ? "Accedi" : "Crea account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
