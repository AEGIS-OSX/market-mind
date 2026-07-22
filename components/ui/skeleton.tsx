import React from "react";

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ width = "100%", height = "16px", className = "" }: SkeletonProps) {
  return (
    <div
      className={`bg-[var(--color-surface-2)] rounded-[var(--radius-panel)] animate-[skeleton-pulse_1.5s_ease-in-out_infinite] motion-reduce:animate-none ${className}`}
      style={{ width, height }}
    >
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
