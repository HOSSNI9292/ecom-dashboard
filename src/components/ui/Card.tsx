"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  gradient?: boolean;
}

export function Card({ children, className = "", onClick, hover = true, gradient = false }: CardProps) {
  return (
    <div
      className={`bg-[#111111] border border-[#1F1F1F] rounded-xl p-5 transition-all duration-200 ${
        hover && onClick
          ? "cursor-pointer hover:border-[#06B6D4]/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.05)]"
          : hover
            ? "hover:border-[#2a2a2a]"
            : ""
      } ${gradient ? "bg-gradient-to-br from-[#111111] to-[#0A0A0A]" : ""} ${className}`}
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
  return <h3 className={`text-base font-semibold text-white ${className}`}>{children}</h3>;
}
