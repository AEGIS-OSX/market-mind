"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Client-side user settings store (T-009). Persists to localStorage and
// initializes riskLevel:'moderate', executionMode:'auto' (verbatim criteria).
// The server row in user_settings stays the source of truth: hydrate() pulls
// it on mount and the setters write through via PATCH /api/user/settings.
// Server stores execution_mode as 'recommend'; the store's T-009 vocabulary
// is 'recommend_only' — mapped at this boundary.

type RiskLevel = "conservative" | "moderate" | "aggressive";
type ExecutionMode = "auto" | "recommend_only";

type UserSettings = {
  riskLevel: RiskLevel;
  investmentCap: number;
  executionMode: ExecutionMode;
  brokerageConnected: boolean;
  hydrated: boolean;
  setRiskLevel: (level: RiskLevel) => void;
  setInvestmentCap: (cap: number) => void;
  setExecutionMode: (mode: ExecutionMode) => void;
  setBrokerageConnected: (connected: boolean) => void;
  hydrate: () => Promise<void>;
};

function patchServer(fields: Record<string, unknown>) {
  // Fire-and-forget write-through; the UI state is already updated. A failed
  // PATCH surfaces on next hydrate rather than blocking the interaction.
  fetch("/api/user/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  }).catch(() => {});
}

export const useUserSettings = create<UserSettings>()(
  persist(
    (set) => ({
      riskLevel: "moderate",
      investmentCap: 0,
      executionMode: "auto",
      brokerageConnected: false,
      hydrated: false,
      setRiskLevel: (level) => {
        set({ riskLevel: level });
        patchServer({ risk_level: level });
      },
      setInvestmentCap: (cap) => {
        set({ investmentCap: cap });
        patchServer({ investment_cap: cap > 0 ? cap : null });
      },
      setExecutionMode: (mode) => {
        set({ executionMode: mode });
        patchServer({ execution_mode: mode === "auto" ? "auto" : "recommend" });
      },
      setBrokerageConnected: (connected) => set({ brokerageConnected: connected }),
      hydrate: async () => {
        try {
          const res = await fetch("/api/user/settings");
          if (!res.ok) return;
          const d = await res.json();
          set({
            riskLevel: (d.risk_level as RiskLevel) || "moderate",
            investmentCap: d.investment_cap == null ? 0 : Number(d.investment_cap),
            executionMode: d.execution_mode === "auto" ? "auto" : "recommend_only",
            brokerageConnected: Boolean(d.brokerage_connected),
            hydrated: true,
          });
        } catch {
          /* keep persisted/initial values; next mount retries */
        }
      },
    }),
    { name: "market-mind-user-settings" }
  )
);
