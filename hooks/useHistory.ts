import { useEffect, useState, useCallback } from "react";
import type { SupabaseClientType } from "@/lib/supabase/client";
import type { LessonContent } from "@/types/lesson";

export interface LessonHistoryItem {
  id: string;
  subject: string;
  lesson_data: LessonContent;
  created_at: string;
}

const PLAN_DAYS: Record<string, number | null> = {
  gratis: 7,
  pro: 14,
  max: null, // sem limite
};

export function useHistory(
  supabase: SupabaseClientType | null,
  userId: string | undefined,
  plan: string | null | undefined = "gratis"
) {
  const [history, setHistory] = useState<LessonHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(() => {
    if (!supabase || !userId) return;

    const days = PLAN_DAYS[plan ?? "gratis"] ?? PLAN_DAYS["gratis"];

    let query = supabase
      .from("lesson_history")
      .select("id, subject, lesson_data, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (days !== null) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      query = query.gte("created_at", cutoff.toISOString());
    }

    setLoading(true);
    query.then(({ data }) => {
      if (data) setHistory(data as LessonHistoryItem[]);
      setLoading(false);
    });
  }, [supabase, userId, plan]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { history, loading, refresh: fetch };
}
