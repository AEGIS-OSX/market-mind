"use client";

import DashboardLayout from "@/app/dashboard/layout";
import Sidebar from "@/components/ui/sidebar";
import StatusBadge from "@/components/ui/status-badge";
import MetricCard from "@/components/ui/metric-card";
import Skeleton from "@/components/ui/skeleton";
import Modal from "@/components/ui/modal";
import DashboardPage from "@/app/dashboard/page";
import SignalsPage from "@/app/dashboard/signals/page";
import PortfolioPage from "@/app/dashboard/portfolio/page";
import HistoryPage from "@/app/dashboard/history/page";
import SettingsPage from "@/app/dashboard/settings/page";

export default function Home() {
  return (
    <main>
      <DashboardLayout>
        <Sidebar />
        <StatusBadge />
        <MetricCard />
        <Skeleton />
        <Modal />
        <DashboardPage />
        <SignalsPage />
        <PortfolioPage />
        <HistoryPage />
        <SettingsPage />
      </DashboardLayout>
    </main>
  );
}
