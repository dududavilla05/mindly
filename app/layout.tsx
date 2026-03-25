import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mindly — Aprenda qualquer coisa com IA",
  description:
    "Plataforma de aprendizado com IA. Digite um assunto ou envie uma foto e receba uma lição personalizada em segundos.",
  keywords: ["aprendizado", "IA", "lição", "educação", "inteligência artificial"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0f0a1e] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
