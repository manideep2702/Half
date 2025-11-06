"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAlert } from "@/components/ui/alert-provider";

export default function ProfileEditorForm({ initialValue, onSave, onCancel, onImageFileUpload, onAadhaarUpload, onPanUpload }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [designation, setDesignation] = useState(initialValue?.designation || "");
  const [tagline, setTagline] = useState(initialValue?.tagline || "");
  const [imageUrl, setImageUrl] = useState(initialValue?.imageUrl || "");
  const [aadhaarUrl, setAadhaarUrl] = useState(initialValue?.aadhaarUrl || "");
  const [panUrl, setPanUrl] = useState(initialValue?.panUrl || "");
  const [docChoice, setDocChoice] = useState((initialValue?.aadhaarUrl ? 'aadhaar' : (initialValue?.panUrl ? 'pan' : 'aadhaar')));
  const [saving, setSaving] = useState(false);
  const { show } = useAlert();
  // Details/About/Highlights removed per request

  const [errors, setErrors] = useState({});

  // Initialize text fields once from initialValue (prevents wiping user input on image upload)
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    const hasAny = !!(initialValue?.name || initialValue?.designation || initialValue?.tagline);
    if (!hasAny) return;
    const full = String(initialValue?.name || "").trim();
    if (full) {
      const parts = full.split(/\s+/);
      const first = parts.shift() || "";
      const last = parts.join(" ");
      setFirstName(first);
      setLastName(last);
    } else {
      setFirstName("");
      setLastName("");
    }
    setDesignation(initialValue?.designation || "");
    setTagline(initialValue?.tagline || "");
    hydratedRef.current = true;
  }, [initialValue?.name, initialValue?.designation, initialValue?.tagline]);

  // Reflect external changes for image/doc URLs but do not override text fields
  useEffect(() => {
    setImageUrl(initialValue?.imageUrl || "");
    setAadhaarUrl(initialValue?.aadhaarUrl || "");
    setPanUrl(initialValue?.panUrl || "");
    setDocChoice((initialValue?.aadhaarUrl ? 'aadhaar' : (initialValue?.panUrl ? 'pan' : 'aadhaar')));
  }, [initialValue?.imageUrl, initialValue?.aadhaarUrl, initialValue?.panUrl]);

  const onFileChange = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith?.("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      alert("Image too large. Max 4MB.");
      return;
    }
    try {
      if (typeof onImageFileUpload === "function") {
        const url = await onImageFileUpload(file);
        if (url) {
          setImageUrl(url);
          return;
        }
      }
    } catch (e) {
      console.warn("Upload failed; falling back to preview only.", e);
    }
    // Fallback to data URL preview only
    const reader = new FileReader();
    reader.onload = () => setImageUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs = {};
    const hasImage = !!(imageUrl || initialValue?.imageUrl);
    if (!firstName.trim()) errs.firstName = "First name is required";
    if (!designation.trim()) errs.designation = "Designation is required";
    // tagline optional
    if (!hasImage) errs.imageUrl = "Profile photo is required";
    if (!(aadhaarUrl || panUrl)) errs.document = "Upload either Aadhaar or PAN";
    return { errs };
  };

  const save = async () => {
    const { errs } = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      try {
        // Scroll to first error field for better UX
        const firstKey = Object.keys(errs)[0];
        const el = document.querySelector(`[data-field="${firstKey}"]`);
        if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {}
      try { show({ title: "Fix form errors", description: "Upload Aadhaar or PAN and fill required fields.", variant: "warning" }); } catch {}
      return;
    }
    const fullName = `${firstName} ${lastName}`.trim();
    const next = {
      ...initialValue,
      name: fullName || initialValue?.name || "",
      designation: designation.trim(),
      tagline: tagline.trim(),
      imageUrl: imageUrl || initialValue?.imageUrl || "",
      aadhaarUrl: aadhaarUrl || initialValue?.aadhaarUrl || "",
      panUrl: panUrl || initialValue?.panUrl || "",
      // Details removed
    };
    try {
      setSaving(true);
      await onSave?.(next);
      try { show({ title: "Saved", description: "Profile updated successfully.", variant: "success" }); } catch {}
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card/70 p-6 md:p-8 shadow-sm" aria-labelledby="profile-editor-title">
      <h2 id="profile-editor-title" className="text-xl md:text-2xl font-bold text-foreground">Profile Settings</h2>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        <label className="block text-left">
          <span className="mb-1 block text-xs font-medium text-foreground">First Name *</span>
          <input
            data-field="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-border placeholder:text-muted-foreground focus:ring-2 focus:outline-none"
            placeholder="Your first name"
            required
          />
          {errors.firstName && <p className="mt-1 text-xs text-red-400">{errors.firstName}</p>}
        </label>
        <label className="block text-left">
          <span className="mb-1 block text-xs font-medium text-foreground">Last Name</span>
          <input
            data-field="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-border placeholder:text-muted-foreground focus:ring-2 focus:outline-none"
            placeholder="Your last name (optional)"
          />
        </label>
        <label className="block text-left">
          <span className="mb-1 block text-xs font-medium text-foreground">Designation *</span>
          <input
            data-field="designation"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-border placeholder:text-muted-foreground focus:ring-2 focus:outline-none"
            placeholder="Trustee, Devotee, Priest, ..."
            required
          />
          {errors.designation && <p className="mt-1 text-xs text-red-400">{errors.designation}</p>}
        </label>
        <label className="md:col-span-2 block text-left">
          <span className="mb-1 block text-xs font-medium text-foreground">Tagline (optional)</span>
          <input
            data-field="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-border placeholder:text-muted-foreground focus:ring-2 focus:outline-none"
            placeholder="Swamiye Saranam Ayyappa"
          />
          {/* Tagline optional; no error */}
        </label>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-[auto_1fr] items-center gap-4">
          <div className="shrink-0">
            {imageUrl || initialValue?.imageUrl ? (
              <img
                src={(imageUrl || initialValue?.imageUrl) || undefined}
                alt="Current profile"
                className="h-24 w-24 rounded-full object-cover ring-2 ring-[#D4AF37]"
              />
            ) : (
              <div
                aria-label="No profile photo"
                className="h-24 w-24 rounded-full ring-2 ring-[#D4AF37] bg-white/10 animate-pulse"
              />
            )}
          </div>
          <label className="block text-left">
            <span className="mb-1 block text-xs font-medium text-foreground">Profile Photo *</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              className="w-full cursor-pointer rounded-xl bg-white/5 px-4 py-2.5 text-sm ring-1 ring-border file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm hover:file:bg-white/20 focus:ring-2 focus:outline-none"
              aria-label="Upload profile photo"
            />
            <p className="mt-1 text-xs text-muted-foreground">Max 4MB. JPG/PNG recommended.</p>
            {errors.imageUrl && <p className="mt-1 text-xs text-red-400">{errors.imageUrl}</p>}
          </label>
        </div>

        {/* Identity document selection (upload Aadhaar OR PAN) */}
        <div className="md:col-span-2 mt-4">
          <span className="mb-1 block text-xs font-medium text-foreground">Identity Document *</span>
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
            {docChoice === 'aadhaar' ? (
              aadhaarUrl ? (
                aadhaarUrl.endsWith('.pdf') ? (
                  <a href={aadhaarUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline">View file</a>
                ) : (
                  <img src={aadhaarUrl} alt="Aadhaar" className="h-16 w-16 rounded object-cover ring-1 ring-border" />
                )
              ) : null
            ) : (
              panUrl ? (
                panUrl.endsWith('.pdf') ? (
                  <a href={panUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline">View file</a>
                ) : (
                  <img src={panUrl} alt="PAN" className="h-16 w-16 rounded object-cover ring-1 ring-border" />
                )
              ) : null
            )}
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  if (docChoice === 'aadhaar') {
                    if (typeof onAadhaarUpload === 'function') {
                      const url = await onAadhaarUpload(f);
                      setAadhaarUrl(url);
                    }
                  } else {
                    if (typeof onPanUpload === 'function') {
                      const url = await onPanUpload(f);
                      setPanUrl(url);
                    }
                  }
                } catch (err) {
                  alert((err?.message || 'Upload failed').toString());
                }
              }}
              className="w-full cursor-pointer rounded-xl bg-white/5 px-4 py-2.5 text-sm ring-1 ring-border file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm hover:file:bg-white/20 focus:ring-2 focus:outline-none"
              aria-label="Upload identity document"
            />
          </div>
          {errors.document && <p className="mt-1 text-xs text-red-400">{errors.document}</p>}
          <p className="mt-1 text-xs text-muted-foreground">Choose Aadhaar or PAN and upload an image or PDF (max 5MB). Only one is required.</p>
        </div>

        {/* About/Highlights removed per request */}

        <div className="md:col-span-2 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-amber-600 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
            aria-label="Save profile"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => {
              const full = String(initialValue?.name || "").trim();
              if (full) {
                const parts = full.split(/\s+/);
                const first = parts.shift() || "";
                const last = parts.join(" ");
                setFirstName(first);
                setLastName(last);
              } else {
                setFirstName("");
                setLastName("");
              }
              setDesignation(initialValue?.designation || "");
              setTagline(initialValue?.tagline || "");
              setImageUrl(initialValue?.imageUrl || "");
              onCancel?.();
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium ring-1 ring-border text-foreground"
            aria-label="Cancel editing"
          >
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}
