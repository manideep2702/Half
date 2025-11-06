"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminPoojaBlockLink() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("@/lib/supabase/client");
        const supabase = mod.getSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        const user = data?.user as any;
        const email = (user?.email || "").toLowerCase();
        const identities: any[] = Array.isArray(user?.identities) ? user.identities : [];
        const hasEmailProvider = identities.some((i) => i?.provider === "email");
        const adminListRaw = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();
        const allowed = adminListRaw.split(/[\s,;]+/).filter(Boolean);
        if (!cancelled) setShow(!!email && hasEmailProvider && (allowed.length === 0 || allowed.includes(email)));
      } catch {
        if (!cancelled) setShow(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!show) return null;
  return (
    <Link
      href="/admin/pooja/block"
      className="relative uppercase tracking-wide font-semibold px-6 flex items-center text-white/90 hover:text-white transition-colors"
      title="Block Pooja Dates"
    >
      Block Pooja
    </Link>
  );
}
