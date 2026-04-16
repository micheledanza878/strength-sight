import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (authError) setError(authError.message);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8">
      <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
        <Dumbbell className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-3xl font-bold mb-1">Workout Tracker</h1>
      <p className="text-muted-foreground text-sm mb-8">Il tuo diario di allenamento</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full h-14 bg-card rounded-2xl px-5 text-foreground placeholder:text-muted-foreground outline-none text-base"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full h-14 bg-card rounded-2xl px-5 text-foreground placeholder:text-muted-foreground outline-none text-base"
        />
        {error && <p className="text-destructive text-sm text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base"
        >
          {loading ? "..." : isSignUp ? "Registrati" : "Accedi"}
        </button>
      </form>

      <button
        onClick={() => setIsSignUp(!isSignUp)}
        className="mt-4 text-sm text-muted-foreground"
      >
        {isSignUp ? "Hai già un account? Accedi" : "Non hai un account? Registrati"}
      </button>
    </div>
  );
}
