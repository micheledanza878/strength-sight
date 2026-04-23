import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: "Username e password richiesti" }), {
        status: 400,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get user by username
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, username, password_hash")
      .eq("username", username)
      .single();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Username o password non validi" }), {
        status: 401,
      });
    }

    // Verify password using Web Crypto API
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", passwordBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    if (hashHex !== user.password_hash) {
      return new Response(JSON.stringify({ error: "Username o password non validi" }), {
        status: 401,
      });
    }

    // Return user data (without password_hash)
    return new Response(
      JSON.stringify({
        id: user.id,
        username: user.username,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({ error: "Errore interno del server" }), {
      status: 500,
    });
  }
});
