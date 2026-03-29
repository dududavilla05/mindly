"use client";

import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0f0a1e] relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="orb w-96 h-96 top-[-100px] left-[-150px] opacity-30"
          style={{ background: "radial-gradient(circle, #7c1fff 0%, transparent 70%)" }}
        />
        <div
          className="orb w-80 h-80 bottom-[-80px] right-[-100px] opacity-20"
          style={{ background: "radial-gradient(circle, #a66aff 0%, transparent 70%)" }}
        />
      </div>

      {/* AuthModal ocupa fixed inset-0 por conta própria */}
      <AuthModal
        onClose={() => router.push("/")}
        onSuccess={() => router.push("/home")}
      />
    </div>
  );
}
