"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 py-3 flex items-center gap-6">
        <Link href="/" className="font-bold text-stone-800 text-sm">
          nyangi-bot
        </Link>
        <div className="flex items-center gap-4 flex-1">
          <NavLink href="/" active={pathname === "/"}>
            Home
          </NavLink>
          <NavLink href="/add" active={pathname === "/add"}>
            Add word
          </NavLink>
          <NavLink href="/add/bulk" active={pathname === "/add/bulk"}>
            Bulk add
          </NavLink>
          <NavLink href="/words" active={pathname === "/words"}>
            Word bank
          </NavLink>
          <NavLink href="/review" active={pathname === "/review"}>
            Review
          </NavLink>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          Sign out
        </button>
      </nav>
      <main className="max-w-2xl mx-auto px-6 py-8">{children}</main>
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
