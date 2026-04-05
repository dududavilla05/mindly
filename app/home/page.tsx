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
    .select("plan, lessons_today, last_lesson_date, streak_days, maps_today, last_map_date")
    .eq("id", user.id)
    .single();

  if (data) {
    const today = new Date().toISOString().split("T")[0];
    profile = {
      plan: data.plan as UserProfile["plan"],
      lessons_today: data.last_lesson_date !== today ? 0 : (data.lessons_today ?? 0),
      last_lesson_date: data.last_lesson_date !== today ? today : data.last_lesson_date,
      streak_days: data.streak_days ?? 0,
      maps_today: data.maps_today ?? 0,
      last_map_date: data.last_map_date ?? null,
    };
  }

  return <HomeClient initialUser={user} initialProfile={profile} />;
}
