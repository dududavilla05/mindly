export default function MindlyLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { icon: 28, text: "text-xl" },
    md: { icon: 40, text: "text-3xl" },
    lg: { icon: 52, text: "text-4xl" },
  };

  const { icon, text } = sizes[size];

  return (
    <div className="flex items-center gap-3">
      {/* Icon */}
      <div
        className="relative flex items-center justify-center rounded-2xl"
        style={{
          width: icon,
          height: icon,
          background: "linear-gradient(135deg, #7c1fff 0%, #a66aff 100%)",
          boxShadow: "0 0 20px rgba(124, 31, 255, 0.5)",
        }}
      >
        {/* Brain-like symbol */}
        <svg
          width={icon * 0.6}
          height={icon * 0.6}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2C9.5 2 7.5 3.5 7 5.5C5.5 5.8 4 7.2 4 9C4 9.8 4.3 10.5 4.8 11C4.3 11.5 4 12.5 4 13.5C4 15.5 5.5 17 7.5 17H8C8.5 18.5 10 20 12 20C14 20 15.5 18.5 16 17H16.5C18.5 17 20 15.5 20 13.5C20 12.5 19.7 11.5 19.2 11C19.7 10.5 20 9.8 20 9C20 7.2 18.5 5.8 17 5.5C16.5 3.5 14.5 2 12 2Z"
            fill="white"
            fillOpacity="0.9"
          />
          <circle cx="10" cy="10" r="1.5" fill="#7c1fff" />
          <circle cx="14" cy="10" r="1.5" fill="#7c1fff" />
          <path
            d="M10 14C10.5 15 11.5 15.5 12 15.5C12.5 15.5 13.5 15 14 14"
            stroke="#7c1fff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Text */}
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
