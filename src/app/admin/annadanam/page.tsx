"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAlert } from "@/components/ui/alert-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import AdminGuard from "../_components/AdminGuard";
import { createTablePDF } from "../_components/pdf";

export default function AdminAnnadanamPage() {
  const [annaDate, setAnnaDate] = useState<string>("");
  const [annaSession, setAnnaSession] = useState<string>("all");
  const [rows, setRows] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { show } = useAlert();

  // Mark bookings that have already completed based on date + session end time
  const hasCompleted = (dateStr?: string, session?: string) => {
    if (!dateStr || !session) return false;
    // session format: "H:MM AM - H:MM PM"
    const endPart = (session.split("-")[1] || "").trim();
    const m = endPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return new Date(dateStr) < new Date(new Date().toISOString().slice(0,10));
    let [_, hh, mm, ap] = m;
    let h = parseInt(hh, 10) % 12; // 12 -> 0 initially
    if (ap.toUpperCase() === "PM") h += 12;
    const end = new Date(dateStr + "T00:00:00");
    if (Number.isNaN(end.getTime())) return false;
    end.setHours(h, parseInt(mm, 10), 0, 0);
    return new Date() >= end;
  };

  const toCSV = (data: any[], headers: string[], filename: string) => {
    const esc = (v: unknown) => {
      const s = (v ?? "").toString();
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [headers.join(",")];
    for (const r of data) lines.push(headers.map((h) => esc((r as any)[h])).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toJSONFile = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: s } = await supabase.auth.getSession();
      const token = s?.session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/annadanam/list", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: annaDate, session: annaSession }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        throw new Error(j?.error || `Request failed (${res.status})`);
      }
      const j = await res.json();
      const r: any[] = Array.isArray(j?.rows) ? j.rows : [];
      setRows(r);
      if (r.length === 0) show({ title: "No results", description: "No Annadanam bookings match the filters.", variant: "info" });
    } catch (e: any) {
      setError(e?.message || "Failed to load Annadanam bookings");
      setRows(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!rows || rows.length === 0) { alert("Nothing to download. Load Annadanam bookings first."); return; }
    await createTablePDF(
      "Annadanam Bookings",
      annaDate || undefined,
      [
        { key: "date", label: "Date", w: 90 },
        { key: "session", label: "Session", w: 120, align: "center" },
        { key: "name", label: "Name", w: 180 },
        { key: "email", label: "Email", w: 220 },
        { key: "phone", label: "Phone", w: 120 },
      ],
      rows,
      `annadanam-bookings${annaDate ? `-${annaDate}` : ""}`
    );
  };

  return (
    <AdminGuard>
      <main className="min-h-screen p-6 md:p-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold text-center">Annadanam</h1>
          <div className="mt-2 flex justify-between">
            <button onClick={() => router.push("/admin")} className="rounded border px-3 py-1.5">Back</button>
          </div>

          <div className="rounded-xl border p-6 space-y-4 bg-card/70 mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm" htmlFor="annaDate">Date</label>
                <input id="annaDate" type="date" className="w-full rounded border px-3 py-2 bg-background" value={annaDate} onChange={(e)=>setAnnaDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm" htmlFor="annaSession">Timing</label>
                <select id="annaSession" className="w-full rounded border px-3 py-2 bg-background" value={annaSession} onChange={(e)=>setAnnaSession(e.target.value)}>
                  <option value="all">All Timings</option>
                  <option>12:45 PM - 1:30 PM</option>
                  <option>1:30 PM - 2:00 PM</option>
                  <option>2:00 PM - 2:30 PM</option>
                  <option>2:30 PM - 3:00 PM</option>
                  <option>8:00 PM - 8:30 PM</option>
                  <option>8:30 PM - 9:00 PM</option>
                  <option>9:00 PM - 9:30 PM</option>
                  <option>9:30 PM - 10:00 PM</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2 flex-wrap">
              <button onClick={load} disabled={loading} className="rounded bg-black text-white px-4 py-2">{loading ? "Loading…" : "Load Bookings"}</button>
              <button onClick={() => rows && toJSONFile(rows, `annadanam-bookings${annaDate?`-${annaDate}`:``}.json`)} className="rounded border px-4 py-2">Download JSON</button>
              <button onClick={() => rows && toCSV(rows, ["date","session","name","email","phone","qty","status","user_id","created_at"], `annadanam-bookings${annaDate?`-${annaDate}`:""}.csv`)} className="rounded border px-4 py-2">Download CSV</button>
              <button onClick={downloadPDF} className="rounded border px-4 py-2">Download PDF</button>
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            {Array.isArray(rows) && (
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50"><tr>
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                    <th className="px-3 py-2 text-left font-medium">Session</th>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Email</th>
                    <th className="px-3 py-2 text-left font-medium">Phone</th>
                    <th className="px-3 py-2 text-left font-medium">Qty</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Created</th>
                  </tr></thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr><td className="px-3 py-3" colSpan={8}>No records.</td></tr>
                    ) : (
                      rows.map((r, i) => {
                        const completed = hasCompleted(r.date, r.session);
                        return (
                        <tr key={i} className="border-t">
                          <td className={`px-3 py-2 ${completed ? 'line-through text-muted-foreground' : ''}`}>{r.date}</td>
                          <td className={`px-3 py-2 ${completed ? 'line-through text-muted-foreground' : ''}`}>{r.session}</td>
                          <td className="px-3 py-2">{r.name}</td>
                          <td className="px-3 py-2">{r.email}</td>
                          <td className="px-3 py-2">{r.phone}</td>
                          <td className="px-3 py-2">{r.qty}</td>
                          <td className="px-3 py-2">{r.status}</td>
                          <td className="px-3 py-2">{r.created_at?.slice(0,19).replace('T',' ')}</td>
                        </tr>
                      );})
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </AdminGuard>
  );
}
