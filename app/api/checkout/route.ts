import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export async function POST(request: NextRequest) {
  try {
    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json({ error: "priceId é obrigatório." }, { status: 400 });
    }

    // Pega o usuário autenticado para passar ao Stripe via client_reference_id
    let userId: string | undefined;
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id;
    } catch {
      // Supabase não configurado — continua sem userId
    }

    const origin = request.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/planos?sucesso=true`,
      cancel_url: `${origin}/planos?cancelado=true`,
      locale: "pt-BR",
      payment_method_types: ["card"],
      ...(userId && {
        client_reference_id: userId,
        metadata: { userId },
      }),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Erro ao criar sessão de pagamento." },
      { status: 500 }
    );
  }
}
