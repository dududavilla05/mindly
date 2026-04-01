"use client";

import { useEffect, useRef, useState } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [done, setDone] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const fallback = setTimeout(dismiss, 4000);

    return () => {
      clearTimeout(fallback);
      if (timerRef.current) clearTimeout(timerRef.current);
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
          object-fit: cover;
          display: block;
        }
        .splash-watermark-cover {
          position: absolute;
          top: 0;
          left: 0;
          width: 120px;
          height: 50px;
          background: #0d0015;
          z-index: 1;
        }
      `}</style>

      <div
        className="splash-root"
        style={{
          opacity: fadingOut ? 0 : 1,
          pointerEvents: fadingOut ? "none" : "all",
        }}
      >
        <video
          ref={videoRef}
          src="/VideoIntro.mov"
          autoPlay
          muted
          playsInline
          onEnded={dismiss}
          className="splash-video"
        />

        {/* Cobre a marca d'água do CapCut */}
        <div className="splash-watermark-cover" />
      </div>
    </>
  );
}
