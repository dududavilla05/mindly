import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — Mindly",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#0f0a1e] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-[#a78bfa] text-sm hover:underline mb-8 inline-block">
          ← Voltar
        </Link>

        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-[#7a6a9a] text-sm mb-10">Última atualização: março de 2025</p>

        <div className="space-y-10 text-[#c4b5fd]/90 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Quem somos</h2>
            <p>
              O Mindly é uma plataforma de aprendizado com inteligência artificial. Ao usar o Mindly,
              você confia a nós seus dados — e levamos essa responsabilidade a sério.
              Esta política explica quais dados coletamos, como usamos e quais são seus direitos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Dados que coletamos</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">E-mail:</strong> usado para criar e acessar sua conta.</li>
              <li><strong className="text-white">Histórico de lições:</strong> os assuntos que você pesquisou e as lições geradas para você.</li>
              <li><strong className="text-white">Plano e pagamento:</strong> seu plano atual (grátis, Pro ou Max). Dados de cartão são processados pelo Stripe e nunca armazenados em nossos servidores.</li>
              <li><strong className="text-white">Dados de uso:</strong> número de lições geradas por dia, streak e data da última atividade — usados para personalização e controle de limites.</li>
              <li><strong className="text-white">Imagens enviadas:</strong> quando você envia uma foto para gerar uma lição, ela é transmitida diretamente para a API da Anthropic e não é armazenada permanentemente.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Como usamos seus dados</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Gerar lições personalizadas com base no assunto solicitado.</li>
              <li>Controlar limites de uso conforme seu plano.</li>
              <li>Manter seu histórico de aprendizado acessível.</li>
              <li>Processar pagamentos e gerenciar assinaturas.</li>
              <li>Melhorar o serviço com base em padrões de uso agregados e anônimos.</li>
            </ul>
            <p className="mt-3">Não usamos seus dados para publicidade nem os vendemos a terceiros.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Compartilhamento com terceiros</h2>
            <p className="mb-3">
              Para operar o Mindly, compartilhamos dados com os seguintes fornecedores de confiança:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-white">Supabase</strong> — banco de dados e autenticação.
                Armazena e-mail, perfil, histórico de lições e dados de uso.
                Política: <span className="text-[#a78bfa]">supabase.com/privacy</span>
              </li>
              <li>
                <strong className="text-white">Anthropic</strong> — modelo de inteligência artificial que gera as lições.
                Os assuntos e imagens enviados são processados pela API da Anthropic.
                Política: <span className="text-[#a78bfa]">anthropic.com/privacy</span>
              </li>
              <li>
                <strong className="text-white">Stripe</strong> — processamento de pagamentos.
                Recebe dados de cobrança para assinaturas Pro e Max.
                Política: <span className="text-[#a78bfa]">stripe.com/privacy</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Seus direitos (LGPD)</h2>
            <p className="mb-3">
              Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Acesso:</strong> solicitar uma cópia de todos os dados que temos sobre você.</li>
              <li><strong className="text-white">Correção:</strong> solicitar a correção de dados incorretos ou desatualizados.</li>
              <li><strong className="text-white">Exclusão:</strong> solicitar a exclusão completa da sua conta e de todos os seus dados.</li>
              <li><strong className="text-white">Portabilidade:</strong> receber seus dados em formato estruturado.</li>
              <li><strong className="text-white">Revogação do consentimento:</strong> você pode encerrar sua conta a qualquer momento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Retenção de dados</h2>
            <p>
              Seus dados são mantidos enquanto sua conta estiver ativa. Após a exclusão da conta,
              removemos seus dados pessoais em até 30 dias, exceto quando exigido por obrigação legal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Contato</h2>
            <p>
              Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato:
            </p>
            <p className="mt-2">
              <strong className="text-white">E-mail:</strong>{" "}
              <a href="mailto:suporte.mindly@gmail.com" className="text-[#a78bfa] hover:underline">
                suporte.mindly@gmail.com
              </a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex gap-6 text-sm text-[#7a6a9a]">
          <Link href="/termos" className="hover:text-[#a78bfa] transition-colors">Termos de Uso</Link>
          <Link href="/" className="hover:text-[#a78bfa] transition-colors">Voltar ao app</Link>
        </div>
      </div>
    </div>
  );
}
