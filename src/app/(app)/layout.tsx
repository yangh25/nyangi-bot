"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

const LINKS: [href: string, label: string][] = [
  ["/", "Home"],
  ["/add", "Add word"],
  ["/add/bulk", "Bulk add"],
  ["/words", "Word bank"],
  ["/words/timeline", "Timeline"],
  ["/words/hanja", "Hanja"],
  ["/review", "Review"],
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="font-bold text-stone-800 text-sm"
          >
            nyangi-bot
          </Link>

          {/* Desktop: inline links */}
          <div className="hidden sm:flex items-center gap-4 flex-1">
            {LINKS.map(([href, label]) => (
              <NavLink key={href} href={href} active={pathname === href}>
                {label}
              </NavLink>
            ))}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="hidden sm:block text-sm text-stone-500 hover:text-stone-800 transition-colors"
          >
            Sign out
          </button>

          {/* Mobile: hamburger toggle */}
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="sm:hidden ml-auto text-stone-600 hover:text-stone-900 transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile: collapsible menu */}
        {menuOpen && (
          <div className="sm:hidden flex flex-col mt-3 pt-3 border-t border-stone-100">
            {LINKS.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`py-2 text-sm transition-colors ${
                  pathname === href
                    ? "text-stone-800 font-medium"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                {label}
              </Link>
            ))}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="py-2 text-left text-sm text-stone-500 hover:text-stone-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </nav>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`text-sm transition-colors ${
        active ? "text-stone-800 font-medium" : "text-stone-500 hover:text-stone-800"
      }`}
    >
      {children}
    </Link>
  );
}
