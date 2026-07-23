import React from "react";
import Sidebar from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-shell flex min-h-screen bg-[var(--color-canvas)]">
      <Sidebar />
      <div className="dashboard-main flex-1 min-w-0 flex flex-col">
        <div className="md:hidden h-[48px]" />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
