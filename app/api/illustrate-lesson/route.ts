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
  src: { large: string; medium: string };
  alt: string;
  photographer: string;
  photographer_url: string;
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

    // Monta query de busca combinando título + categoria para mais relevância
    const searchQuery = [
      lessonTitle.split(" ").slice(0, 5).join(" "),
      lessonCategory,
      subject && subject !== "Imagem enviada" ? subject.split(" ").slice(0, 3).join(" ") : "",
    ]
      .filter(Boolean)
      .join(" ");

    const pexelsRes = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=3&orientation=landscape`,
      { headers: { Authorization: pexelsKey } }
    );

    if (!pexelsRes.ok) {
      return NextResponse.json(
        { error: "Erro ao buscar imagens. Tente novamente." },
        { status: 502 }
      );
    }

    const pexelsData = await pexelsRes.json();
    const photos = (pexelsData.photos ?? []) as PexelsPhoto[];

    if (photos.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma imagem encontrada para este tema." },
        { status: 404 }
      );
    }

    const images = photos.map((photo) => ({
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

    return NextResponse.json({ images, remaining: limit === null ? null : limit - usedToday - 1 });
  } catch (err) {
    console.error("[illustrate-lesson error]", err);
    return NextResponse.json({ error: "Erro ao ilustrar lição." }, { status: 500 });
  }
}
