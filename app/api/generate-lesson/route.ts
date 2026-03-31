import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { GenerateLessonRequest } from "@/types/lesson";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Rate limiting: 20 req/hora por IP (in-memory — resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hora

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const SYSTEM_PROMPT = `Você é o Mindly. Responda sempre em português brasileiro. Retorne APENAS JSON puro, sem markdown.

Formato obrigatório:
{"title":"Título (máx 60 chars)","category":"Categoria curta","emoji":"emoji","introduction":"2-3 frases","highlight":{"label":"label","text":"1-2 frases impactantes"},"practicalExample":{"title":"título","content":"exemplo concreto com números e contexto brasileiro"},"howToApplyToday":["ação específica 1","ação específica 2","ação específica 3"],"curiosity":"fato surpreendente"}

Regras:
- Use exemplos reais, nomes e números concretos. Nunca seja genérico.
- Cada resposta deve ter um ângulo único (histórico, científico, econômico, etc).

PERGUNTAS DIRETAS — se o input contiver "qual", "como", "onde", "quando", "por que", "quem", "quanto", "me indica", "me recomenda", "vale a pena" ou similar:
- introduction: responda DIRETAMENTE com a melhor opção primeiro. Ex: "O melhor microfone para iniciantes é o HyperX QuadCast S (~R$700)."
- highlight: justifique por que essa é a melhor opção
- practicalExample: produto/serviço/lugar real com preço em reais quando relevante
- howToApplyToday: passos para agir agora ("Acesse X", "Compare A e B no Mercado Livre")
- NUNCA transforme uma pergunta direta em lição genérica sobre o tema`;

const FREE_PLAN_LIMIT = 10;

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Muitas requisições, tente novamente em breve." },
      { status: 429 }
    );
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set");
      return NextResponse.json(
        { error: "Serviço de IA não configurado. Contate o suporte." },
        { status: 503 }
      );
    }

    const client = new Anthropic({ apiKey });

    const body: GenerateLessonRequest = await request.json();
    const { subject, imageBase64, imageMimeType } = body;

    if (!subject && !imageBase64) {
      return NextResponse.json(
        { error: "Forneça um assunto ou uma imagem." },
        { status: 400 }
      );
    }

    // Verificar autenticação e limites
    let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
    try {
      supabase = await createClient();
    } catch {
      // Supabase not configured — skip auth/limits
    }

    const user = supabase ? (await supabase.auth.getUser()).data.user : null;
    let userProfile: { plan: string; lessons_today: number; last_lesson_date: string; streak_days: number } | null = null;

    // Admin client para leitura e escrita sem RLS
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (user) {
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("plan, lessons_today, last_lesson_date, streak_days")
        .eq("id", user.id)
        .single();

      if (profile) {
        const now = new Date();
        const brasiliaOffset = -3 * 60;
        const brasiliaTime = new Date(now.getTime() + (brasiliaOffset - now.getTimezoneOffset()) * 60000);
        const today = brasiliaTime.toISOString().split("T")[0];
        const lastDate = profile.last_lesson_date ? String(profile.last_lesson_date).slice(0, 10) : null;

        // Se mudou o dia, resetar contador; senão manter
        const lessonsToday = lastDate === today ? (profile.lessons_today ?? 0) : 0;
        userProfile = { ...profile, lessons_today: lessonsToday, streak_days: profile.streak_days ?? 0 };

        // Verificar limite do plano grátis
        if (userProfile.plan === "gratis" && userProfile.lessons_today >= FREE_PLAN_LIMIT) {
          return NextResponse.json(
            { error: "limite_atingido", lessonsToday: userProfile.lessons_today },
            { status: 429 }
          );
        }
      }
    }

    // Montar conteúdo para a IA
    type ContentBlockParam = Anthropic.Messages.ContentBlockParam;
    const userContent: ContentBlockParam[] = [];

    if (imageBase64 && imageMimeType) {
      const validMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
      type ImageMimeType = typeof validMimeTypes[number];
      const mimeType: ImageMimeType = validMimeTypes.includes(imageMimeType as ImageMimeType)
        ? (imageMimeType as ImageMimeType)
        : "image/jpeg";

      userContent.push({
        type: "image",
        source: { type: "base64", media_type: mimeType, data: imageBase64 },
      });
      userContent.push({
        type: "text",
        text: subject
          ? `Analise esta imagem e gere uma lição sobre: ${subject}`
          : "Analise esta imagem e gere uma lição sobre o que ela representa ou contém.",
      });
    } else {
      userContent.push({
        type: "text",
        text: `Crie uma lição ÚNICA e ESPECÍFICA sobre: ${subject}\nEsta lição deve ter uma perspectiva original e diferente de qualquer outra lição sobre este tema.\nEscolha um ângulo surpreendente, pouco conhecido ou contraintuitivo sobre o assunto.`,
      });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      temperature: 1.0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("Resposta inválida da IA");
    }

    let lessonData;
    try {
      const jsonText = textContent.text.trim();
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON não encontrado");
      lessonData = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error("Erro ao processar resposta da IA");
    }

    // Salvar histórico
    if (user) {
      await adminSupabase.from("lesson_history").insert({
        user_id: user.id,
        subject: subject?.trim() || "Imagem enviada",
        lesson_data: lessonData,
      });
    }

    // Atualizar contador de lições diárias e streak
    if (user && userProfile) {
      const now = new Date();
      const brasiliaOffset = -3 * 60;
      const brasiliaTime = new Date(now.getTime() + (brasiliaOffset - now.getTimezoneOffset()) * 60000);
      const today = brasiliaTime.toISOString().split("T")[0];
      const yesterday = new Date(brasiliaTime.getTime() - 86400000).toISOString().split("T")[0];
      const lastDate = userProfile.last_lesson_date ? String(userProfile.last_lesson_date).slice(0, 10) : null;

      let newStreak: number;
      if (lastDate === today) {
        newStreak = userProfile.streak_days;
      } else if (lastDate === yesterday) {
        newStreak = userProfile.streak_days + 1;
      } else {
        newStreak = 1;
      }

      const { error: updateError } = await adminSupabase
        .from("profiles")
        .update({
          lessons_today: (userProfile.lessons_today || 0) + 1,
          last_lesson_date: today,
          streak_days: newStreak,
        })
        .eq("id", user.id);

      if (updateError) console.error("[profile update error]", updateError);
    }

    return NextResponse.json({
      lesson: lessonData,
      plan: userProfile?.plan ?? null,
    });
  } catch (error) {
    console.error("Error generating lesson:", error);

    if (error instanceof Anthropic.APIConnectionTimeoutError || (error instanceof Error && error.message.toLowerCase().includes("timeout"))) {
      return NextResponse.json(
        { error: "A requisição demorou demais. Tente novamente." },
        { status: 504 }
      );
    }

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: "Chave da API não configurada corretamente. Contate o suporte." },
          { status: 500 }
        );
      }
      if (error.status === 529 || error.status === 503) {
        return NextResponse.json(
          { error: "Serviço temporariamente sobrecarregado. Tente novamente em instantes." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Erro ao chamar a IA. Tente novamente." },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "Ocorreu um erro ao gerar a lição. Tente novamente." },
      { status: 500 }
    );
  }
}
