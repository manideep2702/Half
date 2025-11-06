"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password !== confirm) {
      alert("Passwords do not match.");
      return;
    }
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      alert(error.message);
      return;
    }
    alert("Password updated. You are now signed in.");
    router.replace("/profile/");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-card/70 p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <div className="mt-4 grid gap-3">
          <label className="block text-left">
            <span className="mb-1 block text-xs font-medium text-foreground">New password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-border focus:ring-2 focus:outline-none" required />
          </label>
          <label className="block text-left">
            <span className="mb-1 block text-xs font-medium text-foreground">Confirm password</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-border focus:ring-2 focus:outline-none" required />
          </label>
          <button disabled={loading} className="mt-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50">
            {loading ? "Updating…" : "Update Password"}
          </button>
        </div>
      </form>
    </main>
  );
}
