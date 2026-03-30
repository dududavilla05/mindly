import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HomeClient from "./HomeClient";
import type { UserProfile } from "@/app/page";

export default async function HomePage() {
  // Auth server-side — sem race condition, sem useEffect
  const supabase = await createClient().catch(() => null);
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  if (!user) redirect("/login");

  // Busca perfil server-side para evitar flash no cliente
  let profile: UserProfile | null = null;
  const { data } = await supabase
    .from("profiles")
    .select("plan, lessons_today, last_lesson_date")
    .eq("id", user.id)
    .single();

  if (data) {
    const today = new Date().toISOString().split("T")[0];
    profile =
      data.last_lesson_date !== today
        ? {
            plan: data.plan as UserProfile["plan"],
            lessons_today: 0,
            last_lesson_date: today,
          }
        : (data as UserProfile);
  }

  return <HomeClient initialUser={user} initialProfile={profile} />;
}
