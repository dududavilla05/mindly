import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const ADMIN_ID = "5e6f4207-8242-41ce-9fdd-092d64237810";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== ADMIN_ID) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // All-time totals + today + week + month
    const [todayRes, weekRes, monthRes, allTimeRes, last7DaysRes, byFeatureRes] = await Promise.all([
      adminSupabase
        .from("api_usage")
        .select("custo_usd, input_tokens, output_tokens")
        .gte("created_at", `${todayStr}T00:00:00.000Z`),
      adminSupabase
        .from("api_usage")
        .select("custo_usd, input_tokens, output_tokens")
        .gte("created_at", weekAgo),
      adminSupabase
        .from("api_usage")
        .select("custo_usd, input_tokens, output_tokens")
        .gte("created_at", monthStart),
      adminSupabase
        .from("api_usage")
        .select("custo_usd, input_tokens, output_tokens"),
      // Last 7 days grouped by date
      adminSupabase
        .from("api_usage")
        .select("created_at, custo_usd")
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: true }),
      // By feature
      adminSupabase
        .from("api_usage")
        .select("feature, custo_usd, input_tokens, output_tokens"),
    ]);

    const sum = (rows: { custo_usd: number }[] | null) =>
      (rows ?? []).reduce((acc, r) => acc + Number(r.custo_usd), 0);

    const todayCost   = sum(todayRes.data);
    const weekCost    = sum(weekRes.data);
    const monthCost   = sum(monthRes.data);
    const allTimeCost = sum(allTimeRes.data);

    // Group last 7 days by date
    const dayMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dayMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const row of last7DaysRes.data ?? []) {
      const day = row.created_at.slice(0, 10);
      if (dayMap.has(day)) dayMap.set(day, dayMap.get(day)! + Number(row.custo_usd));
    }
    const last7Days = Array.from(dayMap.entries()).map(([date, cost]) => ({ date, cost }));

    // Group by feature
    const featureMap = new Map<string, { cost: number; calls: number; input: number; output: number }>();
    for (const row of byFeatureRes.data ?? []) {
      const cur = featureMap.get(row.feature) ?? { cost: 0, calls: 0, input: 0, output: 0 };
      featureMap.set(row.feature, {
        cost:   cur.cost   + Number(row.custo_usd),
        calls:  cur.calls  + 1,
        input:  cur.input  + Number(row.input_tokens),
        output: cur.output + Number(row.output_tokens),
      });
    }
    const byFeature = Array.from(featureMap.entries())
      .map(([feature, stats]) => ({ feature, ...stats }))
      .sort((a, b) => b.cost - a.cost);

    return NextResponse.json({
      today:    todayCost,
      week:     weekCost,
      month:    monthCost,
      allTime:  allTimeCost,
      totalCalls: allTimeRes.data?.length ?? 0,
      last7Days,
      byFeature,
      alert:    todayCost > 5,
    });
  } catch (error) {
    console.error("[admin/costs error]", error);
    return NextResponse.json({ error: "Erro ao carregar dados." }, { status: 500 });
  }
}
