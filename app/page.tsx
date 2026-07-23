"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Newspaper,
  Settings,
  Bell,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Download,
  ChevronDown,
  User,
  LogOut,
  HelpCircle,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────

interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  peRatio: number;
  sector: string;
}

interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  category: string;
  sentiment: "positive" | "negative" | "neutral";
  summary: string;
}

interface Alert {
  id: string;
  type: "price" | "volume" | "news" | "technical";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  timestamp: string;
  symbol?: string;
}

// ─── Mock Data ─────────────────────────────────────────────────────

const MARKET_INDICES: MarketIndex[] = [
  { name: "S&P 500", value: 4783.35, change: 25.48, changePercent: 0.54 },
  { name: "NASDAQ", value: 15095.14, change: 108.67, changePercent: 0.72 },
  { name: "DOW", value: 37468.61, change: -12.33, changePercent: -0.03 },
  { name: "RUSSELL 2000", value: 1985.58, change: 8.92, changePercent: 0.45 },
];

const WATCHLIST_STOCKS: Stock[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 195.89,
    change: 2.34,
    changePercent: 1.21,
    volume: "52.3M",
    marketCap: "3.02T",
    peRatio: 30.2,
    sector: "Technology",
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    price: 412.2,
    change: 5.67,
    changePercent: 1.39,
    volume: "28.1M",
    marketCap: "3.06T",
    peRatio: 36.1,
    sector: "Technology",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 141.8,
    change: -1.23,
    changePercent: -0.86,
    volume: "31.5M",
    marketCap: "1.76T",
    peRatio: 25.4,
    sector: "Technology",
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 178.35,
    change: 3.45,
    changePercent: 1.97,
    volume: "45.2M",
    marketCap: "1.85T",
    peRatio: 58.3,
    sector: "Consumer Discretionary",
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 248.42,
    change: -8.91,
    changePercent: -3.46,
    volume: "98.7M",
    marketCap: "789.2B",
    peRatio: 78.9,
    sector: "Consumer Discretionary",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    price: 875.28,
    change: 22.15,
    changePercent: 2.6,
    volume: "41.3M",
    marketCap: "2.16T",
    peRatio: 72.5,
    sector: "Technology",
  },
];

const PORTFOLIO_DATA = [
  { date: "Jan", value: 100000, benchmark: 100000 },
  { date: "Feb", value: 102500, benchmark: 101200 },
  { date: "Mar", value: 101800, benchmark: 102100 },
  { date: "Apr", value: 105200, benchmark: 103500 },
  { date: "May", value: 108900, benchmark: 104800 },
  { date: "Jun", value: 107500, benchmark: 105200 },
  { date: "Jul", value: 112300, benchmark: 106800 },
  { date: "Aug", value: 115600, benchmark: 107500 },
  { date: "Sep", value: 113200, benchmark: 106900 },
  { date: "Oct", value: 118500, benchmark: 108200 },
  { date: "Nov", value: 121800, benchmark: 109500 },
  { date: "Dec", value: 125400, benchmark: 110800 },
];

const SECTOR_PERFORMANCE = [
  { sector: "Technology", performance: 18.5 },
  { sector: "Healthcare", performance: 8.2 },
  { sector: "Finance", performance: 12.1 },
  { sector: "Energy", performance: -3.5 },
  { sector: "Consumer", performance: 6.8 },
  { sector: "Industrial", performance: 9.4 },
];

const NEWS_ITEMS: NewsItem[] = [
  {
    id: "1",
    title: "Fed Signals Potential Rate Cuts in 2024",
    source: "Financial Times",
    time: "2 hours ago",
    category: "Macro",
    sentiment: "positive",
    summary:
      "Federal Reserve officials indicated they may cut interest rates three times in 2024 as inflation shows signs of cooling.",
  },
  {
    id: "2",
    title: "Tech Stocks Rally on AI Optimism",
    source: "Bloomberg",
    time: "4 hours ago",
    category: "Technology",
    sentiment: "positive",
    summary:
      "Major technology stocks surged as investors remain optimistic about artificial intelligence adoption and revenue potential.",
  },
  {
    id: "3",
    title: "Oil Prices Drop on Supply Concerns",
    source: "Reuters",
    time: "6 hours ago",
    category: "Commodities",
    sentiment: "negative",
    summary:
      "Crude oil prices fell 2% as global supply concerns ease and demand forecasts are revised downward.",
  },
  {
    id: "4",
    title: "Retail Sales Beat Expectations",
    source: "WSJ",
    time: "8 hours ago",
    category: "Economy",
    sentiment: "positive",
    summary:
      "U.S. retail sales rose 0.6% in November, exceeding economist expectations and signaling strong consumer spending.",
  },
  {
    id: "5",
    title: "Cryptocurrency Market Volatility Continues",
    source: "CoinDesk",
    time: "10 hours ago",
    category: "Crypto",
    sentiment: "neutral",
    summary:
      "Bitcoin and Ethereum experienced significant price swings as regulatory concerns persist in major markets.",
  },
];

const ALERTS: Alert[] = [
  {
    id: "1",
    type: "price",
    severity: "high",
    title: "AAPL Price Target Reached",
    description: "Apple stock has reached your target price of $195.00",
    timestamp: "15 minutes ago",
    symbol: "AAPL",
  },
  {
    id: "2",
    type: "volume",
    severity: "medium",
    title: "Unusual Volume Detected",
    description: "TSLA is trading at 2.5x average volume",
    timestamp: "1 hour ago",
    symbol: "TSLA",
  },
  {
    id: "3",
    type: "news",
    severity: "low",
    title: "Earnings Report Due",
    description: "MSFT earnings report scheduled for tomorrow after market close",
    timestamp: "3 hours ago",
    symbol: "MSFT",
  },
  {
    id: "4",
    type: "technical",
    severity: "medium",
    title: "Breakout Signal",
    description: "NVDA has broken above resistance level of $870",
    timestamp: "5 hours ago",
    symbol: "NVDA",
  },
];

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: BarChart3, label: "Signals" },
  { icon: Newspaper, label: "News" },
  { icon: Settings, label: "Settings" },
];

// ─── Components ────────────────────────────────────────────────────

function MarketIndexCard({ index }: { index: MarketIndex }) {
  const isPositive = index.change >= 0;

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">{index.name}</p>
            <p className="text-2xl font-bold text-white mt-1">
              {index.value.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <div
              className={cn(
                "flex items-center gap-1",
                isPositive ? "text-emerald-400" : "text-red-400"
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="font-medium">
                {isPositive ? "+" : ""}
                {index.change.toFixed(2)}
              </span>
            </div>
            <p
              className={cn(
                "text-sm mt-1",
                isPositive ? "text-emerald-400" : "text-red-400"
              )}
            >
              {isPositive ? "+" : ""}
              {index.changePercent.toFixed(2)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StockRow({ stock }: { stock: Stock }) {
  const isPositive = stock.change >= 0;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
          <span className="text-xs font-bold text-slate-300">
            {stock.symbol.slice(0, 2)}
          </span>
        </div>
        <div>
          <p className="font-medium text-white">{stock.symbol}</p>
          <p className="text-sm text-slate-400">{stock.name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-white">${stock.price.toFixed(2)}</p>
        <div
          className={cn(
            "flex items-center gap-1 justify-end",
            isPositive ? "text-emerald-400" : "text-red-400"
          )}
        >
          {isPositive ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          <span className="text-sm">
            {isPositive ? "+" : ""}
            {stock.changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const sentimentConfig = {
    positive: { color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle2 },
    negative: { color: "bg-red-500/20 text-red-400", icon: AlertTriangle },
    neutral: { color: "bg-slate-500/20 text-slate-400", icon: Minus },
  };

  const config = sentimentConfig[item.sentiment];
  const Icon = config.icon;

  return (
    <Card className="bg-slate-900/50 border-slate-800 hover:bg-slate-800/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg", config.color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                {item.category}
              </Badge>
              <span className="text-xs text-slate-500">{item.time}</span>
            </div>
            <h4 className="font-medium text-white mb-1">{item.title}</h4>
            <p className="text-sm text-slate-400">{item.summary}</p>
            <p className="text-xs text-slate-500 mt-2">{item.source}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  const severityConfig = {
    high: { color: "border-red-500/50 bg-red-500/10", icon: AlertTriangle },
    medium: { color: "border-amber-500/50 bg-amber-500/10", icon: Zap },
    low: { color: "border-blue-500/50 bg-blue-500/10", icon: Bell },
  };

  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <Card className={cn("border", config.color)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 text-slate-400 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {alert.symbol && (
                <Badge variant="outline" className="text-xs">
                  {alert.symbol}
                </Badge>
              )}
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs",
                  alert.severity === "high"
                    ? "bg-red-500/20 text-red-400"
                    : alert.severity === "medium"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-blue-500/20 text-blue-400"
                )}
              >
                {alert.severity}
              </Badge>
            </div>
            <h4 className="font-medium text-white text-sm">{alert.title}</h4>
            <p className="text-sm text-slate-400 mt-1">{alert.description}</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {alert.timestamp}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("all");
  const [activeTab, setActiveTab] = useState("Dashboard");

  const filteredStocks = WATCHLIST_STOCKS.filter((stock) => {
    const matchesSearch =
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector =
      selectedSector === "all" ||
      stock.sector.toLowerCase().replace(/\s+/g, "-") === selectedSector;
    return matchesSearch && matchesSector;
  });

  const portfolioValue = 125400;
  const portfolioChange = 25400;
  const portfolioChangePercent = 25.4;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">MarketMind</h1>
            </div>

            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search stocks, news, or signals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-slate-400 hover:text-white"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.label;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setActiveTab(item.label)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                      isActive
                        ? "bg-indigo-600/20 text-indigo-400 border border-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="mt-8 pt-6 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Portfolio</span>
                  <span className="text-sm font-medium text-white">
                    ${portfolioValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Day Change</span>
                  <span className="text-sm font-medium text-emerald-400">
                    +${portfolioChange.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Return</span>
                  <span className="text-sm font-medium text-emerald-400">
                    +{portfolioChangePercent}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Recent Alerts
              </h3>
              <div className="space-y-2">
                {ALERTS.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50"
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        alert.severity === "high"
                          ? "bg-red-500"
                          : alert.severity === "medium"
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      )}
                    />
                    <span className="text-xs text-slate-300 truncate">
                      {alert.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <HelpCircle className="h-4 w-4" />
                Help & Support
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">{activeTab}</h2>
              <p className="text-slate-400 mt-1">
                Real-time market data and insights
              </p>
            </div>

            {activeTab === "Dashboard" && (
              <>
                {/* Market Indices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {MARKET_INDICES.map((index) => (
                    <MarketIndexCard key={index.name} index={index} />
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Portfolio Chart */}
                  <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white">
                            Portfolio Performance
                          </CardTitle>
                          <CardDescription className="text-slate-400">
                            Track your investment returns over time
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/20 text-emerald-400"
                          >
                            +25.4% YTD
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={PORTFOLIO_DATA}>
                            <defs>
                              <linearGradient
                                id="portfolioGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#6366f1"
                                  stopOpacity={0.3}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#6366f1"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#1e293b"
                            />
                            <XAxis
                              dataKey="date"
                              stroke="#64748b"
                              fontSize={12}
                            />
                            <YAxis
                              stroke="#64748b"
                              fontSize={12}
                              tickFormatter={(value) =>
                                `$${(value / 1000).toFixed(0)}k`
                              }
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#0f172a",
                                border: "1px solid #1e293b",
                                borderRadius: "8px",
                                color: "#fff",
                              }}
                              formatter={(value: number) =>
                                `$${value.toLocaleString()}`
                              }
                            />
                            <Legend />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#6366f1"
                              strokeWidth={2}
                              fill="url(#portfolioGradient)"
                              name="Portfolio"
                            />
                            <Area
                              type="monotone"
                              dataKey="benchmark"
                              stroke="#10b981"
                              strokeWidth={2}
                              fill="transparent"
                              name="Benchmark"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Watchlist */}
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white">Watchlist</CardTitle>
                          <CardDescription className="text-slate-400">
                            Track your favorite stocks
                          </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="text-slate-400">
                          <Filter className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <Select
                          value={selectedSector}
                          onValueChange={setSelectedSector}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                            <SelectValue placeholder="Filter by sector" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="all">All Sectors</SelectItem>
                            <SelectItem value="technology">Technology</SelectItem>
                            <SelectItem value="healthcare">Healthcare</SelectItem>
                            <SelectItem value="finance">Finance</SelectItem>
                            <SelectItem value="energy">Energy</SelectItem>
                            <SelectItem value="consumer-discretionary">
                              Consumer Discretionary
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 max-h-80 overflow-y-auto">
                        {filteredStocks.map((stock) => (
                          <StockRow key={stock.symbol} stock={stock} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sector Performance */}
                <Card className="mt-6 bg-slate-900/50 border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white">Sector Performance</CardTitle>
                    <CardDescription className="text-slate-400">
                      Performance by industry sector
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={SECTOR_PERFORMANCE}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#1e293b"
                          />
                          <XAxis
                            dataKey="sector"
                            stroke="#64748b"
                            fontSize={12}
                          />
                          <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickFormatter={(value) => `${value}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              border: "1px solid #1e293b",
                              borderRadius: "8px",
                              color: "#fff",
                            }}
                            formatter={(value: number) => `${value}%`}
                          />
                          <Bar
                            dataKey="performance"
                            fill="#6366f1"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* News Feed */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Latest News
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      View All
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {NEWS_ITEMS.map((item) => (
                      <NewsCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>

                {/* Alerts */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Active Alerts
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      Manage Alerts
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ALERTS.map((alert) => (
                      <AlertCard key={alert.id} alert={alert} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === "Signals" && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <BarChart3 className="h-12 w-12 mb-4 text-slate-600" />
                <h3 className="text-lg font-medium text-white mb-2">Signals</h3>
                <p>Trading signals and technical indicators will appear here.</p>
              </div>
            )}

            {activeTab === "News" && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Newspaper className="h-12 w-12 mb-4 text-slate-600" />
                <h3 className="text-lg font-medium text-white mb-2">News</h3>
                <p>Curated news feed and sentiment analysis will appear here.</p>
              </div>
            )}

            {activeTab === "Settings" && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Settings className="h-12 w-12 mb-4 text-slate-600" />
                <h3 className="text-lg font-medium text-white mb-2">Settings</h3>
                <p>Account preferences and notification settings will appear here.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
