import Image from "next/image";

export default function MindlyLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { icon: 28, text: "text-xl" },
    md: { icon: 40, text: "text-3xl" },
    lg: { icon: 52, text: "text-4xl" },
  };

  const { icon, text } = sizes[size];

  return (
    <div className="flex items-center gap-3">
      <Image
        src="/icons/logo-final.png"
        alt="Mindly"
        width={icon}
        height={icon}
        style={{ width: icon, height: icon, borderRadius: Math.round(icon * 0.22), objectFit: "contain" }}
        priority
      />
      <span
        className={`font-black tracking-tight ${text}`}
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #c39dff 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        Mindly
      </span>
    </div>
  );
}
