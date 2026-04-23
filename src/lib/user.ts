import { supabase } from "@/integrations/supabase/client";

export async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }
  return session.user.id;
}
