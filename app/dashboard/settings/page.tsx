"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserSettings } from "@/lib/store/userSettings";
import { fmtMoney } from "@/components/ui/provenance";

// Settings: risk level, investment cap, execution mode, and an HONEST account
// section. There is no brokerage stub any more — Market Mind runs a simulated
// portfolio (real prices, simulated funds), and this page says exactly that.

export default function SettingsPage() {
  const router = useRouter();
  const riskLevel = useUserSettings((s) => s.riskLevel);
  const setRiskLevel = useUserSettings((s) => s.setRiskLevel);
  const investmentCap = useUserSettings((s) => s.investmentCap);
  const setInvestmentCap = useUserSettings((s) => s.setInvestmentCap);
  const executionMode = useUserSettings((s) => s.executionMode);
  const setExecutionMode = useUserSettings((s) => s.setExecutionMode);
  const hydrate = useUserSettings((s) => s.hydrate);

  const [capDraft, setCapDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<{ cash: number; startingCash: number } | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  useEffect(() => {
    // Hydrate settings (401 → login) and load the simulated account status.
    fetch("/api/user/settings").then(async (res) => {
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      await hydrate();
      setLoading(false);
    }).catch(() => setLoading(false));

    fetch("/api/portfolio")
      .then(async (res) => {
        const d = await res.json();
        if (res.ok) setAccount({ cash: d.account.cash, startingCash: d.account.startingCash });
        else setAccountError(d.error || `HTTP ${res.status}`);
      })
      .catch(() => setAccountError("account status unavailable"));
  }, [router, hydrate]);

  useEffect(() => {
    setCapDraft(investmentCap > 0 ? String(investmentCap) : "");
  }, [investmentCap]);

  if (loading) {
    return (
      <main className="p-[var(--space-3)]">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--color-surface-2)] rounded w-1/3"></div>
          <div className="h-4 bg-[var(--color-surface-2)] rounded w-1/2"></div>
          <div className="h-4 bg-[var(--color-surface-2)] rounded w-2/3"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-[var(--space-3)] max-w-[720px]">
      <h1 className="font-[family-name:var(--font-display)] text-[var(--text-section-title)] font-medium text-[var(--color-text-primary)] mb-[var(--space-3)]">
        Settings
      </h1>

      <div className="flex flex-col gap-[var(--space-3)]">
        {/* Risk level — same store the sidebar uses (T-010) */}
        <section>
          <h2 className="font-[family-name:var(--font-body)] text-[13px] font-[600] text-[var(--color-text-primary)] mb-[8px]">
            Risk Level
          </h2>
          <div className="flex gap-[8px]">
            {(["conservative", "moderate", "aggressive"] as const).map((level) => (
              <button
                key={level}
                onClick={() => setRiskLevel(level)}
                className={`px-[16px] py-[8px] text-[12px] font-[family-name:var(--font-body)] font-[500] rounded-[var(--radius-button)] transition-colors ${
                  riskLevel === level
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                    : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </section>

        {/* Investment cap */}
        <section>
          <h2 className="font-[family-name:var(--font-body)] text-[13px] font-[600] text-[var(--color-text-primary)] mb-[8px]">
            Investment Cap
          </h2>
          <input
            type="text"
            inputMode="decimal"
            value={capDraft}
            onChange={(e) => setCapDraft(e.target.value)}
            onBlur={() => {
              const n = Number(capDraft.replace(/[$,]/g, ""));
              if (Number.isFinite(n) && n >= 0) setInvestmentCap(n);
            }}
            placeholder="No cap"
            className="w-full max-w-[280px] bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-[var(--radius-button)] px-[10px] py-[8px] text-[var(--text-sm)] font-[family-name:var(--font-body)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
          />
          <p className="mt-[6px] font-[family-name:var(--font-body)] text-[11px] text-[var(--color-text-muted)]">
            Maximum total cost basis Market Mind may deploy. Orders beyond it are blocked.
          </p>
        </section>

        {/* Execution mode */}
        <section>
          <h2 className="font-[family-name:var(--font-body)] text-[13px] font-[600] text-[var(--color-text-primary)] mb-[8px]">
            Execution Mode
          </h2>
          <div className="flex gap-[8px]">
            <button
              onClick={() => setExecutionMode("recommend_only")}
              className={`px-[16px] py-[8px] text-[12px] font-[family-name:var(--font-body)] font-[500] rounded-[var(--radius-button)] transition-colors ${
                executionMode === "recommend_only"
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Recommend only
            </button>
            <button
              onClick={() => setExecutionMode("auto")}
              className={`px-[16px] py-[8px] text-[12px] font-[family-name:var(--font-body)] font-[500] rounded-[var(--radius-button)] transition-colors ${
                executionMode === "auto"
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Auto-trade
            </button>
          </div>
          <p className="mt-[6px] font-[family-name:var(--font-body)] text-[11px] text-[var(--color-text-muted)]">
            Recommend only requires a one-tap approval before any simulated order executes.
          </p>
        </section>

        {/* Account — the honest replacement for the dead brokerage stub */}
        <section className="bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[var(--radius-panel)] p-[16px]">
          <h2 className="font-[family-name:var(--font-body)] text-[13px] font-[600] text-[var(--color-text-primary)] mb-[8px]">
            Account
          </h2>
          {account ? (
            <p className="font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-secondary)] leading-[1.6]">
              Simulated paper account active. Cash {fmtMoney(account.cash)} of a{" "}
              {fmtMoney(account.startingCash)} simulated starting balance. Orders
              fill at real market prices; funds are not real.
            </p>
          ) : (
            <p className="font-[family-name:var(--font-body)] text-[13px]" style={{ color: "var(--color-loss)" }}>
              Simulated account status unavailable{accountError ? ` (${accountError})` : ""}.
            </p>
          )}
          <p className="mt-[8px] font-[family-name:var(--font-body)] text-[11px] text-[var(--color-text-muted)] leading-[1.6]">
            Connecting a personal live brokerage is not available: it requires
            brokerage OAuth partner approval Market Mind does not have. No
            real-money orders can be placed from this app.
          </p>
        </section>
      </div>
    </main>
  );
}
