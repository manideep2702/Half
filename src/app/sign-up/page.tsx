"use client";

import { useEffect, useState } from "react";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CalendarDays, BookOpenText, HeartHandshake, CheckCircle } from "lucide-react";

// Simple Google mark used on auth buttons
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [cooldownTimer, setCooldownTimer] = useState<any>(null);
  const [docChoice, setDocChoice] = useState<'aadhaar' | 'pan'>("aadhaar");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState<string>("");
  const [docUploading, setDocUploading] = useState(false);
  const [docUrl, setDocUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    // Reset verification state when email changes
    setEmailVerified(false);
    setOtpSent(false);
    setOtpCode("");
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

  async function sendEmailOtp() {
    setError(null);
    setInfo(null);
    const trimmed = String(email || "").trim();
    const isValid = /.+@.+\..+/.test(trimmed);
    if (!isValid) {
      setError("Please enter a valid email address.");
      return;
    }
    if (resendSeconds > 0) return;
    // Pre-check if email already exists to show a friendly message
    try {
      const r = await fetch(`/api/auth/check-email?email=${encodeURIComponent(trimmed)}`);
      if (r.ok) {
        const j = await r.json();
        if (j?.exists === true) {
          const providers: string[] = Array.isArray(j.providers) ? j.providers : [];
          const hasGoogle = providers.includes("google");
          setError(hasGoogle ? "This email is already registered via Google. Please use 'Continue with Google' on the sign-in page." : "This email is already registered. Please sign in or reset your password.");
          return;
        }
      }
    } catch {}
    setSendingOtp(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const siteUrl = ((typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || "")) as string).replace(/\/$/, "");
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (error) {
        const msg = error.message || "Failed to send verification code.";
        setError(msg);
        if (/rate\s*limit/i.test(msg)) {
          startCooldown(60);
        }
        return;
      }
      setOtpSent(true);
      setInfo("Verification code sent to your email.");
      startCooldown(60);
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    } finally {
      setSendingOtp(false);
    }
  }

  async function verifyEmailCode() {
    setError(null);
    setInfo(null);
    const trimmed = String(email || "").trim();
    const code = String(otpCode || "").trim();
    if (!code) {
      setError("Enter the code you received.");
      return;
    }
    setVerifyingOtp(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email: trimmed,
        token: code,
        type: 'email',
      });
      if (error) {
        setError(error.message || "Invalid code. Try again.");
        return;
      }
      if (!data?.session) {
        setError("Verification succeeded but no session was created. Please resend the code.");
        return;
      }
      setEmailVerified(true);
      setInfo("Email verified successfully.");
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    } finally {
      setVerifyingOtp(false);
    }
  }

  function onDocFileChange(file: File | null) {
    setDocFile(file);
    try {
      if (docPreview) URL.revokeObjectURL(docPreview);
    } catch {}
    setDocPreview(file ? URL.createObjectURL(file) : "");
  }

  async function uploadIdentityDocument(kind: 'aadhaar' | 'pan', file: File): Promise<string> {
    const supabase = getSupabaseBrowserClient();
    const { data: sessionRes } = await supabase.auth.getSession();
    if (!sessionRes?.session) throw new Error("Session expired. Please verify your email again.");
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) throw new Error("Not signed in");
    const emailAddr = (user.email || email || "user").toLowerCase();
    const safe = emailAddr.replace(/[^a-z0-9._-]/gi, "_");
    const ext = (file.name.split(".").pop() || (file.type?.includes("png") ? "png" : file.type?.includes("jpeg") ? "jpg" : file.type?.includes("pdf") ? "pdf" : "jpg"));
    const path = `${kind}/${safe}.${ext}`;
    const bucket = "PAN-Aadhar";
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    return pub.publicUrl;
  }


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!fullName || !email || !password || !confirm) {
      setError("Please fill full name, email, and password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!emailVerified) {
      setError("Please verify your email to continue.");
      return;
    }
    if (!docFile && !docUrl) {
      setError("Please upload Aadhaar or PAN to continue.");
      return;
    }
    if (!phone) {
      setError("Phone number is required.");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionRes } = await supabase.auth.getSession();
      if (!sessionRes?.session) {
        setError("Session expired. Please verify your email again.");
        return;
      }
      const { error: updErr } = await supabase.auth.updateUser({
        password,
        data: { full_name: fullName, name: fullName, phone, city },
      });
      if (updErr) {
        setError(updErr.message || "Failed to set password.");
        return;
      }
      // Upload identity document
      let storedUrl = docUrl;
      if (docFile && emailVerified) {
        setDocUploading(true);
        try {
          storedUrl = await uploadIdentityDocument(docChoice, docFile);
          setDocUrl(storedUrl);
        } finally {
          setDocUploading(false);
        }
      }
      // Upsert to Profile-Table with document URL so future sign-ins won't be prompted
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes?.user;
        if (user && storedUrl) {
          const payloadBase: Record<string, any> = {
            name: fullName || "",
            full_name: fullName || "",
            phone: phone || "",
            city: city || "",
          };
          if (docChoice === 'aadhaar') payloadBase.aadhaar_url = storedUrl;
          else payloadBase.pan_url = storedUrl;
          const attempt = async (key: "user_id" | "id", payload: Record<string, any>) =>
            supabase.from("Profile-Table").upsert({ [key]: user.id, ...payload }, { onConflict: key }).select("*");
          let ok = await attempt("user_id", payloadBase);
          if (ok.error) ok = await attempt("id", payloadBase);
        }
      } catch {}
      window.location.assign("/profile/edit");
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }


  async function onGoogleSignUp() {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();
    try { sessionStorage.setItem("ayya.auth.next", "/profile/edit"); } catch {}
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");
    const redirectTo = `${siteUrl}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) alert(error.message);
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Hero */}
      <section className="relative">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: "url('/b1.jpeg')" }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-amber-700/40 via-amber-800/40 to-background/95" />
        <div className="mx-auto max-w-5xl px-6 pt-28 pb-10 text-center">
          <h1 className="animate-element text-3xl md:text-5xl font-bold tracking-tight text-white">
            Join the Sree Sabari Sastha Seva Samithi (SSSSS) Community
          </h1>
          <p className="animate-element animate-delay-200 mt-3 text-white/90 md:text-lg">
            Sign up to receive event updates, devotional content, and special announcements.
          </p>
        </div>
      </section>

      {/* Signup form */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-10">
          <form onSubmit={onSubmit} className="animate-element rounded-2xl border border-border bg-card/70 p-6 shadow-sm">
            <h2 className="text-xl md:text-2xl font-semibold">Create your account</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Full Name" required>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
              </Field>
              <Field label="Email" required>
                <div className="flex gap-2 items-center">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  {emailVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-600/30 bg-emerald-600/10 px-2.5 py-1 text-[12px] text-emerald-600">
                      <CheckCircle className="h-4 w-4" /> Verified
                    </span>
                  ) : (
                  <button
                      type="button"
                      onClick={sendEmailOtp}
                    disabled={sendingOtp || !email || resendSeconds > 0}
                      className="inline-flex items-center rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary disabled:opacity-60"
                    >
                      {sendingOtp ? "Sending…" : (otpSent ? (resendSeconds > 0 ? `Resend ${resendSeconds}s` : "Resend") : "Verify")}
                    </button>
                  )}
                </div>
                {otpSent && !emailVerified && (
                  <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                    <Input inputMode="numeric" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Enter code" />
                    <button
                      type="button"
                      onClick={verifyEmailCode}
                      disabled={verifyingOtp || !otpCode}
                      className="inline-flex items-center rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary disabled:opacity-60"
                    >
                      {verifyingOtp ? "Verifying…" : "Confirm"}
                    </button>
                  </div>
                )}
              </Field>
              <Field label="Password" required>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" />
              </Field>
              <Field label="Confirm Password" required>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" />
              </Field>
              <Field label="Phone Number" required>
                <Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91" required />
              </Field>
              <Field label="City">
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Your city" />
              </Field>
              <div className="md:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Identity Document *</span>
                <div className="mt-2 flex items-center gap-6 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="docChoice" value="aadhaar" checked={docChoice === 'aadhaar'} onChange={() => setDocChoice('aadhaar')} />
                    Aadhaar
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="docChoice" value="pan" checked={docChoice === 'pan'} onChange={() => setDocChoice('pan')} />
                    PAN
                  </label>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  {docPreview ? (
                    docPreview.endsWith('.pdf') ? (
                      <a href={docPreview} target="_blank" rel="noopener noreferrer" className="text-xs underline">View file</a>
                    ) : (
                      <img src={docPreview} alt="Document" className="h-16 w-16 rounded object-cover ring-1 ring-border" />
                    )
                  ) : null}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => onDocFileChange(e.target.files?.[0] || null)}
                    className="w-full cursor-pointer rounded-xl bg-white/5 px-4 py-2.5 text-sm ring-1 ring-border file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm hover:file:bg-white/20 focus:ring-2 focus:outline-none"
                    aria-label="Upload identity document"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Upload an image or PDF (max ~5MB). Either Aadhaar or PAN is required.</p>
              </div>
            </div>

            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            {info ? <p className="mt-3 text-sm text-emerald-600">{info}</p> : null}

            <p className="mt-4 text-xs text-muted-foreground">Your details are safe with us — used only for Samithi communication.</p>

            <div className="mt-6 flex justify-center">
              <GradientButton className="min-w-[220px] text-[17px]" disabled={loading || !emailVerified || (!docFile && !docUrl) || docUploading}>{loading ? "Creating…" : (docUploading ? "Uploading…" : "Create Account")}</GradientButton>
            </div>

            <div className="mt-6 relative flex items-center justify-center">
              <span className="w-full border-t border-border"></span>
              <span className="absolute bg-background px-3 text-xs text-muted-foreground">Or continue with</span>
            </div>
            <button
              type="button"
              onClick={onGoogleSignUp}
              className="mt-4 w-full inline-flex items-center justify-center gap-3 rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </form>
      </section>

      {/* Community benefits */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          <Benefit icon={<CalendarDays className="h-5 w-5" />} title="Know dates early" desc="Be notified about opening/closing dates and festival schedules." />
          <Benefit icon={<BookOpenText className="h-5 w-5" />} title="Devotional content" desc="Receive slokas and updates in your language." />
          <Benefit icon={<HeartHandshake className="h-5 w-5" />} title="Support sevas" desc="Stay informed about annadanam and donation drives." />
        </div>
      </section>

      {/* Footer links */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-20 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link className="underline underline-offset-2" href="/privacy">Privacy Policy</Link>
          <span className="opacity-40">•</span>
          <Link className="underline underline-offset-2" href="/contact">Contact</Link>
          <span className="opacity-40">•</span>
          <Link className="underline underline-offset-2" href="/donate">Donate</Link>
        </div>
      </section>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-left">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}{required ? " *" : ""}</span>
      {children}
    </label>
  );
}

// Preferences UI removed

function Benefit({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-5 text-left shadow-sm">
      <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-amber-600/10 px-3 py-1 text-amber-600">
        {icon} <span className="text-xs font-medium">Community</span>
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
