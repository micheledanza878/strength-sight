import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "La password deve avere almeno 6 caratteri" }), {
        status: 400,
      });
    }

    if (username.length < 3) {
      return new Response(JSON.stringify({ error: "L'username deve avere almeno 3 caratteri" }), {
        status: 400,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Hash password using Web Crypto API
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", passwordBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Create user
    const { data: user, error: createError } = await supabase
      .from("users")
      .insert({
        username,
        password_hash: passwordHash,
      })
      .select("id, username")
      .single();

    if (createError) {
      if (createError.code === "23505") {
        return new Response(JSON.stringify({ error: "Username già in uso" }), {
          status: 409,
        });
      }
      throw createError;
    }

    return new Response(
      JSON.stringify({
        id: user.id,
        username: user.username,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Register error:", error);
    return new Response(JSON.stringify({ error: "Errore interno del server" }), {
      status: 500,
    });
  }
});
