import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Exporta o tipo para compatibilidade com HomeScreen e HomeClient
export interface UserProfile {
  plan: "gratis" | "pro" | "max";
  lessons_today: number;
  last_lesson_date: string;
  streak_days: number;
}

export default async function RootPage() {
  const supabase = await createClient().catch(() => null);

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

    if (user) redirect("/home");
  }

  redirect("/login");
}
