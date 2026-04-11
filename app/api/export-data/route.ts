import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const uid = user.id;

    const [profileRes, lessonsRes, mapsRes, journeysRes, sessionsRes] = await Promise.all([
      admin
        .from("profiles")
        .select("email, plan, streak_days, lessons_today, last_lesson_date, maps_today, last_map_date, challenges_today, last_challenge_date, onboarding_completed, created_at, updated_at")
        .eq("id", uid)
        .single(),
      admin
        .from("lesson_history")
        .select("id, subject, lesson_data, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
      admin
        .from("mind_maps")
        .select("id, topic, nodes, edges, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
      admin
        .from("journeys")
        .select("id, title, objective, duration_days, lessons, completed_days, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
      admin
        .from("language_sessions")
        .select("id, language, level, messages, created_at, updated_at")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: "1.0",
      user: {
        id: uid,
        email: user.email,
      },
      profile: profileRes.data ?? null,
      statistics: {
        totalLessons: lessonsRes.data?.length ?? 0,
        totalMindMaps: mapsRes.data?.length ?? 0,
        totalJourneys: journeysRes.data?.length ?? 0,
        totalLanguageSessions: sessionsRes.data?.length ?? 0,
      },
      lessonHistory: lessonsRes.data ?? [],
      mindMaps: mapsRes.data ?? [],
      journeys: journeysRes.data ?? [],
      languageSessions: sessionsRes.data ?? [],
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("[export-data error]", error);
    return NextResponse.json({ error: "Erro ao exportar dados." }, { status: 500 });
  }
}
