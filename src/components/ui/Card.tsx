import type { HTMLAttributes, ReactNode } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** If true, adds hover effect */
  hoverable?: boolean;
}

export function Card({ children, hoverable = false, className = "", ...rest }: Props) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white p-5 ${
        hoverable ? "hover:border-zinc-300 hover:shadow-sm transition-all" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mb-3 pb-3 border-b border-zinc-100 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h3 className={`font-semibold text-zinc-900 ${className}`}>{children}</h3>;
}
