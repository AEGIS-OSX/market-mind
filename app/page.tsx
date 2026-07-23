import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Signals', href: '/dashboard/signals' },
  { label: 'Portfolio', href: '/dashboard/portfolio' },
  { label: 'Trade History', href: '/dashboard/history' },
  { label: 'Settings', href: '/dashboard/settings' },
];

const SIGNALS = [
  { ticker: 'AAPL', name: 'Apple Inc.', action: 'BUY', confidence: 92, price: 187.45, change: '+1.2%', time: '2m ago' },
  { ticker: 'TSLA', name: 'Tesla, Inc.', action: 'HOLD', confidence: 78, price: 242.30, change: '-0.5%', time: '5m ago' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', action: 'BUY', confidence: 88, price: 460.15, change: '+2.1%', time: '8m ago' },
  { ticker: 'MSFT', name: 'Microsoft Corp.', action: 'SELL', confidence: 65, price: 330.20, change: '-1.3%', time: '12m ago' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', action: 'BUY', confidence: 81, price: 135.80, change: '+0.8%', time: '15m ago' },
];

const PORTFOLIO = [
  { ticker: 'AAPL', shares: 150, avgCost: 175.20, current: 187.45, pnl: '+$1,837.50', pnlPct: '+7.0%' },
  { ticker: 'TSLA', shares: 80, avgCost: 250.00, current: 242.30, pnl: '-$616.00', pnlPct: '-3.1%' },
  { ticker: 'NVDA', shares: 45, avgCost: 420.00, current: 460.15, pnl: '+$1,806.75', pnlPct: '+9.6%' },
  { ticker: 'MSFT', shares: 60, avgCost: 340.00, current: 330.20, pnl: '-$588.00', pnlPct: '-2.9%' },
  { ticker: 'AMZN', shares: 200, avgCost: 130.00, current: 135.80, pnl: '+$1,160.00', pnlPct: '+4.5%' },
];

const TRADE_HISTORY = [
  { date: '2024-01-15', ticker: 'AAPL', type: 'BUY', shares: 50, price: 185.00, total: '$9,250.00' },
  { date: '2024-01-14', ticker: 'TSLA', type: 'SELL', shares: 30, price: 245.00, total: '$7,350.00' },
  { date: '2024-01-13', ticker: 'NVDA', type: 'BUY', shares: 25, price: 455.00, total: '$11,375.00' },
  { date: '2024-01-12', ticker: 'MSFT', type: 'SELL', shares: 20, price: 335.00, total: '$6,700.00' },
  { date: '2024-01-11', ticker: 'AMZN', type: 'BUY', shares: 100, price: 132.00, total: '$13,200.00' },
];

export default function Home() {
  const [selectedSignal, setSelectedSignal] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [riskLevel, setRiskLevel] = useState('moderate');
  const [investmentCap, setInvestmentCap] = useState('');
  const pathname = usePathname();
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalPortfolioValue = PORTFOLIO.reduce((sum, item) => sum + item.shares * item.current, 0);
  const totalPnL = PORTFOLIO.reduce((sum, item) => {
    const pnl = item.shares * (item.current - item.avgCost);
    return sum + pnl;
  }, 0);

  return (
    <div className='min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]' style={{ fontFamily: 'var(--font-sans)' }}>
      <div className='flex'>
        {/* Sidebar */}
        <aside className='w-[240px] min-h-screen bg-[var(--color-surface-1)] border-r border-[var(--color-border)] flex flex-col'>
          <div className='px-[16px] py-[20px] border-b border-[var(--color-border)]'>
            <h1 className='text-[var(--color-accent)]' style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>MarketMind</h1>
          </div>

          <nav className='px-[8px] py-[12px] flex flex-col gap-[2px]' aria-label='Main'>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center px-[12px] py-[8px] rounded-[4px] transition-colors focus:outline focus:outline-2 focus:outline-[var(--color-accent)] focus:outline-offset-1 ${
                    isActive
                      ? 'bg-[var(--color-surface-2)] text-[var(--color-accent)]'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]'
                  }`}
                  style={{ fontSize: 'var(--text-sm)', fontWeight: isActive ? 500 : 400 }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className='mt-auto px-[8px] py-[12px] border-t border-[var(--color-border)]'>
            <Link
              href='/dashboard/account'
              className='flex items-center px-[12px] py-[8px] rounded-[4px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors focus:outline focus:outline-2 focus:outline-[var(--color-accent)] focus:outline-offset-1'
              style={{ fontSize: 'var(--text-sm)' }}
            >
              Account
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className='flex-1 p-[24px]'>
          {/* Header */}
          <header className='flex items-center justify-between mb-[24px]'>
            <div>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Dashboard</h2>
              <p className='text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-sm)' }}>Real-time market insights and portfolio overview</p>
            </div>
            <div className='flex items-center gap-[12px]'>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className='px-[12px] py-[8px] rounded-[4px] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-3)] transition-colors focus:outline focus:outline-2 focus:outline-[var(--color-accent)] focus:outline-offset-1'
                style={{ fontSize: 'var(--text-sm)' }}
              >
                Settings
              </button>
              <div className='w-[32px] h-[32px] rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white' style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                JD
              </div>
            </div>
          </header>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                ref={settingsRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className='mb-[24px] p-[16px] bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[4px]'
              >
                <h3 className='mb-[12px]' style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Trading Settings</h3>
                <div className='grid grid-cols-2 gap-[16px]'>
                  <div>
                    <label className='block mb-[4px] text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-sm)' }}>Risk Level</label>
                    <select
                      value={riskLevel}
                      onChange={(e) => setRiskLevel(e.target.value)}
                      className='w-full px-[12px] py-[8px] rounded-[4px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline focus:outline-2 focus:outline-[var(--color-accent)] focus:outline-offset-1'
                      style={{ fontSize: 'var(--text-sm)' }}
                    >
                      <option value='conservative'>Conservative</option>
                      <option value='moderate'>Moderate</option>
                      <option value='aggressive'>Aggressive</option>
                    </select>
                  </div>
                  <div>
                    <label className='block mb-[4px] text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-sm)' }}>Investment Cap ($)</label>
                    <input
                      type='number'
                      value={investmentCap}
                      onChange={(e) => setInvestmentCap(e.target.value)}
                      placeholder='50000'
                      className='w-full px-[12px] py-[8px] rounded-[4px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline focus:outline-2 focus:outline-[var(--color-accent)] focus:outline-offset-1'
                      style={{ fontSize: 'var(--text-sm)' }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Metrics */}
          <div className='grid grid-cols-4 gap-[16px] mb-[24px]'>
            <div className='p-[16px] bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[4px]'>
              <p className='text-[var(--color-text-secondary)] mb-[4px]' style={{ fontSize: 'var(--text-sm)' }}>Portfolio Value</p>
              <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className='p-[16px] bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[4px]'>
              <p className='text-[var(--color-text-secondary)] mb-[4px]' style={{ fontSize: 'var(--text-sm)' }}>Total P&L</p>
              <p className={totalPnL >= 0 ? 'text-green-500' : 'text-red-500'} style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>
                {totalPnL >= 0 ? '+' : ''}${Math.abs(totalPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className='p-[16px] bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[4px]'>
              <p className='text-[var(--color-text-secondary)] mb-[4px]' style={{ fontSize: 'var(--text-sm)' }}>Active Signals</p>
              <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{SIGNALS.length}</p>
            </div>
            <div className='p-[16px] bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[4px]'>
              <p className='text-[var(--color-text-secondary)] mb-[4px]' style={{ fontSize: 'var(--text-sm)' }}>Win Rate</p>
              <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>68.5%</p>
            </div>
          </div>

          {/* Signals Section */}
          <div className='mb-[24px]'>
            <h3 className='mb-[12px]' style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Live Signals</h3>
            <div className='bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[4px] overflow-hidden'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-[var(--color-border)]'>
                    <th className='px-[16px] py-[12px] text-left text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Ticker</th>
                    <th className='px-[16px] py-[12px] text-left text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Action</th>
                    <th className='px-[16px] py-[12px] text-left text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Confidence</th>
                    <th className='px-[16px] py-[12px] text-left text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Price</th>
                    <th className='px-[16px] py-[12px] text-left text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Change</th>
                    <th className='px-[16px] py-[12px] text-left text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {SIGNALS.map((signal) => (
                    <tr
                      key={signal.ticker}
                      onClick={() => setSelectedSignal(selectedSignal === signal.ticker ? null : signal.ticker)}
                      className='border-b border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-surface-2)] transition-colors'
                    >
                      <td className='px-[16px] py-[12px]'>
                        <div>
                          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{signal.ticker}</p>
                          <p className='text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-xs)' }}>{signal.name}</p>
                        </div>
                      </td>
                      <td className='px-[16px] py-[12px]'>
                        <span className={`px-[8px] py-[4px] rounded-[4px] text-white ${signal.action === 'BUY' ? 'bg-green-500' : signal.action === 'SELL' ? 'bg-red-500' : 'bg-yellow-500'}`} style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                          {signal.action}
                        </span>
                      </td>
                      <td className='px-[16px] py-[12px]'>
                        <div className='flex items-center gap-[8px]'>
                          <div className='w-[60px] h-[4px] bg-[var(--color-surface-3)] rounded-full overflow-hidden'>
                            <div className='h-full bg-[var(--color-accent)] rounded-full' style={{ width: `${signal.confidence}%` }} />
                          </div>
                          <span style={{ fontSize: 'var(--text-sm)' }}>{signal.confidence}%</span>
                        </div>
                      </td>
                      <td className='px-[16px] py-[12px]' style={{ fontSize: 'var(--text-sm)' }}>${signal.price}</td>
                      <td className={`px-[16px] py-[12px] ${signal.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`} style={{ fontSize: 'var(--text-sm)' }}>{signal.change}</td>
                      <td className='px-[16px] py-[12px] text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-sm)' }}>{signal.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Portfolio & Trade History */}
          <div className='grid grid-cols-2 gap-[16px]'>
            <div>
              <h3 className='mb-[12px]' style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Portfolio</h3>
              <div className='bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[4px] overflow-hidden'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b border-[var(--color-border)]'>
                      <th className='px-[12px] py-[10px] text-left text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>Ticker</th>
                      <th className='px-[12px] py-[10px] text-left text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>Shares</th>
                      <th className='px-[12px] py-[10px] text-left text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>Avg Cost</th>
                      <th className='px-[12px] py-[10px] text-left text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>Current</th>
                      <th className='px-[12px] py-[10px] text-left text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PORTFOLIO.map((item) => (
                      <tr key={item.ticker} className='border-b border-[var(--color-border)]'>
                        <td className='px-[12px] py-[10px]' style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{item.ticker}</td>
                        <td className='px-[12px] py-[10px]' style={{ fontSize: 'var(--text-sm)' }}>{item.shares}</td>
                        <td className='px-[12px] py-[10px]' style={{ fontSize: 'var(--text-sm)' }}>${item.avgCost}</td>
                        <td className='px-[12px] py-[10px]' style={{ fontSize: 'var(--text-sm)' }}>${item.current}</td>
                        <td className={`px-[12px] py-[10px] ${item.pnl.startsWith('+') ? 'text-green-500' : 'text-red-500'}`} style={{ fontSize: 'var(--text-sm)' }}>{item.pnl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className='mb-[12px]' style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Trade History</h3>
              <div className='bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[4px] overflow-hidden'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b border-[var(--color-border)]'>
                      <th className='px-[12px] py-[10px] text-left text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>Date</th>
                      <th className='px-[12px] py-[10px] text-left text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>Ticker</th>
                      <th className='px-[12px] py-[10px] text-left text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>Type</th>
                      <th className='px-[12px] py-[10px] text-left text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>Shares</th>
                      <th className='px-[12px] py-[10px] text-left text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TRADE_HISTORY.map((trade, idx) => (
                      <tr key={idx} className='border-b border-[var(--color-border)]'>
                        <td className='px-[12px] py-[10px] text-[var(--color-text-secondary)]' style={{ fontSize: 'var(--text-sm)' }}>{trade.date}</td>
                        <td className='px-[12px] py-[10px]' style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{trade.ticker}</td>
                        <td className='px-[12px] py-[10px]'>
                          <span className={`px-[6px] py-[2px] rounded-[4px] text-white ${trade.type === 'BUY' ? 'bg-green-500' : 'bg-red-500'}`} style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                            {trade.type}
                          </span>
                        </td>
                        <td className='px-[12px] py-[10px]' style={{ fontSize: 'var(--text-sm)' }}>{trade.shares}</td>
                        <td className='px-[12px] py-[10px]' style={{ fontSize: 'var(--text-sm)' }}>{trade.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
