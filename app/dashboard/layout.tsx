import type { ReactNode } from 'react';
import { Sidebar } from '../../components/ui/sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <Sidebar items={[]} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
