"use client";

import { useEffect, useState } from "react";
import { useAlert } from "@/components/ui/alert-provider";
import { useRouter } from "next/navigation";
import ProfileEditorForm from "@/components/profile/ProfileEditorForm";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import RequireAuth from "@/components/auth/require-auth";

type ProfileData = {
  name?: string;
  designation?: string;
  tagline?: string;
  imageUrl?: string;
  bioParagraphs?: string[];
  highlights?: string[];
  aadhaarUrl?: string;
  panUrl?: string;
};

export default function EditProfilePage() {
  const router = useRouter();
  const { show } = useAlert();
  const [value, setValue] = useState<ProfileData>({
    name: "",
    designation: "",
    tagline: "",
    imageUrl: "",
    bioParagraphs: [""],
    highlights: [""],
    aadhaarUrl: "",
    panUrl: "",
  });
  const [showIdentityUpload, setShowIdentityUpload] = useState(false);

  useEffect(() => {
    const run = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user) {
        router.replace("/sign-in/?next=/profile/edit/");
        return;
      }
      // Determine if this is a manual (email/password) account
      let isManual = false;
      try {
        const identities: any[] = Array.isArray((user as any)?.identities) ? (user as any).identities : [];
        isManual = identities.some((i) => i?.provider === "email");
      } catch { isManual = false; }
      // Prefill defaults from auth metadata/email so the name shows by default
      try {
        const metaName = String((user.user_metadata?.full_name || user.user_metadata?.name || "") as string).trim();
        const emailName = String(user.email || "").split("@")[0] || "";
        const fallbackName = metaName || emailName || "";
        setValue((prev) => ({ ...prev, name: prev.name || fallbackName }));
      } catch {}
      // Load profile from Supabase if present
      // Try by user_id first; fallback to id for older schemas
      let { data, error } = await supabase
        .from("Profile-Table")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !data) {
        const second = await supabase
          .from("Profile-Table")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        data = second.data as any;
        error = second.error as any;
      }
      if (!error && data) {
        setValue((prev) => ({
          ...prev,
          name: (data.name || data.full_name || prev.name) as string,
          designation: (data.designation || prev.designation) as string,
          tagline: (data.tagline || prev.tagline) as string,
          imageUrl: (data.image_url || data.avatar_url || prev.imageUrl) as string,
          bioParagraphs: Array.isArray(data.bio_paragraphs) ? (data.bio_paragraphs as string[]) : prev.bioParagraphs,
          highlights: Array.isArray(data.highlights) ? (data.highlights as string[]) : prev.highlights,
          aadhaarUrl: (data.aadhaar_url || data.aadhar_url || prev.aadhaarUrl || "") as string,
          panUrl: (data.pan_url || prev.panUrl || "") as string,
        }));
        try {
          const hasDoc = Boolean((data as any).aadhaar_url || (data as any).aadhar_url || (data as any).pan_url);
          // Hide identity upload for manual email/password users, or when a document already exists
          setShowIdentityUpload(isManual ? false : !hasDoc);
        } catch {
          setShowIdentityUpload(true);
        }
      }
      if (!data) {
        // No profile row yet → show identity upload by default for Google sign-ins
        setShowIdentityUpload(isManual ? false : true);
      }
    };
    run();
  }, [router]);

  

  const handleSave = async (next: ProfileData) => {
    const supabase = getSupabaseBrowserClient();
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      router.replace("/sign-in/?next=/profile/edit/");
      return;
    }
    const payloadBase = {
      name: next.name || "",
      full_name: next.name || "",
      designation: next.designation || "",
      tagline: next.tagline || "",
      avatar_url: next.imageUrl || "",
      image_url: next.imageUrl || "",
      aadhaar_url: next.aadhaarUrl || "",
      pan_url: next.panUrl || "",
      bio_paragraphs: Array.isArray(next.bioParagraphs) ? next.bioParagraphs : [],
      highlights: Array.isArray(next.highlights) ? next.highlights : [],
    } as Record<string, any>;

    // Try upsert using user_id, fallback to id. If unknown columns, retry with minimal payload.
    const attempt = async (key: "user_id" | "id", payload: Record<string, any>) =>
      supabase.from("Profile-Table").upsert({ [key]: user.id, ...payload }, { onConflict: key }).select("*");

    let ok = await attempt("user_id", payloadBase);
    if (ok.error) ok = await attempt("id", payloadBase);
    if (ok.error) {
      const minimal = {
        name: payloadBase.name,
        full_name: payloadBase.full_name,
        designation: payloadBase.designation,
        tagline: payloadBase.tagline,
        avatar_url: payloadBase.avatar_url,
        image_url: payloadBase.image_url,
        bio_paragraphs: payloadBase.bio_paragraphs,
        highlights: payloadBase.highlights,
      } as Record<string, any>;
      ok = await attempt("user_id", minimal);
      if (ok.error) ok = await attempt("id", minimal);
    }
    if (ok.error) {
      show({ title: "Save failed", description: ok.error.message, variant: "error" });
      return;
    }
    show({ title: "Profile updated", description: "Your changes have been saved.", variant: "success" });
    try {
      const url = new URL(window.location.href);
      const nextUrl = url.searchParams.get('next');
      router.push(nextUrl || "/");
    } catch {
      router.push("/");
    }
  };

  const handleCancel = () => {
    router.back();
  };

  async function handleUpload(file: File): Promise<string> {
    const supabase = getSupabaseBrowserClient();
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) throw new Error("Not signed in");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `avatars/${user.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: false, cacheControl: "3600" });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    // Best-effort: store photo record under the user's id for history
    try {
      await supabase.from("profile_photos").insert({ user_id: user.id, url });
    } catch {}
    // Reflect the new image immediately in the form by updating local state
    setValue((v) => ({ ...v, imageUrl: url }));
    return url;
  }

  async function uploadToPanAadhaarBucket(kind: "aadhaar" | "pan", file: File): Promise<string> {
    const supabase = getSupabaseBrowserClient();
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) throw new Error("Not signed in");
    const email = (user.email || "user").toLowerCase();
    const safe = email.replace(/[^a-z0-9._-]/gi, "_");
    const ext = (file.name.split(".").pop() || (file.type?.includes("png") ? "png" : file.type?.includes("jpeg") ? "jpg" : "jpg"));
    const path = `${kind}/${safe}.${ext}`;
    const bucket = "PAN-Aadhar"; // public bucket created by user
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    return pub.publicUrl;
  }

  async function handleAadhaarUpload(file: File): Promise<string> {
    if (!file) throw new Error("No file provided");
    // Basic guard: up to 5MB, image or pdf accepted
    if (!(file.type?.startsWith("image/") || file.type === "application/pdf")) {
      throw new Error("Please upload an image or PDF");
    }
    if (file.size > 5 * 1024 * 1024) throw new Error("Max file size 5MB");
    const url = await uploadToPanAadhaarBucket("aadhaar", file);
    setValue((v) => ({ ...v, aadhaarUrl: url }));
    return url;
  }

  async function handlePanUpload(file: File): Promise<string> {
    if (!file) throw new Error("No file provided");
    if (!(file.type?.startsWith("image/") || file.type === "application/pdf")) {
      throw new Error("Please upload an image or PDF");
    }
    if (file.size > 5 * 1024 * 1024) throw new Error("Max file size 5MB");
    const url = await uploadToPanAadhaarBucket("pan", file);
    setValue((v) => ({ ...v, panUrl: url }));
    return url;
  }

  return (
    <RequireAuth>
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-4 pt-28 pb-12">
          <div className="mb-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md px-3 py-1.5 text-sm ring-1 ring-border text-foreground hover:bg-white/5"
            >
              ← Back
            </button>
          </div>
          <ProfileEditorForm
            initialValue={value}
            onSave={handleSave}
            onCancel={handleCancel}
            onImageFileUpload={handleUpload}
            onAadhaarUpload={handleAadhaarUpload}
            onPanUpload={handlePanUpload}
            showIdentityUpload={showIdentityUpload}
          />
        </div>
      </main>
    </RequireAuth>
  );
}
