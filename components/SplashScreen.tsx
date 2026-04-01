"use client";

import { useEffect, useRef, useState } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [done, setDone] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    if (fadingOut) return;
    setFadingOut(true);
    timerRef.current = setTimeout(() => {
      sessionStorage.setItem("mindly_splash", "1");
      setDone(true);
    }, 600);
  };

  useEffect(() => {
    if (sessionStorage.getItem("mindly_splash")) {
      setDone(true);
      return;
    }
    setVisible(true);

    // Fallback geral: fecha em 4s
    const fallback = setTimeout(dismiss, 4000);

    // Fallback de vídeo: se não carregar em 2s, mostra logo estática
    videoFallbackRef.current = setTimeout(() => {
      const v = videoRef.current;
      if (v && (v.readyState === 0 || v.networkState === 3)) {
        setVideoFailed(true);
      }
    }, 2000);

    return () => {
      clearTimeout(fallback);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (videoFallbackRef.current) clearTimeout(videoFallbackRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done || !visible) return null;

  return (
    <>
      <style>{`
        .splash-root {
          position: fixed;
          inset: 0;
          z-index: 99999;
          width: 100vw;
          height: 100vh;
          height: -webkit-fill-available;
          background: #0d0015;
          overflow: hidden;
          transition: opacity 600ms ease;
        }
        .splash-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }
        .splash-watermark-cover {
          position: absolute;
          top: 0;
          left: 0;
          width: 120px;
          height: 60px;
          background: #0d0015;
          z-index: 1;
        }
        .splash-fallback {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: #0d0015;
        }
      `}</style>

      <div
        className="splash-root"
        style={{
          opacity: fadingOut ? 0 : 1,
          pointerEvents: fadingOut ? "none" : "all",
        }}
      >
        {videoFailed ? (
          <div className="splash-fallback">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/logo-final.png"
              alt="Mindly"
              style={{ width: 160, height: 160, objectFit: "contain" }}
            />
            <span style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: 56,
              color: "#ffffff",
              letterSpacing: "-0.01em",
            }}>
              Mindly
            </span>
          </div>
        ) : (
          <video
            ref={videoRef}
            src="/VideoIntro.mp4"
            autoPlay
            muted
            playsInline
            loop
            width="100%"
            height="100%"
            onEnded={dismiss}
            onError={() => setVideoFailed(true)}
            className="splash-video"
            // Atributos extras para Android WebView e iOS
            {...{ "webkit-playsinline": "true", "x5-playsinline": "true" }}
          />
        )}

        {/* Cobre a marca d'água do CapCut */}
        <div className="splash-watermark-cover" />
      </div>
    </>
  );
}
