"use client";

import React, { useEffect, useState } from "react";
import { useAlert } from "@/components/ui/alert-provider";

export default function ProfileEditorForm({ initialValue, onSave, onCancel, onImageFileUpload, onAadhaarUpload, onPanUpload }) {
  const [name, setName] = useState(initialValue?.name || "");
  const [designation, setDesignation] = useState(initialValue?.designation || "");
  const [tagline, setTagline] = useState(initialValue?.tagline || "");
  const [imageUrl, setImageUrl] = useState(initialValue?.imageUrl || "");
  const [aadhaarUrl, setAadhaarUrl] = useState(initialValue?.aadhaarUrl || "");
  const [panUrl, setPanUrl] = useState(initialValue?.panUrl || "");
  const [docChoice, setDocChoice] = useState((initialValue?.aadhaarUrl ? 'aadhaar' : (initialValue?.panUrl ? 'pan' : 'aadhaar')));
  const [saving, setSaving] = useState(false);
  const { show } = useAlert();
  const [bioParagraphs, setBioParagraphs] = useState(
    Array.isArray(initialValue?.bioParagraphs) && initialValue.bioParagraphs.length > 0
      ? initialValue.bioParagraphs
      : [""]
  );
  const [highlights, setHighlights] = useState(
    Array.isArray(initialValue?.highlights) && initialValue.highlights.length > 0
      ? initialValue.highlights
      : [""]
  );

  // Details section removed per request

  const [errors, setErrors] = useState({});

  useEffect(() => {
    setName(initialValue?.name || "");
    setDesignation(initialValue?.designation || "");
    setTagline(initialValue?.tagline || "");
    setImageUrl(initialValue?.imageUrl || "");
    setAadhaarUrl(initialValue?.aadhaarUrl || "");
    setPanUrl(initialValue?.panUrl || "");
    setDocChoice((initialValue?.aadhaarUrl ? 'aadhaar' : (initialValue?.panUrl ? 'pan' : 'aadhaar')));
    setBioParagraphs(
      Array.isArray(initialValue?.bioParagraphs) && initialValue.bioParagraphs.length > 0
        ? initialValue.bioParagraphs
        : [""]
    );
    setHighlights(
      Array.isArray(initialValue?.highlights) && initialValue.highlights.length > 0
        ? initialValue.highlights
        : [""]
    );
  }, [initialValue]);

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

  const normalize = (arr) => arr.map((s) => String(s ?? "").trim()).filter((s) => s);

  const validate = () => {
    const errs = {};
    const normalizedBios = normalize(bioParagraphs);
    const normalizedHighlights = normalize(highlights);
    const hasImage = !!(imageUrl || initialValue?.imageUrl);
    if (!name.trim()) errs.name = "Full name is required";
    if (!designation.trim()) errs.designation = "Designation is required";
    if (!tagline.trim()) errs.tagline = "Tagline is required";
    if (!hasImage) errs.imageUrl = "Profile photo is required";
    if (!(aadhaarUrl || panUrl)) errs.document = "Upload either Aadhaar or PAN";
    if (normalizedBios.length === 0) errs.bioParagraphs = "At least one bio paragraph is required";
    if (normalizedHighlights.length === 0) errs.highlights = "At least one highlight is required";
    return { errs, normalizedBios, normalizedHighlights };
  };

  const save = async () => {
    const { errs, normalizedBios, normalizedHighlights } = validate();
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
    const next = {
      ...initialValue,
      name: name.trim() || initialValue?.name || "",
      designation: designation.trim(),
      tagline: tagline.trim(),
      imageUrl: imageUrl || initialValue?.imageUrl || "",
      aadhaarUrl: aadhaarUrl || initialValue?.aadhaarUrl || "",
      panUrl: panUrl || initialValue?.panUrl || "",
      bioParagraphs: normalizedBios,
      highlights: normalizedHighlights,
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
          <span className="mb-1 block text-xs font-medium text-foreground">Full Name *</span>
          <input
            data-field="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-border placeholder:text-muted-foreground focus:ring-2 focus:outline-none"
            placeholder="Your full name"
            required
          />
          {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
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
          <span className="mb-1 block text-xs font-medium text-foreground">Tagline *</span>
          <input
            data-field="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-border placeholder:text-muted-foreground focus:ring-2 focus:outline-none"
            placeholder="Swamiye Saranam Ayyappa"
            required
          />
          {errors.tagline && <p className="mt-1 text-xs text-red-400">{errors.tagline}</p>}
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

        {/* About section */}
        <div className="md:col-span-2 mt-6">
          <h3 className="text-lg font-semibold text-foreground">About</h3>
          <p className="text-xs text-muted-foreground">Update biography and highlights.</p>
        </div>

        <div className="md:col-span-2 grid gap-3">
          {bioParagraphs.map((p, i) => (
            <div key={i} className="grid gap-1">
              <label className="text-xs font-medium text-foreground">Paragraph {i + 1} *</label>
              <textarea
                rows={3}
                value={p}
                onChange={(e) => {
                  const next = [...bioParagraphs];
                  next[i] = e.target.value;
                  setBioParagraphs(next);
                }}
                className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-border placeholder:text-muted-foreground focus:ring-2 focus:outline-none"
                placeholder="Type a short paragraph..."
              />
              <div className="flex justify-end">
                {bioParagraphs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setBioParagraphs(bioParagraphs.filter((_, idx) => idx !== i))}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          <div>
            <button
              type="button"
              onClick={() => setBioParagraphs([...bioParagraphs, ""])}
              className="rounded-md px-3 py-1.5 text-xs ring-1 ring-border text-foreground hover:bg-white/5"
            >
              + Add paragraph
            </button>
            {errors.bioParagraphs && <p className="mt-2 text-xs text-red-400">{errors.bioParagraphs}</p>}
          </div>
        </div>

        {/* Video URL removed per request */}

        <div className="md:col-span-2 grid gap-3">
          <label className="text-xs font-medium text-foreground">Highlights *</label>
          {highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                data-field={i === 0 ? "highlights" : undefined}
                value={h}
                onChange={(e) => {
                  const next = [...highlights];
                  next[i] = e.target.value;
                  setHighlights(next);
                }}
                className="flex-1 rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-border placeholder:text-muted-foreground focus:ring-2 focus:outline-none"
                placeholder="e.g., 12+ years of seva"
              />
              <button
                type="button"
                onClick={() => setHighlights(highlights.filter((_, idx) => idx !== i))}
                className="rounded-md px-2 py-1 text-xs ring-1 ring-border text-foreground hover:bg-white/5"
              >
                Remove
              </button>
            </div>
          ))}
          <div>
            <button
              type="button"
              onClick={() => setHighlights([...highlights, ""])}
              className="rounded-md px-3 py-1.5 text-xs ring-1 ring-border text-foreground hover:bg-white/5"
            >
              + Add highlight
            </button>
            {errors.highlights && <p className="mt-2 text-xs text-red-400">{errors.highlights}</p>}
          </div>
        </div>

        {/* Details section removed per request */}

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
              setName(initialValue?.name || "");
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
