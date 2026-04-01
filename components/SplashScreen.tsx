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

    // Fallback: dismiss after 4 seconds regardless
    const fallback = setTimeout(dismiss, 4000);

    return () => {
      clearTimeout(fallback);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done || !visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#0d0015",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadingOut ? 0 : 1,
        transition: "opacity 600ms ease",
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
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
}
