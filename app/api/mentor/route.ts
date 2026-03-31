import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { LessonContent } from "@/types/lesson";

interface MentorMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    // Autenticação
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    // Verifica plano Max
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    if (profile?.plan !== "max") {
      return NextResponse.json({ error: "Disponível apenas no plano Max." }, { status: 403 });
    }

    const { lesson, messages, userMessage }: {
      lesson: LessonContent;
      messages: MentorMessage[];
      userMessage: string;
    } = await request.json();

    if (!userMessage?.trim()) {
      return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
    }

    const lessonSummary = `
Título: ${lesson.title}
Categoria: ${lesson.category}
Introdução: ${lesson.introduction}
Destaque: ${lesson.highlight.text}
Exemplo prático: ${lesson.practicalExample.content}
Como aplicar: ${lesson.howToApplyToday.join(" | ")}
${lesson.curiosity ? `Curiosidade: ${lesson.curiosity}` : ""}
    `.trim();

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: `Você é o Mentor do Mindly, um professor especialista e paciente. O usuário acabou de aprender sobre este tema:\n\n${lessonSummary}\n\nResponda as dúvidas de forma clara, didática e encorajadora. Use exemplos práticos do cotidiano brasileiro. Seja conciso — respostas curtas e diretas são mais eficazes.`,
      messages: [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("Resposta inválida da IA");
    }

    return NextResponse.json({ reply: textContent.text });
  } catch (error) {
    console.error("[mentor error]", error);
    if (error instanceof Anthropic.APIConnectionTimeoutError) {
      return NextResponse.json({ error: "A requisição demorou demais. Tente novamente." }, { status: 504 });
    }
    return NextResponse.json({ error: "Erro ao contatar o Mentor. Tente novamente." }, { status: 500 });
  }
}
