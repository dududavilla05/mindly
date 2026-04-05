import { useEffect, useState, useCallback } from "react";
import type { SupabaseClientType } from "@/lib/supabase/client";
import type { MindMapNode, MindMapEdge } from "@/components/MindMap";

export interface MindMapItem {
  id: string;
  title: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  created_at: string;
}

export function useMindMaps(
  supabase: SupabaseClientType | null,
  userId: string | undefined,
  plan: string | null | undefined
) {
  const [mindMaps, setMindMaps] = useState<MindMapItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(() => {
    if (!supabase || !userId) return;
    setLoading(true);
    supabase
      .from("mind_maps")
      .select("id, title, nodes, edges, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) setMindMaps(data as MindMapItem[]);
        setLoading(false);
      });
  }, [supabase, userId, plan]);

  useEffect(() => { fetch(); }, [fetch]);

  return { mindMaps, loading, refresh: fetch };
}
