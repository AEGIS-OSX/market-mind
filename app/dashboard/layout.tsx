import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import Sidebar from "@/components/ui/sidebar";

const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "change-me-in-production"
);

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    await jwtVerify(token, JWT_SECRET);
  } catch {
    redirect("/login");
  }

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
