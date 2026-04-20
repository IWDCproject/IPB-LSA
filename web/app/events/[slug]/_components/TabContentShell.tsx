"use client";

import React from "react";

interface Props {
  isExiting: boolean;   // kept for API compatibility, no longer used
  children:  React.ReactNode;
}

export default function TabContentShell({ children }: Props) {
  // No exit animation — the tab swaps instantly and only the entry animates.
  return <div>{children}</div>;
}