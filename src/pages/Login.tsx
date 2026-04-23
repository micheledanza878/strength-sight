import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      alert(`${isRegister ? "Registrazione" : "Login"} in corso...`);
      if (isRegister) {
        alert("Chiamando register...");
        await register(username, password);
        alert("✅ Account creato con successo!");
        toast({ title: "Successo", description: "Account creato con successo!" });
      } else {
        alert("Chiamando login...");
        await login(username, password);
        alert("✅ Login riuscito!");
      }
      navigate("/");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Errore di autenticazione";
      alert(`❌ Errore: ${errorMsg}`);
      toast({
        title: "Errore",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-background">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl font-bold mb-2">💪</div>
          <h1 className="text-3xl font-bold">Strength Sight</h1>
          <p className="text-sm text-muted-foreground mt-2">Traccia i tuoi progressi in palestra</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-1.5">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Il tuo username"
              className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="La tua password"
              className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl font-bold text-white bg-primary transition-transform active:scale-95 disabled:opacity-60"
          >
            {isLoading ? "Caricamento..." : isRegister ? "Crea account" : "Accedi"}
          </button>
        </form>

        {/* Toggle login/register */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {isRegister ? "Hai già un account?" : "Non hai un account?"}
            <button
              onClick={() => setIsRegister(!isRegister)}
              disabled={isLoading}
              className="ml-2 text-primary font-medium hover:underline disabled:opacity-60"
            >
              {isRegister ? "Accedi" : "Crea account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
