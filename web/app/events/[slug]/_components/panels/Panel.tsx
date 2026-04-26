import React from "react";
import { JK } from "../shared/tokens";

export function PanelCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", ...style }}>
      {children}
    </div>
  );
}

export function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...JK, fontSize: 14, fontWeight: 800, color: "#06125C", marginBottom: 14 }}>
      {children}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ ...JK, fontSize: 13, color: "#9CA3AF", fontWeight: 500, padding: "16px 0", textAlign: "center" }}>
      {message}
    </div>
  );
}