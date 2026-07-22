"use client";

import React, { useState, useEffect } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Trade {
  id: string;
  date: string;
  ticker: string;
  action: "buy" | "sell";
  quantity: string;
  price: string;
  total: string;
  status: "filled" | "pending" | "cancelled" | "rejected";
  rationale: string;
}

const MOCK_TRADES: Trade[] = [
  {
    id: "1",
    date: "2026-07-21 14:32:01",
    ticker: "AAPL",
    action: "buy",
    quantity: "50",
    price: "$192.45",
    total: "$9,622.50",
    status: "filled",
    rationale: "Strong support at 190 level with increasing volume on the 15m chart.",
  },
  {
    id: "2",
    date: "2026-07-21 13:15:44",
    ticker: "TSLA",
    action: "sell",
    quantity: "10",
    price: "$245.12",
    total: "$2,451.20",
    status: "filled",
    rationale: "RSI overbought on daily timeframe, locking in partial profits before earnings.",
  },
  {
    id: "3",
    date: "2026-07-21 11:05:12",
    ticker: "NVDA",
    action: "buy",
    quantity: "5",
    price: "$462.10",
    total: "$2,310.50",
    status: "pending",
    rationale: "Anticipating breakout above previous resistance level of 460.",
  },
  {
    id: "4",
    date: "2026-07-21 09:45:30",
    ticker: "MSFT",
    action: "buy",
    quantity: "20",
    price: "$338.70",
    total: "$6,774.00",
    status: "cancelled",
    rationale: "Order cancelled due to rapid price movement away from entry zone.",
  },
  {
    id: "5",
    date: "2026-07-20 16:00:00",
    ticker: "AMD",
    action: "sell",
    quantity: "100",
    price: "$112.30",
    total: "$11,230.00",
    status: "filled",
    rationale: "Target price reached at 112. Closing position for 15% gain.",
  },
  {
    id: "6",
    date: "2026-07-20 14:20:15",
    ticker: "GOOGL",
    action: "buy",
    quantity: "15",
    price: "$125.40",
    total: "$1,881.00",
    status: "rejected",
    rationale: "Insufficient buying power for the requested margin position.",
  },
];

export default function TradeHistoryPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const truncateRationale = (text: string) => {
    if (text.length <= 60) return text;
    return text.slice(0, 60) + "...";
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-bottom border-[var(--color-border)]">
        <h1 className="text-[18px] font-medium tracking-tight">Trade History</h1>
        <div className="flex gap-3">
          <button className="action-button">Export CSV</button>
          <button className="action-button">View Audit Trail</button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 px-6 py-4 overflow-auto">
        <table className="trade-history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Ticker</th>
              <th>Action</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total</th>
              <th>Status</th>
              <th>Rationale</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="h-[44px] border-b border-[var(--color-border)]">
                  <td colSpan={8} className="px-3">
                    <Skeleton height="44px" />
                  </td>
                </tr>
              ))
            ) : (
              MOCK_TRADES.map((trade) => (
                <tr key={trade.id} className="data-row">
                  <td>{trade.date}</td>
                  <td className="font-mono">{trade.ticker}</td>
                  <td>
                    <StatusBadge variant={trade.action} label={trade.action.toUpperCase()} />
                  </td>
                  <td>{trade.quantity}</td>
                  <td>{trade.price}</td>
                  <td>{trade.total}</td>
                  <td>
                    <StatusBadge variant={trade.status} label={trade.status.charAt(0).toUpperCase() + trade.status.slice(1)} />
                  </td>
                  <td title={trade.rationale} className="max-w-[300px]">
                    {truncateRationale(trade.rationale)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .action-button {
          background-color: var(--color-surface-2);
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
          border-radius: var(--radius-button);
          height: 36px;
          padding: 0 16px;
          font-family: var(--font-body);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .action-button:hover {
          color: var(--color-text-primary);
          border-color: var(--color-accent);
        }
        .trade-history-table {
          width: 100%;
          border-collapse: collapse;
        }
        .trade-history-table th {
          color: var(--color-text-secondary);
          font-size: 11px;
          font-weight: 400;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          border-bottom: 1px solid var(--color-border);
          padding: 8px 12px;
          text-align: left;
        }
        .data-row {
          height: 44px;
          border-bottom: 1px solid var(--color-border);
          transition: background-color 0.15s ease;
        }
        .data-row:hover {
          background-color: var(--color-surface-2);
        }
        .data-row td {
          padding: 0 12px;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
