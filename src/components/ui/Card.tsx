"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  gradient?: boolean;
  glass?: boolean;
}

export function Card({ children, className = "", onClick, hover = true, gradient = false, glass = false }: CardProps) {
  return (
    <div
      className={`rounded-2xl p-5 transition-all duration-200 ${
        glass
          ? "bg-[#111827]/60 backdrop-blur-xl border border-[#1F2937]/60 shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
          : gradient
            ? "bg-gradient-to-br from-[#111827] to-[#0B0F19] border border-[#1F2937] shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
            : "bg-[#111827] border border-[#1F2937] shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
      } ${
        hover && onClick
          ? "cursor-pointer hover:border-[rgba(99,102,241,0.15)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
          : hover
            ? "hover:border-[#334155] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
            : ""
      } ${className}`}
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
  return <h3 className="text-base font-semibold text-white tracking-tight">{children}</h3>;
}
