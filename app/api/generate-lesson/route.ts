import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { GenerateLessonRequest } from "@/types/lesson";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `Você é o Mindly, um professor especialista em criar lições curtas, envolventes e práticas sobre qualquer assunto.

Seu objetivo é tornar o aprendizado fácil e imediato. Sempre responda em português brasileiro com linguagem clara, direta e inspiradora.

Cada lição deve ser radicalmente diferente em estrutura, exemplos e perspectiva.
Nunca use os mesmos exemplos ou analogias de lições anteriores.
Escolha sempre um ângulo único: histórico, científico, prático, psicológico, econômico, etc.
O highlight deve revelar algo que surpreende ou muda a forma de pensar do leitor.

Ao receber um assunto ou imagem, gere uma lição estruturada EXATAMENTE no seguinte formato JSON (sem markdown, apenas JSON puro):

{
  "title": "Título atraente da lição (máx 60 caracteres)",
  "category": "Categoria curta (ex: Finanças, Tecnologia, Negócios, Ciência, Produtividade)",
  "emoji": "Um emoji representativo do tema",
  "introduction": "Parágrafo de introdução de 2-3 frases que contextualiza o tema de forma envolvente e mostra por que isso é importante",
  "highlight": {
    "label": "Escolha o label mais adequado para esta lição específica",
    "text": "A ideia ou dado mais importante e memorável sobre o tema, em 1-2 frases impactantes"
  },
  "practicalExample": {
    "title": "Título do exemplo prático",
    "content": "Um exemplo real e concreto que qualquer pessoa possa entender e se identificar, com números ou situações do cotidiano brasileiro"
  },
  "howToApplyToday": [
    "Ação prática 1 — 100% específica para o assunto desta lição, nunca genérica",
    "Ação prática 2 — 100% específica para o assunto desta lição, nunca genérica",
    "Ação prática 3 — 100% específica para o assunto desta lição, com resultado esperado claro"
  ],
  "curiosity": "Um fato curioso ou surpreendente relacionado ao tema que vai fazer o usuário querer aprender mais"
}

Regras:
- Seja sempre específico, use exemplos reais e números concretos
- Adapte o nível ao contexto brasileiro
- Evite jargões desnecessários
- Cada ação em howToApplyToday deve ser ultra-específica e realizável hoje
- O highlight deve ser a ideia mais poderosa da lição`;

const FREE_PLAN_LIMIT = 10;

export async function POST(request: NextRequest) {
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

    if (user && supabase) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, lessons_today, last_lesson_date, streak_days")
        .eq("id", user.id)
        .single();

      if (profile) {
        const today = new Date().toISOString().split("T")[0];
        const originalLastLessonDate = profile.last_lesson_date?.slice(0, 10) ?? "";

        // Resetar contador se mudou o dia
        if (originalLastLessonDate !== today) {
          const admin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          await admin
            .from("profiles")
            .update({ lessons_today: 0, last_lesson_date: today })
            .eq("id", user.id);
          userProfile = { ...profile, lessons_today: 0, last_lesson_date: originalLastLessonDate, streak_days: profile.streak_days ?? 0  };
        } else {
          userProfile = { ...profile, streak_days: profile.streak_days ?? 0 };
        }

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

    // Salvar histórico — depende apenas de user existir, não de profile
    if (user && supabase) {
      await supabase.from("lesson_history").insert({
        user_id: user.id,
        subject: subject?.trim() || "Imagem enviada",
        lesson_data: lessonData,
      });
    }

    // Atualizar contador de lições diárias e streak (requer profile)
    if (user && userProfile && supabase) {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];

      console.log('[STREAK DEBUG] originalLastLessonDate:', userProfile.last_lesson_date);
      console.log('[STREAK DEBUG] today:', today);
      console.log('[STREAK DEBUG] yesterday:', yesterday);
      console.log('[STREAK DEBUG] streak_days atual:', userProfile.streak_days);

      const lastDate = userProfile.last_lesson_date?.slice(0, 10) ?? "";
      let newStreak: number;
      if (lastDate === today) {
        // Já estudou hoje — mantém streak
        newStreak = userProfile.streak_days;
      } else if (lastDate === yesterday) {
        // Estudou ontem — incrementa streak
        newStreak = userProfile.streak_days + 1;
      } else {
        // Pulou um dia ou é o primeiro — começa do 1
        newStreak = 1;
      }

      console.log('[STREAK DEBUG] newStreak calculado:', newStreak);
      console.log('[STREAK DEBUG] SERVICE_ROLE_KEY set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      console.log('[STREAK DEBUG] user.id:', user.id);

      const admin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { error: updateError, status: updateStatus } = await admin
        .from("profiles")
        .update({
          lessons_today: (userProfile.lessons_today || 0) + 1,
          last_lesson_date: today,
          streak_days: newStreak,
        })
        .eq("id", user.id);

      console.log('[STREAK DEBUG] UPDATE error:', updateError, 'status:', updateStatus);
    }

    return NextResponse.json({
      lesson: lessonData,
      lessonsToday: userProfile ? userProfile.lessons_today + 1 : null,
      plan: userProfile?.plan ?? null,
    });
  } catch (error) {
    console.error("Error generating lesson:", error);

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
