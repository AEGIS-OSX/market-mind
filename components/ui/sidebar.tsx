"use client";

export type SidebarItem = { label: string; href: string };

export function Sidebar({ items = [] }: { items?: SidebarItem[] }) {
  return (
    <nav
      className="w-56 shrink-0 border-r p-4"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
    >
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="block rounded px-2 py-1.5 text-sm"
              style={{ color: 'var(--color-text)' }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
