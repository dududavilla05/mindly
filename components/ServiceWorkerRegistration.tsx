"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[Mindly SW] Registrado com sucesso:", reg.scope);
        })
        .catch((err) => {
          console.warn("[Mindly SW] Falha no registro:", err);
        });
    }
  }, []);

  return null;
}
