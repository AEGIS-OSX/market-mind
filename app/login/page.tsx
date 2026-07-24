"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Sign in failed. Check that the service is configured and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-[var(--space-2)]">
      <div className="w-full max-w-[400px] bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[var(--radius-modal)] p-[var(--space-4)]">
        <div className="flex items-center gap-[10px] mb-[var(--space-3)]">
          <div
            className="w-[28px] h-[28px] flex items-center justify-center flex-shrink-0 rounded-[var(--radius-sm)]"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            <span
              className="font-[family-name:var(--font-display)] text-[11px] font-[700] leading-none select-none"
              style={{ color: "var(--color-accent-ink)" }}
            >
              MM
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-[22px] font-medium text-[var(--color-text-primary)]">
            Sign in
          </h1>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-[var(--space-2)] px-[12px] py-[8px] border border-[var(--color-loss)] rounded-[var(--radius-sm)] font-[family-name:var(--font-body)] text-[var(--text-sm)] text-[var(--color-loss)]"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-[var(--space-2)]">
          <div>
            <label
              htmlFor="email"
              className="block mb-[8px] font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-secondary)]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-[var(--radius-button)] px-[10px] py-[8px] text-[var(--text-sm)] font-[family-name:var(--font-body)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block mb-[8px] font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-secondary)]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-[var(--radius-button)] px-[10px] py-[8px] text-[var(--text-sm)] font-[family-name:var(--font-body)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-[10px] rounded-[var(--radius-button)] font-[family-name:var(--font-body)] text-[var(--text-sm)] font-medium disabled:opacity-60 transition-opacity"
            style={{ backgroundColor: "var(--color-accent)", color: "var(--color-accent-ink)" }}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-[var(--space-2)] font-[family-name:var(--font-body)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
          No account?{" "}
          <Link href="/signup" className="text-[var(--color-accent)] hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
