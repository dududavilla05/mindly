import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: profile } = await adminSupabase
      .from("profiles").select("plan").eq("id", user.id).single();
    if (profile?.plan !== "max") {
      return NextResponse.json({ error: "Disponível apenas no plano Max." }, { status: 403 });
    }

    const { objective, duration_days } = await request.json();
    if (!objective?.trim()) return NextResponse.json({ error: "Objetivo obrigatório." }, { status: 400 });
    const days = [7, 15, 30].includes(Number(duration_days)) ? Number(duration_days) : 7;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

    const prompt = `Crie um plano de estudos completo e progressivo em português brasileiro sobre: "${objective.trim()}"
Duração: ${days} dias, uma lição por dia.

Retorne APENAS JSON puro (sem markdown, sem texto extra):
{
  "title": "Título atrativo e motivador para esta jornada de aprendizado (máx 60 chars)",
  "lessons": [
    {
      "day": 1,
      "title": "Título da lição (3-8 palavras, sem 'Dia N:')",
      "description": "O que será aprendido neste dia (1-2 frases motivadoras e específicas)",
      "estimated_minutes": 15,
      "topics": ["Tópico principal 1", "Tópico principal 2", "Tópico principal 3"],
      "difficulty": "Iniciante"
    }
  ]
}

Regras:
- Exatamente ${days} lições, numeradas de 1 a ${days}
- Progressão lógica: fundamentos → intermediário → avançado
- Títulos objetivos (3-8 palavras, sem "Dia N:" no título)
- Descrições motivadoras e específicas (máximo 2 frases)
- estimated_minutes: tempo realista de estudo (10 a 30 minutos, número inteiro)
- topics: exatamente 3 tópicos/subtemas que serão abordados naquele dia (strings curtas, máx 40 chars cada)
- difficulty: uma das três opções exatas — "Iniciante" para os primeiros dias, "Intermediário" para a parte do meio, "Avançado" para os últimos dias
- Em português brasileiro`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 6000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content.find(c => c.type === "text");
    if (!text || text.type !== "text") throw new Error("Resposta inválida");

    const jsonMatch = text.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON não encontrado");

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      title: data.title ?? objective,
      objective: objective.trim(),
      duration_days: days,
      lessons: Array.isArray(data.lessons) ? data.lessons : [],
    });
  } catch (error) {
    console.error("[journey error]", error);
    return NextResponse.json({ error: "Erro ao gerar jornada." }, { status: 500 });
  }
}
