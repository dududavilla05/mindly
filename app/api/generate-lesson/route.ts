import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { GenerateLessonRequest } from "@/types/lesson";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Você é o Mindly, um professor especialista em criar lições curtas, envolventes e práticas sobre qualquer assunto.

Seu objetivo é tornar o aprendizado fácil e imediato. Sempre responda em português brasileiro com linguagem clara, direta e inspiradora.

Ao receber um assunto ou imagem, gere uma lição estruturada EXATAMENTE no seguinte formato JSON (sem markdown, apenas JSON puro):

{
  "title": "Título atraente da lição (máx 60 caracteres)",
  "category": "Categoria curta (ex: Finanças, Tecnologia, Negócios, Ciência, Produtividade)",
  "emoji": "Um emoji representativo do tema",
  "introduction": "Parágrafo de introdução de 2-3 frases que contextualiza o tema de forma envolvente e mostra por que isso é importante",
  "highlight": {
    "label": "Conceito-chave ou dado impressionante (ex: Regra do 72, Fato surpreendente)",
    "text": "A ideia ou dado mais importante e memorável sobre o tema, em 1-2 frases impactantes"
  },
  "practicalExample": {
    "title": "Título do exemplo prático",
    "content": "Um exemplo real e concreto que qualquer pessoa possa entender e se identificar, com números ou situações do cotidiano brasileiro"
  },
  "howToApplyToday": [
    "Ação prática 1 que pode ser feita hoje mesmo",
    "Ação prática 2 concreta e simples",
    "Ação prática 3 com resultado esperado claro"
  ],
  "curiosity": "Um fato curioso ou surpreendente relacionado ao tema que vai fazer o usuário querer aprender mais"
}

Regras:
- Seja sempre específico, use exemplos reais e números concretos
- Adapte o nível ao contexto brasileiro
- Evite jargões desnecessários
- Cada ação em howToApplyToday deve ser ultra-específica e realizável hoje
- O highlight deve ser a ideia mais poderosa da lição`;

export async function POST(request: NextRequest) {
  try {
    const body: GenerateLessonRequest = await request.json();
    const { subject, imageBase64, imageMimeType } = body;

    if (!subject && !imageBase64) {
      return NextResponse.json(
        { error: "Forneça um assunto ou uma imagem." },
        { status: 400 }
      );
    }

    type MessageParam = Anthropic.Messages.MessageParam;
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
        source: {
          type: "base64",
          media_type: mimeType,
          data: imageBase64,
        },
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
        text: `Gere uma lição sobre: ${subject}`,
      });
    }

    const messages: MessageParam[] = [
      {
        role: "user",
        content: userContent,
      },
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages,
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

    return NextResponse.json({ lesson: lessonData });
  } catch (error) {
    console.error("Error generating lesson:", error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Erro na API: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "Ocorreu um erro ao gerar a lição. Tente novamente." },
      { status: 500 }
    );
  }
}
