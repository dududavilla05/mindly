import { useEffect, useState } from "react";
import type { SupabaseClientType } from "@/lib/supabase/client";
import type { LessonContent } from "@/types/lesson";

export interface LessonHistoryItem {
  id: string;
  subject: string;
  lesson_data: LessonContent;
  created_at: string;
}

export function useHistory(
  supabase: SupabaseClientType | null,
  userId: string | undefined
) {
  const [history, setHistory] = useState<LessonHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase || !userId) return;

    setLoading(true);
    supabase
      .from("lesson_history")
      .select("id, subject, lesson_data, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setHistory(data as LessonHistoryItem[]);
        setLoading(false);
      });
  }, [supabase, userId]);

  return { history, loading };
}
