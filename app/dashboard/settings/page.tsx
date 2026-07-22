"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type RiskLevel = "Conservative" | "Moderate" | "Aggressive";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  isDestructive?: boolean;
}

const Modal = ({ isOpen, onClose, title, children, confirmLabel, onConfirm, isDestructive }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[24px] bg-[var(--color-canvas)]/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-[400px] bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-modal)] p-[24px] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h2 id="modal-title" className="text-[var(--text-lg)] font-[500] text-[var(--color-text-primary)] mb-[16px] font-[family-name:var(--font-display)]">
          {title}
        </h2>
        <div className="text-[var(--text-base)] text-[var(--color-text-secondary)] mb-[24px] leading-[1.6] font-[family-name:var(--font-body)]">
          {children}
        </div>
        <div className="flex flex-col gap-[8px]">
          <button
            onClick={onConfirm}
            className={`h-[44px] w-full rounded-[var(--radius-button)] font-[500] transition-opacity hover:opacity-90 ${
              isDestructive
                ? "bg-[var(--color-surface-3)] text-[var(--color-loss)]"
                : "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
            }`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onClose}
            className="h-[44px] w-full rounded-[var(--radius-button)] bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] font-[500] transition-opacity hover:opacity-90"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default function SettingsPage() {
  const [risk, setRisk] = useState<RiskLevel>("Moderate");
  const [cap, setCap] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [modal, setModal] = useState<"connect" | "disconnect" | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [capError, setCapError] = useState<string>("");
  const [initialState, setInitialState] = useState({ risk: "Moderate", cap: "", isConnected: false });

  const isDirty = risk !== initialState.risk || cap !== initialState.cap || isConnected !== initialState.isConnected;

  const handleSave = () => {
    if (!isDirty) return;
    if (cap !== "") {
      const numericCap = parseFloat(cap);
      if (isNaN(numericCap) || numericCap < 0 || numericCap > 10000000) {
        setCapError("Please enter a valid investment cap between $0 and $10,000,000.");
        return;
      }
    }
    setCapError("");
    setInitialState({ risk, cap, isConnected });
    setShowToast(true);
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleConnect = () => {
    setIsConnected(true);
    setModal(null);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setModal(null);
  };

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text-primary)] font-[family-name:var(--font-body)]">
      {/* Top Bar */}
      <header className="h-[64px] border-b border-[var(--color-border)] flex items-center px-[24px]">
        <h1 className="text-[var(--text-section-title)] font-[500] font-[family-name:var(--font-display)]">
          Settings
        </h1>
      </header>

      <div className="max-w-[640px] mx-auto p-[24px] flex flex-col gap-[32px]">
        {/* Success Toast */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-[var(--color-surface-2)] border border-[var(--color-gain)] text-[var(--color-gain)] rounded-[var(--radius-panel)] p-[12px_16px] text-[var(--text-base)]"
              role="status"
            >
              Settings updated.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section 1: Risk & Capital */}
        <section className="flex flex-col gap-[24px]">
          <h2 className="text-[var(--text-lg)] font-[500] text-[var(--color-text-primary)] font-[family-name:var(--font-display)]">
            Risk & Capital
          </h2>

          <div className="flex flex-col gap-[8px]">
            <label className="text-[var(--text-xs)] text-[var(--color-text-muted)] uppercase tracking-wider font-[500]">
              Risk Tolerance
            </label>
            <div className="grid grid-cols-3 gap-[8px]" role="radiogroup" aria-label="Risk Tolerance">
              {(["Conservative", "Moderate", "Aggressive"] as RiskLevel[]).map((level) => (
                <button
                  key={level}
                  role="radio"
                  aria-checked={risk === level}
                  onClick={() => setRisk(level)}
                  className={`h-[44px] rounded-[var(--radius-button)] text-[var(--text-base)] font-[500] transition-all ${
                    risk === level
                      ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                      : "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-[8px]">
            <label className="text-[var(--text-xs)] text-[var(--color-text-muted)] uppercase tracking-wider font-[500]">
              Investment Cap
            </label>
            <input
              type="number"
              min="0"
              max="10000000"
              step="0.01"
              inputMode="decimal"
              value={cap}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setCap("");
                  setCapError("");
                  return;
                }
                const numericVal = parseFloat(val);
                if (!isNaN(numericVal) && numericVal >= 0 && numericVal <= 10000000) {
                  setCap(val);
                  setCapError("");
                }
              }}
              placeholder="$0.00"
              className="h-[44px] w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-[var(--radius-button)] px-[16px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline focus:outline-2 focus:outline-[var(--color-accent)] transition-all font-[family-name:var(--font-body)]"
            />
            {capError && (
              <p role="alert" className="text-red-500 text-sm mt-1">
                {capError}
              </p>
            )}
          </div>
        </section>

        {/* Section 2: Brokerage */}
        <section className="pt-[32px] border-t border-[var(--color-border)] flex flex-col gap-[24px]">
          <h2 className="text-[var(--text-lg)] font-[500] text-[var(--color-text-primary)] font-[family-name:var(--font-display)]">
            Brokerage Connection
          </h2>

          {isConnected ? (
            <div className="flex items-center justify-between bg-[var(--color-surface-1)] p-[16px] rounded-[var(--radius-panel)] border border-[var(--color-border)]">
              <div className="flex items-center gap-[12px]">
                <div className="w-[8px] h-[8px] rounded-full bg-[var(--color-gain)] shadow-[0_0_8px_var(--color-gain)]" />
                <span className="text-[var(--text-base)] font-[500]">Alpaca Connected</span>
              </div>
              <button
                onClick={() => setModal("disconnect")}
                className="text-[var(--text-base)] text-[var(--color-loss)] font-[500] hover:underline"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => setModal("connect")}
              className="h-[44px] w-full bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-button)] font-[500] transition-opacity hover:opacity-90"
            >
              Connect Alpaca Markets
            </button>
          )}
        </section>

        {/* Save Button */}
        <div className="pt-[32px] border-t border-[var(--color-border)]">
          <button
            onClick={handleSave}
            disabled={!isDirty}
            aria-disabled={!isDirty}
            className={`h-[44px] w-full rounded-[var(--radius-button)] font-[600] transition-all ${
              isDirty
                ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90"
                : "bg-[var(--color-surface-3)] text-[var(--color-text-muted)] opacity-[0.55] cursor-not-allowed"
            }`}
          >
            Save Settings
          </button>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal === "connect" && (
          <Modal
            isOpen={true}
            onClose={() => setModal(null)}
            title="Connect Alpaca Markets"
            confirmLabel="Continue to Alpaca"
            onConfirm={handleConnect}
          >
            Market Mind requires a connected Alpaca account to execute trades. Your credentials are encrypted and never exposed.
          </Modal>
        )}
        {modal === "disconnect" && (
          <Modal
            isOpen={true}
            onClose={() => setModal(null)}
            title="Disconnect Brokerage"
            confirmLabel="Disconnect Account"
            onConfirm={handleDisconnect}
            isDestructive
          >
            This will stop all automated trading and remove access to your Alpaca account.
          </Modal>
        )}
      </AnimatePresence>
    </main>
  );
}
