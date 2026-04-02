import { useEffect, useState, useCallback } from "react";
import type { SupabaseClientType } from "@/lib/supabase/client";

export interface JourneyLesson {
  day: number;
  title: string;
  description: string;
}

export interface JourneyItem {
  id: string;
  title: string;
  objective: string;
  duration_days: number;
  lessons: JourneyLesson[];
  completed_days: number;        // integer count
  streak: number;                // integer
  completed_day_list: number[];  // jsonb array of completed day numbers
  created_at: string;
}

export function useJourneys(
  supabase: SupabaseClientType | null,
  userId: string | undefined,
  plan: string | null | undefined
) {
  const [journeys, setJourneys] = useState<JourneyItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(() => {
    if (!supabase || !userId || plan !== "max") return;
    setLoading(true);
    supabase
      .from("journeys")
      .select("id, title, objective, duration_days, lessons, completed_days, streak, completed_day_list, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setJourneys(data as JourneyItem[]);
        setLoading(false);
      });
  }, [supabase, userId, plan]);

  useEffect(() => { fetch(); }, [fetch]);

  return { journeys, loading, refresh: fetch };
}
