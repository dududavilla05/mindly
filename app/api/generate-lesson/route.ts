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

const JOURNEY_SYSTEM_PROMPT = `Você é o Mindly, especialista em criar materiais de estudo profundos e didáticos. Responda em português brasileiro. Retorne APENAS JSON puro, sem markdown, sem blocos de código.

Você vai criar uma AULA COMPLETA de 30 a 45 minutos de leitura e prática real. O conteúdo deve ser denso, detalhado e de altíssima qualidade educacional.

Formato JSON obrigatório (todos os campos são obrigatórios):
{
  "title": "Título claro da aula (máx 70 chars)",
  "category": "Área do conhecimento",
  "emoji": "emoji representativo",
  "introduction": "3 a 4 parágrafos separados por \\n\\n. Apresente o tema, contextualize com a jornada, explique por que este conceito é importante e o que o aluno vai dominar ao final desta aula.",
  "highlight": {
    "label": "Conceito-chave",
    "text": "A ideia mais importante desta aula em 2 frases impactantes e memoráveis."
  },
  "practicalExample": {
    "title": "Exemplo Prático Detalhado",
    "content": "Um cenário real completo com personagem, situação, números, decisões e resultado. Mínimo 150 palavras. Use contexto brasileiro quando possível."
  },
  "howToApplyToday": [
    "Exercício prático 1: descrição detalhada de como executar — mínimo 2 frases",
    "Exercício prático 2: descrição detalhada de como executar — mínimo 2 frases",
    "Exercício prático 3: descrição detalhada de como executar — mínimo 2 frases",
    "Exercício prático 4: descrição detalhada de como executar — mínimo 2 frases"
  ],
  "curiosity": "Fato surpreendente, dado estatístico ou história pouco conhecida relacionada ao tema.",
  "sections": [
    {
      "title": "Fundamentos Essenciais",
      "content": "Explicação profunda dos conceitos base. Mínimo 200 palavras. Inclua definições precisas, por que existem, como funcionam internamente, e as ideias equivocadas mais comuns que as pessoas têm sobre este tema."
    },
    {
      "title": "Como Funciona na Prática",
      "content": "Explicação detalhada do funcionamento com analogias do dia a dia, passo a passo do processo, variações e casos especiais. Mínimo 200 palavras."
    },
    {
      "title": "Erros Comuns e Como Evitar",
      "content": "Os 3 a 5 erros mais frequentes que iniciantes cometem neste tema, explicando por que acontecem e como evitar cada um. Use exemplos concretos. Mínimo 150 palavras."
    },
    {
      "title": "Aplicação Avançada",
      "content": "Técnicas, estratégias ou perspectivas que separam iniciantes de pessoas experientes neste tema. O que os especialistas fazem diferente. Mínimo 150 palavras."
    }
  ],
  "keyPoints": [
    "Ponto 1: resumo completo em 1-2 frases",
    "Ponto 2: resumo completo em 1-2 frases",
    "Ponto 3: resumo completo em 1-2 frases",
    "Ponto 4: resumo completo em 1-2 frases",
    "Ponto 5: resumo completo em 1-2 frases"
  ],
  "nextSteps": [
    "O que praticar ainda hoje para consolidar o aprendizado",
    "O que pesquisar ou explorar para ir além desta aula",
    "Como este conhecimento se conecta com o próximo dia da jornada"
  ],
  "isJourneyLesson": true
}

Regras absolutas:
- NUNCA use asteriscos, hashes, underlines ou qualquer marcação markdown dentro das strings
- Use ponto e vírgula, dois-pontos e parênteses normalmente para estruturar texto corrido
- Todo conteúdo em português brasileiro claro e profissional
- Exemplos reais com nomes, números e contexto brasileiro quando relevante
- O conteúdo total deve ser suficiente para 30-45 minutos de estudo real`;

// Attempt to repair truncated JSON by closing open brackets/strings
function repairJson(raw: string): unknown | null {
  // First, try as-is
  try { return JSON.parse(raw); } catch {}

  let s = raw.trim();
  // Strip trailing comma(s) before closing
  s = s.replace(/,\s*$/, "");

  // Walk the string tracking brackets and string state
  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      if (stack.length && stack[stack.length - 1] === ch) stack.pop();
    }
  }

  // If we ended mid-string, close it
  if (inString) s += '"';
  // Close any remaining open brackets
  s += stack.reverse().join("");

  try { return JSON.parse(s); } catch { return null; }
}

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
    const { subject, imageBase64, imageMimeType, journeyMode, journeyContext } = body;

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

    if (journeyMode && journeyContext) {
      const { day, totalDays, journeyTitle, journeyObjective } = journeyContext;
      userContent.push({
        type: "text",
        text: `Jornada: "${journeyTitle}"${journeyObjective ? ` — Objetivo: ${journeyObjective}` : ""}
Dia ${day} de ${totalDays}: ${subject}

Crie uma aula completa e aprofundada sobre "${subject}" para o Dia ${day} desta jornada de ${totalDays} dias.
${day > 1 ? `O aluno já completou ${day - 1} dia(s) de estudo nesta jornada, então pode referenciar conceitos progressivos.` : "Este é o primeiro dia, então comece pelos fundamentos essenciais."}
${day === totalDays ? "Este é o último dia da jornada — conclua com uma visão completa do que foi aprendido e próximos passos além da jornada." : ""}

Gere o JSON completo conforme o formato especificado, com conteúdo suficiente para 30-45 minutos de estudo real.`,
      });
    } else if (imageBase64 && imageMimeType) {
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

    const isJourney = !!(journeyMode && journeyContext);
    console.log(`[generate-lesson] mode=${isJourney ? "journey" : "normal"} subject="${subject}" maxTokens=${isJourney ? 4000 : 1500}`);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: isJourney ? 8000 : 1500,
      temperature: isJourney ? 0.8 : 1.0,
      system: isJourney ? JOURNEY_SYSTEM_PROMPT : SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      console.error("[generate-lesson] No text content in response. stop_reason:", response.stop_reason);
      throw new Error("Resposta inválida da IA");
    }

    const rawText = textContent.text.trim();
    console.log(`[generate-lesson] stop_reason=${response.stop_reason} chars=${rawText.length} first300=${rawText.substring(0, 300)}`);

    let lessonData;
    // Strip markdown code fences if present (e.g. ```json ... ```)
    let jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error("[generate-lesson] JSON block not found. raw(800):", rawText.substring(0, 800));
      throw new Error("JSON não encontrado na resposta da IA");
    }

    const candidate = jsonMatch[0];
    lessonData = repairJson(candidate);

    if (!lessonData) {
      console.error("[generate-lesson] JSON repair failed. candidate(800):", candidate.substring(0, 800));
      throw new Error("Não foi possível processar a resposta da IA. Tente novamente.");
    }

    console.log("[generate-lesson] parsed OK, title:", (lessonData as Record<string, unknown>)?.title);

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

      // Incrementa ranking semanal
      const weekStart = new Date(brasiliaTime);
      weekStart.setDate(brasiliaTime.getDate() - brasiliaTime.getDay()); // domingo da semana
      const weekStartStr = weekStart.toISOString().split("T")[0];

      const { data: rankingRow } = await adminSupabase
        .from("weekly_ranking")
        .select("id, lessons_count")
        .eq("user_id", user.id)
        .eq("week_start", weekStartStr)
        .single();

      if (rankingRow) {
        await adminSupabase
          .from("weekly_ranking")
          .update({ lessons_count: rankingRow.lessons_count + 1 })
          .eq("id", rankingRow.id);
      } else {
        const { error: rankingError } = await adminSupabase
          .from("weekly_ranking")
          .insert({ user_id: user.id, email: user.email ?? "", lessons_count: 1, week_start: weekStartStr });
        if (rankingError) console.error("[ranking insert error]", rankingError);
      }
    }

    return NextResponse.json({
      lesson: lessonData,
      plan: userProfile?.plan ?? null,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[generate-lesson] caught error:", errMsg, error);

    if (error instanceof Anthropic.APIConnectionTimeoutError || errMsg.toLowerCase().includes("timeout")) {
      return NextResponse.json(
        { error: "A requisição demorou demais. Tente novamente." },
        { status: 504 }
      );
    }

    if (error instanceof Anthropic.APIError) {
      console.error("[generate-lesson] Anthropic API error status:", error.status, "message:", error.message);
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
        { error: `Erro ao chamar a IA: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: `Erro ao gerar a lição: ${errMsg}` },
      { status: 500 }
    );
  }
}
