import React from "react";

export function PanelCard({
  children,
  className,
}: {
  children:   React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl px-5 py-4 ${className ?? ""}`}>
      {children}
    </div>
  );
}

export function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-jakarta text-sm font-extrabold text-navy mb-3.5">
      {children}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="font-jakarta text-[13px] text-gray-400 font-medium py-4 text-center">
      {message}
    </div>
  );
}