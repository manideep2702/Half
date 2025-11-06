"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SabarimalaDropdown from "@/components/ui/sabarimala-dropdown";

export default function AdminDataDropdown() {
  const router = useRouter();
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
        const raw = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();
        const allowed = raw.split(/[\s,;]+/).filter(Boolean);
        if (!cancelled) setShow(!!email && hasEmailProvider && (allowed.length === 0 || allowed.includes(email)));
      } catch {
        if (!cancelled) setShow(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!show) return null;
  return (
    <div className="flex items-center px-2">
      <SabarimalaDropdown
        className="relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors bg-white/10 text-white hover:bg-white/20"
        options={[
          { label: "Annadanam List", onClick: () => router.push("/admin/annadanam") },
          { label: "Pooja List", onClick: () => router.push("/admin/pooja") },
          { label: "Volunteer List", onClick: () => router.push("/admin/volunteers") },
          { label: "Block Pooja Dates", onClick: () => router.push("/admin/pooja/block") },
        ]}
      >
        Admin
      </SabarimalaDropdown>
    </div>
  );
}
