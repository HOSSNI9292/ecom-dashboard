"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  gradient?: boolean;
  glass?: boolean;
  glow?: boolean;
}

export function Card({ children, className = "", onClick, hover = true, gradient = false, glass = false, glow = false }: CardProps) {
  return (
    <div
      className={`rounded-2xl p-5 transition-all duration-300 ${
        glass
          ? "glass-card"
          : "bg-[#141417] border border-[#27272A]"
      } ${
        hover && onClick
          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover hover:border-[#10B981]/30"
          : hover
            ? "hover:border-[#3F3F46]"
            : ""
      } ${gradient ? "bg-gradient-to-br from-[#141417] via-[#141417] to-[#0A0A0B]" : ""} ${glow ? "glow-primary" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex items-center justify-between mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-base font-semibold text-[#FAFAFA] ${className}`}>{children}</h3>;
}
