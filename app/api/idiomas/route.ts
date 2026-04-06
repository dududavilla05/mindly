import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

interface LanguageMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

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

    const { messages, userMessage, language, level }: {
      messages: LanguageMessage[];
      userMessage: string;
      language: string;
      level: string;
    } = await request.json();

    if (!userMessage?.trim()) {
      return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

    const systemPrompt = `Você é um professor de ${language} nativo e gentil. O aluno é de nível ${level}. Responda primariamente em ${language}, mas explique em português quando necessário para que o aluno entenda. Corrija erros do aluno de forma sutil e encorajadora, nunca de forma constrangedora. Sugira exercícios práticos e vocabulário contextualizado. Seja paciente e motivador. Adapte a complexidade do seu vocabulário e gramática ao nível ${level} do aluno.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
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
    console.error("[idiomas error]", error);
    if (error instanceof Anthropic.APIConnectionTimeoutError) {
      return NextResponse.json({ error: "A requisição demorou demais. Tente novamente." }, { status: 504 });
    }
    return NextResponse.json({ error: "Erro ao contatar o assistente. Tente novamente." }, { status: 500 });
  }
}
