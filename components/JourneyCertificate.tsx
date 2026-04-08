"use client";

import React, { useRef, useState, useEffect } from "react";

interface CertProps {
  userName: string;
  journeyTitle: string;
  durationDays: number;
}

/**
 * Off-screen certificate component rendered via html2canvas.
 * Positioned at -9999px so it never shows in the UI, but remains in the DOM
 * so html2canvas can capture it. The `onclone` callback in html2canvas moves
 * it to (0,0) in the cloned document before rendering.
 *
 * The logo is pre-fetched and stored as a base64 data URL so html2canvas
 * can render it correctly — relative paths are not resolved in the cloned doc.
 */
const JourneyCertificate = React.forwardRef<HTMLDivElement, CertProps>(
  ({ userName, journeyTitle, durationDays }, ref) => {
    const certNumber = useRef(
      `#CERT-${new Date().getFullYear()}-${Math.random()
        .toString(36)
        .toUpperCase()
        .slice(2, 8)}`
    );
    const issuedDate = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date());

    // Load logo as base64 so html2canvas can render it in the cloned document
    const [logoSrc, setLogoSrc] = useState<string>("/icons/logo-final.png");
    useEffect(() => {
      fetch("/icons/logo-final.png")
        .then((r) => r.blob())
        .then(
          (blob) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            })
        )
        .then((b64) => setLogoSrc(b64))
        .catch(() => {
          // keep relative path as fallback
        });
    }, []);

    return (
      /* Invisible wrapper — keeps the element rendered but off-screen */
      <div
        style={{
          position: "absolute",
          top: "-9999px",
          left: "-9999px",
          width: "1200px",
          height: "848px",
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        {/* ── Certificate canvas ─────────────────────────────────────── */}
        <div
          ref={ref}
          style={{
            width: "1200px",
            height: "848px",
            background: "#0a0818",
            border: "2px solid #6B4FBB",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
            padding: "40px 120px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background radial glow */}
          <div
            style={{
              position: "absolute",
              top: "-80px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "700px",
              height: "500px",
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(107,79,187,0.22) 0%, transparent 65%)",
              pointerEvents: "none",
            }}
          />

          {/* Corner L-ornaments */}
          {(
            [
              { top: "18px",    left: "18px",  borderTop: "1.5px solid rgba(107,79,187,0.55)", borderLeft: "1.5px solid rgba(107,79,187,0.55)" },
              { top: "18px",    right: "18px", borderTop: "1.5px solid rgba(107,79,187,0.55)", borderRight: "1.5px solid rgba(107,79,187,0.55)" },
              { bottom: "18px", left: "18px",  borderBottom: "1.5px solid rgba(107,79,187,0.55)", borderLeft: "1.5px solid rgba(107,79,187,0.55)" },
              { bottom: "18px", right: "18px", borderBottom: "1.5px solid rgba(107,79,187,0.55)", borderRight: "1.5px solid rgba(107,79,187,0.55)" },
            ] as React.CSSProperties[]
          ).map((style, i) => (
            <div
              key={i}
              style={{ position: "absolute", width: "28px", height: "28px", ...style }}
            />
          ))}

          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            width={80}
            height={80}
            alt="Mindly"
            style={{ display: "block", margin: "0 auto 16px" }}
          />

          {/* Title — two-tone blue → purple (html2canvas-safe) */}
          <div style={{ margin: "0 0 16px", textAlign: "center", lineHeight: 1 }}>
            <span
              style={{
                fontSize: "52px",
                fontWeight: "800",
                color: "#60a5fa",
                letterSpacing: "-0.5px",
              }}
            >
              Certificado{" "}
            </span>
            <span
              style={{
                fontSize: "52px",
                fontWeight: "800",
                color: "#a78bfa",
                letterSpacing: "-0.5px",
              }}
            >
              de Conclusão
            </span>
          </div>

          {/* "confirma que" */}
          <p
            style={{
              fontSize: "17px",
              color: "rgba(255,255,255,0.65)",
              fontWeight: 400,
              margin: "0 0 12px",
            }}
          >
            Este certificado confirma que
          </p>

          {/* User name — serif italic */}
          <p
            style={{
              fontSize: "46px",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              color: "#f0e6ff",
              fontWeight: 400,
              margin: "0 0 12px",
              letterSpacing: "0.3px",
              textAlign: "center",
            }}
          >
            {userName}
          </p>

          {/* "concluiu com êxito" */}
          <p
            style={{
              fontSize: "17px",
              color: "#a78bfa",
              fontStyle: "italic",
              fontWeight: 400,
              margin: "0 0 14px",
            }}
          >
            concluiu com êxito a Jornada de Aprendizado:
          </p>

          {/* Journey title */}
          <p
            style={{
              fontSize: "30px",
              fontWeight: 700,
              color: "#e2d9f5",
              margin: "0 0 14px",
              textAlign: "center",
              letterSpacing: "-0.2px",
              lineHeight: 1.25,
            }}
          >
            {journeyTitle}
          </p>

          {/* Duration — indigo/blue bold */}
          <p
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#818cf8",
              margin: "0 0 30px",
              letterSpacing: "0.2px",
            }}
          >
            {durationDays} dias · {durationDays} lições concluídas
          </p>

          {/* Thin divider */}
          <div
            style={{
              width: "200px",
              height: "1px",
              background: "rgba(107,79,187,0.45)",
              marginBottom: "22px",
            }}
          />

          {/* Issue date + cert number */}
          <p
            style={{
              fontSize: "13px",
              color: "#7c6d9a",
              fontWeight: 400,
              margin: "0 0 10px",
              textAlign: "center",
            }}
          >
            Emitido em {issuedDate} · {certNumber.current}
          </p>

          {/* Footer */}
          <p
            style={{
              fontSize: "12px",
              color: "#6B4FBB",
              fontWeight: 500,
              letterSpacing: "0.8px",
              margin: 0,
            }}
          >
            mindly.app
          </p>
        </div>
      </div>
    );
  }
);

JourneyCertificate.displayName = "JourneyCertificate";
export default JourneyCertificate;
