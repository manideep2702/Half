"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [cooldownTimer, setCooldownTimer] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setVerified(false);
    setOtpSent(false);
    setOtpCode("");
    setMsg(null);
    setErr(null);
    setResendSeconds(0);
    if (cooldownTimer) {
      try { clearInterval(cooldownTimer); } catch {}
      setCooldownTimer(null);
    }
  }, [email]);

  function startCooldown(seconds = 60) {
    setResendSeconds(seconds);
    try { if (cooldownTimer) clearInterval(cooldownTimer); } catch {}
    const t = setInterval(() => {
      setResendSeconds((s) => {
        if (s <= 1) {
          try { clearInterval(t); } catch {}
          setCooldownTimer(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    setCooldownTimer(t);
  }

  async function sendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setErr(null);
    setMsg(null);
    const trimmed = email.trim();
    if (!/.+@.+\..+/.test(trimmed)) {
      setErr("Enter a valid email");
      return;
    }
    if (resendSeconds > 0) return;
    // Optional: Check if email exists to provide better guidance
    try {
      const r = await fetch(`/api/auth/check-email?email=${encodeURIComponent(trimmed)}`);
      if (r.ok) {
        const j = await r.json();
        if (j?.exists !== true) {
          setErr("No account found with this email.");
          return;
        }
      }
    } catch {}
    setSendingOtp(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({ email: trimmed, options: { shouldCreateUser: false } });
      if (error) {
        const msg = error.message || "Failed to send code";
        setErr(msg);
        if (/rate\s*limit/i.test(msg)) startCooldown(60);
        return;
      }
      setOtpSent(true);
      setMsg("Verification code sent to your email.");
      startCooldown(60);
    } catch (e: any) {
      setErr(e?.message || "Unexpected error");
    } finally {
      setSendingOtp(false);
    }
  }

  async function verifyCode() {
    setErr(null);
    setMsg(null);
    const trimmed = email.trim();
    const code = otpCode.trim();
    if (!code) {
      setErr("Enter the code you received");
      return;
    }
    setVerifying(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.verifyOtp({ email: trimmed, token: code, type: 'email' });
      if (error) {
        setErr(error.message || "Invalid code");
        return;
      }
      if (!data?.session) {
        setErr("Verification succeeded but no session was created. Please resend the code.");
        return;
      }
      setVerified(true);
      setMsg("Verified. You can now set a new password.");
    } catch (e: any) {
      setErr(e?.message || "Unexpected error");
    } finally {
      setVerifying(false);
    }
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!verified) {
      setErr("Please verify the code first");
      return;
    }
    if (!password || password !== confirm) {
      setErr("Passwords do not match");
      return;
    }
    setUpdating(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) {
        setErr("Session expired. Please verify again.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErr(error.message || "Failed to update password");
        return;
      }
      setMsg("Password updated. You can now sign in.");
      setTimeout(() => router.replace("/sign-in/"), 1200);
    } catch (e: any) {
      setErr(e?.message || "Unexpected error");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card/70 p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Reset password with code</h1>
        <p className="mt-1 text-sm text-muted-foreground">We’ll send a 6‑digit code to your email.</p>

        <form onSubmit={sendOtp} className="mt-4 grid gap-3">
          <label className="block text-left">
            <span className="mb-1 block text-xs font-medium text-foreground">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-border focus:ring-2 focus:outline-none" placeholder="you@example.com" required />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={sendingOtp || resendSeconds > 0} className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50">
              {sendingOtp ? "Sending…" : (otpSent ? (resendSeconds > 0 ? `Resend ${resendSeconds}s` : "Resend code") : "Send code")}
            </button>
            <button type="button" onClick={() => router.back()} className="text-xs underline text-muted-foreground self-center">Back</button>
          </div>
        </form>

        {otpSent && !verified && (
          <div className="mt-4 grid gap-2">
            <label className="block text-left">
              <span className="mb-1 block text-xs font-medium text-foreground">Enter code</span>
              <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} inputMode="numeric" className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-border focus:ring-2 focus:outline-none" placeholder="123456" />
            </label>
            <button type="button" onClick={verifyCode} disabled={verifying || !otpCode} className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50">
              {verifying ? "Verifying…" : "Verify code"}
            </button>
          </div>
        )}

        {verified && (
          <form onSubmit={updatePassword} className="mt-4 grid gap-3">
            <label className="block text-left">
              <span className="mb-1 block text-xs font-medium text-foreground">New password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-border focus:ring-2 focus:outline-none" required />
            </label>
            <label className="block text-left">
              <span className="mb-1 block text-xs font-medium text-foreground">Confirm password</span>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-border focus:ring-2 focus:outline-none" required />
            </label>
            <button disabled={updating} className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50">
              {updating ? "Updating…" : "Update password"}
            </button>
          </form>
        )}

        {err ? <p className="mt-3 text-xs text-red-500">{err}</p> : null}
        {msg ? <p className="mt-3 text-xs text-emerald-500">{msg}</p> : null}
      </div>
    </main>
  );
}

