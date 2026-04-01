"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("mindly_splash")) {
      setDone(true);
      return;
    }
    setVisible(true);

    const t1 = setTimeout(() => setFadingOut(true), 4000);
    const t2 = setTimeout(() => {
      sessionStorage.setItem("mindly_splash", "1");
      setDone(true);
    }, 4600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (done || !visible) return null;

  return (
    <>
      <style>{`
        .sp-root {
          position: fixed;
          inset: 0;
          z-index: 99999;
          width: 100vw;
          height: 100vh;
          height: -webkit-fill-available;
          background: #0d0015;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          overflow: hidden;
          transition: opacity 600ms ease;
        }

        @keyframes sp-logo {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes sp-title {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes sp-glow {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes sp-sub {
          from { transform: translateX(-40px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }

        .sp-logo {
          width: 280px;
          height: 280px;
          object-fit: contain;
          opacity: 0;
          animation: sp-logo 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0s forwards;
        }

        .sp-title-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sp-glow {
          position: absolute;
          width: 320px;
          height: 120px;
          background: radial-gradient(ellipse at center, #7c3aed55 0%, transparent 70%);
          opacity: 0;
          animation: sp-glow 0.8s ease 0.8s forwards;
          pointer-events: none;
        }

        .sp-title {
          position: relative;
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-weight: 900;
          font-size: 72px;
          color: #ffffff;
          line-height: 1;
          letter-spacing: -0.01em;
          text-shadow: 0 0 40px #7c3aed, 0 0 80px #7c3aed88;
          opacity: 0;
          animation: sp-title 0.8s ease 0.8s forwards;
        }

        .sp-sub {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 18px;
          color: #c4b5fd;
          letter-spacing: 2px;
          opacity: 0;
          animation: sp-sub 0.7s ease 1.6s forwards;
        }

        @media (max-width: 480px) {
          .sp-logo  { width: 200px; height: 200px; }
          .sp-title { font-size: 52px; }
          .sp-sub   { font-size: 15px; letter-spacing: 1.5px; text-align: center; padding: 0 24px; }
          .sp-glow  { width: 240px; height: 90px; }
        }
      `}</style>

      <div
        className="sp-root"
        style={{ opacity: fadingOut ? 0 : 1 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/logo-final.png"
          alt="Mindly"
          className="sp-logo"
        />

        <div className="sp-title-wrap">
          <div className="sp-glow" />
          <span className="sp-title">Mindly</span>
        </div>

        <p className="sp-sub">O melhor app de aprendizagem</p>
      </div>
    </>
  );
}
