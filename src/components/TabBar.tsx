"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: "/" | "/calendar" | "/budget";
  label: string;
  icon: React.ReactNode;
};

const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const tabs: Tab[] = [
  {
    href: "/",
    label: "ホーム",
    icon: (
      <svg {...iconProps}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9v11h5v-6h4v6h5V9" />
      </svg>
    ),
  },
  {
    href: "/calendar",
    label: "カレンダー",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    href: "/budget",
    label: "予算",
    icon: (
      <svg {...iconProps}>
        <path d="M6 4l6 8 6-8M12 12v8M7 13h10M7 17h10" />
      </svg>
    ),
  },
];

// ログイン画面ではタブバーを出さない
const hiddenPaths = ["/login"];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// 画面の下に固定するタブバー（ホーム・カレンダー・予算）
export default function TabBar() {
  const pathname = usePathname();

  if (hiddenPaths.includes(pathname)) return null;

  return (
    <nav
      aria-label="メインメニュー"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex h-16 max-w-md">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-xs transition-colors ${
                  active
                    ? "font-bold text-teal-700"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
