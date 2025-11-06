"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  CalendarDays,
  BookOpenText,
  HeartHandshake,
  PhoneCall,
  Landmark,
  Menu,
  X,
} from "lucide-react";
import SabarimalaDropdown from "@/components/ui/sabarimala-dropdown";
import AdminDataDropdown from "@/components/nav/AdminDataDropdown";

// Avoid pulling Supabase into the root layout's initial graph during SSR.
// This helps sidestep Turbopack resolution glitches by loading the dropdown on client only.
const NavUserDropdown = dynamic(() => import("@/components/nav/nav-user-dropdown"), { ssr: false });

type NavItem = { name: string; url: string };

export default function SiteNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Ensure a visible Sign In link before hydration/dynamic import
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items: NavItem[] = [
    { name: "Home", url: "/" },
    { name: "Calendar", url: "/calendar" },
    { name: "Devotional", url: "/devotional" },
    { name: "Donate", url: "/donate" },
    { name: "Contact", url: "/contact" },
  ];

  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname?.startsWith(url));

  return (
    <div className="w-full">
      {/* Top utility bar */}
      <div className="hidden md:block bg-[var(--brand-purple-dark)] text-[var(--brand-text)]">
        <div className="max-w-7xl mx-auto flex items-center justify-end gap-6 text-sm px-4 py-2 opacity-90">
          <a href="/contact" className="hover:underline inline-flex items-center gap-2">
            <PhoneCall className="h-4 w-4 opacity-80" /> Contact Us
          </a>
          <span className="opacity-80">Helpline</span>
          <span className="opacity-80">English ▾</span>
        </div>
      </div>

      {/* Main navbar */}
      <div className="bg-[var(--brand-purple)] text-[var(--brand-text)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-stretch justify-between">
            {/* Brand */}
            <div className="flex items-center gap-3 py-2">
              <img src="/logo.jpeg" alt="Sree Sabari Sastha Seva Samithi" className="h-12 w-12 object-contain" />
              <div className="leading-tight hidden sm:block">
                <div className="text-lg font-semibold tracking-wide">Sree Sabari Sastha</div>
                <div className="text-lg font-semibold tracking-wide">Seva Samithi</div>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-stretch">
              {items.map((item) => (
                <Link
                  key={item.name}
                  href={item.url}
                  className={
                    "relative uppercase tracking-wide font-semibold px-6 flex items-center text-white/90 hover:text-white transition-colors" +
                    (isActive(item.url)
                      ? " bg-[var(--brand-orange)] text-white"
                      : "")
                  }
                >
                  <span>{item.name}</span>
                  {isActive(item.url) && (
                    <span className="absolute bottom-1 left-4 right-4 h-0.5 bg-white" />
                  )}
                </Link>
              ))}
              <AdminDataDropdown />
              {/* Sabarimala dropdown integrated */}
              <div className="flex items-center px-2">
                <SabarimalaDropdown
                  className="relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors bg-white/10 text-white hover:bg-white/20"
                  options={[
                    { label: "About Sabarimala", onClick: () => router.push("/sabarimala?tab=about") },
                    { label: "How to Reach", onClick: () => router.push("/sabarimala/how-to-reach") },
                    { label: "Calendar", onClick: () => router.push("/calendar") },
                    { label: "Pooja Timing", onClick: () => router.push("/sabarimala?tab=pooja") },
                  ]}
                >
                  <span className="hidden md:inline">Sabarimala</span>
                  <span className="md:hidden"><Landmark className="h-4 w-4" /></span>
                </SabarimalaDropdown>
              </div>
              <div className="flex items-center px-2">
                <NavUserDropdown />
                {/* Fallback Sign In link visible before hydration, hidden after mount */}
                {!mounted && (
                  <Link
                    href="/sign-in/"
                    className="ml-2 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </nav>

            {/* Mobile controls */}
            <div className="lg:hidden flex items-center gap-2">
              <SabarimalaDropdown
                className="h-9 rounded-full bg-white/10 px-4 text-xs font-medium text-white hover:bg-white/20"
                options={[
                  { label: "About Sabarimala", onClick: () => router.push("/sabarimala?tab=about") },
                  { label: "How to Reach", onClick: () => router.push("/sabarimala/how-to-reach") },
                  { label: "Calendar", onClick: () => router.push("/calendar") },
                  { label: "Pooja Timing", onClick: () => router.push("/sabarimala?tab=pooja") },
                ]}
              />
              {/* Admin dropdown (mobile) */}
              <AdminDataDropdown />
              <NavUserDropdown />
              {!mounted && (
                <Link
                  href="/sign-in/"
                  className="h-9 rounded-full bg-white/10 px-4 text-xs font-medium text-white hover:bg-white/20"
                >
                  Sign In
                </Link>
              )}
              <button
                aria-label="Open menu"
                className="ml-2 inline-flex items-center justify-center h-9 w-9 rounded-md bg-white/10 hover:bg-white/20"
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="lg:hidden border-t border-white/10">
            <div className="px-4 py-2 flex flex-col">
              {items.map((item) => (
                <Link
                  key={item.name}
                  href={item.url}
                  onClick={() => setOpen(false)}
                  className={
                    "py-3 px-2 uppercase tracking-wide font-medium rounded-md " +
                    (isActive(item.url)
                      ? "bg-[var(--brand-orange)] text-white"
                      : "hover:bg-white/10 text-white/90")
                  }
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
