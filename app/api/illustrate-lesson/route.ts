import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const PLAN_LIMITS: Record<string, number | null> = {
  gratis: 3,
  pro: 10,
  max: null, // ilimitado
};

function getTodayBrasilia(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

interface PexelsPhoto {
  id: number;
  src: { large: string; large2x: string };
  alt: string;
  photographer: string;
  photographer_url: string;
  avg_color: string;
}

async function generateSearchQueries(
  lessonTitle: string,
  lessonCategory: string,
  subject: string
): Promise<string[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 120,
    messages: [
      {
        role: "user",
        content: `Generate exactly 3 short English image search queries for a lesson about: "${lessonTitle}" (category: ${lessonCategory}${subject && subject !== "Imagem enviada" ? `, topic: ${subject}` : ""}).

Rules:
- Each query must be 2-4 words in English
- Queries should be visually distinct from each other (different angles on the topic)
- Focus on concrete, photogenic concepts — avoid abstract words
- Prefer professional/editorial photography terms

Respond with ONLY a JSON array of 3 strings, nothing else. Example: ["stock market trading", "financial charts analysis", "wall street business"]`,
      },
    ],
  });

  const text = response.content.find((c) => c.type === "text")?.text ?? "";
  const match = text.match(/\[.*\]/s);
  if (!match) return [lessonTitle];

  const queries: unknown = JSON.parse(match[0]);
  if (!Array.isArray(queries)) return [lessonTitle];
  return (queries as string[]).slice(0, 3).filter((q) => typeof q === "string" && q.trim());
}

async function fetchBestPhoto(query: string, pexelsKey: string): Promise<PexelsPhoto | null> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&size=large`;
  const res = await fetch(url, { headers: { Authorization: pexelsKey } });
  if (!res.ok) return null;

  const data = await res.json();
  const photos = (data.photos ?? []) as PexelsPhoto[];
  if (photos.length === 0) return null;

  // Prefere fotos coloridas (avg_color não é cinza puro) — pega a primeira que tiver
  const colorful = photos.find((p) => {
    const hex = (p.avg_color ?? "").replace("#", "");
    if (hex.length !== 6) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max - min > 30; // tem variação de cor suficiente
  });

  return colorful ?? photos[0];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("plan, images_today, last_image_date")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
    }

    const today = getTodayBrasilia();
    const usedToday =
      profile.last_image_date === today ? (profile.images_today ?? 0) : 0;
    const limit = PLAN_LIMITS[profile.plan as string] ?? 3;

    if (limit !== null && usedToday >= limit) {
      return NextResponse.json(
        { error: "limite_atingido", limit, used: usedToday, plan: profile.plan },
        { status: 429 }
      );
    }

    const { lessonTitle, lessonCategory, subject } = await request.json();
    if (!lessonTitle) {
      return NextResponse.json(
        { error: "Título da lição é obrigatório." },
        { status: 400 }
      );
    }

    const pexelsKey = process.env.PEXELS_API_KEY;
    if (!pexelsKey) {
      return NextResponse.json(
        { error: "Serviço de imagens não configurado. Adicione PEXELS_API_KEY no .env.local." },
        { status: 503 }
      );
    }

    // Gera 3 queries específicas via Claude Haiku
    const queries = await generateSearchQueries(lessonTitle, lessonCategory ?? "", subject ?? "");

    // Busca em paralelo — uma foto por query
    const photoResults = await Promise.all(
      queries.map((q) => fetchBestPhoto(q, pexelsKey))
    );

    // Remove nulos e deduplica por ID
    const seenIds = new Set<number>();
    const unique = photoResults.filter((p): p is PexelsPhoto => {
      if (!p || seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    });

    if (unique.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma imagem encontrada para este tema." },
        { status: 404 }
      );
    }

    const images = unique.map((photo) => ({
      url: photo.src.large,
      alt: photo.alt || lessonTitle,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
    }));

    // Atualiza contador de uso
    await adminSupabase
      .from("profiles")
      .update({ images_today: usedToday + 1, last_image_date: today })
      .eq("id", user.id);

    return NextResponse.json({
      images,
      queries, // útil para debug
      remaining: limit === null ? null : limit - usedToday - 1,
    });
  } catch (err) {
    console.error("[illustrate-lesson error]", err);
    return NextResponse.json({ error: "Erro ao ilustrar lição." }, { status: 500 });
  }
}
