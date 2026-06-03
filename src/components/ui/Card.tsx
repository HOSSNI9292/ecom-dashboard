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
      className={`bg-[#111827] border border-[#1F2937] rounded-xl p-5 transition-all duration-200 ${
        hover && onClick
          ? "cursor-pointer hover:border-[#6366F1]/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.05)]"
          : hover
            ? "hover:border-[#334155]"
            : ""
      } ${gradient ? "bg-gradient-to-br from-[#111827] to-[#0B0F19]" : ""} ${className}`}
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
