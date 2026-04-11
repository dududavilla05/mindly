import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAuthUser(request: NextRequest) {
  const auth = request.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(token);
    return user ?? null;
  } catch {
    return null;
  }
}

const CHALLENGE_LIMITS: Record<string, number> = { gratis: 5, pro: 15 };

const DIFFICULTY_COUNT: Record<string, number> = {
  "Fácil":   5,
  "Médio":   10,
  "Difícil": 15,
};

const DIFFICULTY_DESCRIPTION: Record<string, string> = {
  "Fácil":   "conceitos básicos, definições e reconhecimento",
  "Médio":   "aplicação, compreensão intermediária e exemplos",
  "Difícil": "análise, síntese, casos complexos e raciocínio crítico",
};

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { topic, difficulty }: { topic: string; difficulty: string } = await request.json();

    if (!topic?.trim()) {
      return NextResponse.json({ error: "Tema obrigatório." }, { status: 400 });
    }
    if (!DIFFICULTY_COUNT[difficulty]) {
      return NextResponse.json({ error: "Dificuldade inválida." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verificar limite diário de desafios
    const { data: profile } = await admin
      .from("profiles")
      .select("plan, challenges_today, last_challenge_date")
      .eq("id", user.id)
      .single();

    const plan = profile?.plan ?? "gratis";
    const today = new Date().toISOString().slice(0, 10);
    const lastDate = profile?.last_challenge_date ?? null;
    const challengesToday = lastDate === today ? (profile?.challenges_today ?? 0) : 0;

    if (plan !== "max") {
      const limit = CHALLENGE_LIMITS[plan] ?? 5;
      if (challengesToday >= limit) {
        return NextResponse.json(
          { error: `Limite de ${limit} desafios por dia atingido. Faça upgrade para continuar.` },
          { status: 429 }
        );
      }
    }

    // Verificar cache (busca case-insensitive por topic)
    const { data: cached } = await admin
      .from("challenge_cache")
      .select("questions")
      .eq("difficulty", difficulty)
      .ilike("topic", topic.trim())
      .maybeSingle();

    if (cached?.questions) {
      // Incrementar contador mesmo em cache hit
      await admin.from("profiles").update({
        challenges_today: challengesToday + 1,
        last_challenge_date: today,
      }).eq("id", user.id);
      return NextResponse.json({ questions: cached.questions });
    }

    // Cache miss — gerar com Anthropic
    const count = DIFFICULTY_COUNT[difficulty];
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

    const prompt = `Você é um professor especialista. Gere exatamente ${count} questões de múltipla escolha sobre "${topic.trim()}" com dificuldade ${difficulty} (${DIFFICULTY_DESCRIPTION[difficulty]}).

Retorne APENAS JSON puro (sem markdown, sem blocos de código, sem texto extra):
{
  "questions": [
    {
      "question": "texto da pergunta",
      "options": ["A) opção1", "B) opção2", "C) opção3", "D) opção4"],
      "correct": "A",
      "explanation": "explicação curta e didática da resposta correta (1-2 frases em português)"
    }
  ]
}

Regras obrigatórias:
- Exatamente ${count} questões no array
- Cada questão com exatamente 4 opções no formato "A) texto", "B) texto", "C) texto", "D) texto"
- Campo "correct" contém APENAS a letra maiúscula da resposta (A, B, C ou D)
- Todas as perguntas, opções e explicações em português
- Distribua as respostas corretas entre A, B, C e D (não concentre em apenas uma letra)`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: count >= 15 ? 3000 : count >= 10 ? 2000 : 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content.find(c => c.type === "text");
    if (!text || text.type !== "text") throw new Error("Resposta inválida da IA");

    const jsonMatch = text.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON não encontrado na resposta");

    const data = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error("Formato de questões inválido");
    }

    // Salvar no cache
    await admin
      .from("challenge_cache")
      .insert({ topic: topic.trim(), difficulty, questions: data.questions });

    // Incrementar contador de desafios do usuário
    await admin.from("profiles").update({
      challenges_today: challengesToday + 1,
      last_challenge_date: today,
    }).eq("id", user.id);

    return NextResponse.json({ questions: data.questions });
  } catch (error) {
    console.error("[challenge error]", error);
    if (error instanceof Anthropic.APIConnectionTimeoutError) {
      return NextResponse.json({ error: "Tempo esgotado. Tente novamente." }, { status: 504 });
    }
    return NextResponse.json({ error: "Erro ao gerar questões. Tente novamente." }, { status: 500 });
  }
}
