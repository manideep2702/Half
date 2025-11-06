"use client";

import { useEffect, useMemo, useState } from "react";
import { useAlert } from "@/components/ui/alert-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import AdminGuard from "@/app/admin/_components/AdminGuard";
import { useRouter } from "next/navigation";

type BlockItem = { date: string; session: string };

export default function PoojaBlockPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<BlockItem[]>([]);
  const [date, setDate] = useState("");
  const [session, setSession] = useState<string>("");
  const { show } = useAlert();
  const router = useRouter();

  const key = "pooja_blocked_dates";

  const load = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.from("admin_config").select("value").eq("key", key).maybeSingle();
      if (!error && data?.value) {
        try {
          const raw = JSON.parse(String(data.value));
          const out: BlockItem[] = [];
          if (Array.isArray(raw)) {
            for (const el of raw) {
              if (typeof el === "string") {
                // Legacy: date-level block means both sessions blocked
                out.push({ date: el, session: "10:30 AM" });
                out.push({ date: el, session: "6:30 PM" });
              } else if (el && typeof el === "object" && el.date && el.session) {
                out.push({ date: String(el.date), session: String(el.session) });
              }
            }
          }
          // de-duplicate
          const dedup = Array.from(new Map(out.map(x => [`${x.date}|${x.session}`, x])).values());
          setItems(dedup.sort((a,b)=> a.date.localeCompare(b.date) || a.session.localeCompare(b.session)));
        } catch {
          setItems([]);
        }
      } else {
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const save = async (next: BlockItem[]) => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const payload = { key, value: JSON.stringify(next), updated_at: new Date().toISOString() };
      const { error } = await supabase.from("admin_config").upsert(payload, { onConflict: "key" });
      if (error) throw error;
      setItems(next);
      show({ title: "Saved", description: "Blocked sessions updated.", variant: "success" });
    } catch (e: any) {
      show({ title: "Save failed", description: e?.message || "Check RLS policy for admin_config.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = () => {
    if (!date || !session) return;
    const key = `${date}|${session}`;
    const exists = items.some((x) => `${x.date}|${x.session}` === key);
    if (exists) return;
    const next = [...items, { date, session }];
    next.sort((a,b)=> a.date.localeCompare(b.date) || a.session.localeCompare(b.session));
    save(next);
  };
  const remove = (it: BlockItem) => save(items.filter((x) => !(x.date === it.date && x.session === it.session)));

  const grouped = useMemo(() => {
    const m = new Map<string, BlockItem[]>();
    for (const it of items) {
      const arr = m.get(it.date) || [];
      arr.push(it);
      m.set(it.date, arr);
    }
    return Array.from(m.entries()).sort((a,b)=> a[0].localeCompare(b[0]));
  }, [items]);

  return (
    <AdminGuard>
      <main className="min-h-screen p-6 md:p-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold text-center">Block Pooja Sessions</h1>
          <div className="mt-2 flex justify-between">
            <button onClick={() => router.push("/admin")} className="rounded border px-3 py-1.5">Back</button>
          </div>

          <div className="rounded-xl border p-6 space-y-4 bg-card/70 mt-6">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
              <div>
                <label className="text-sm" htmlFor="d">Date</label>
                <input id="d" type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full rounded border px-3 py-2 bg-background" />
              </div>
              <div>
                <label className="text-sm" htmlFor="s">Session</label>
                <select id="s" value={session} onChange={(e)=>setSession(e.target.value)} className="w-full rounded border px-3 py-2 bg-background">
                  <option value="">Select session</option>
                  <option value="10:30 AM">Morning — 10:30 AM</option>
                  <option value="6:30 PM">Evening — 6:30 PM</option>
                </select>
              </div>
              <button onClick={add} disabled={!date || !session || loading} className="rounded bg-black text-white px-4 py-2">Add block</button>
            </div>
            <p className="text-xs text-muted-foreground">Blocked sessions cannot be booked. Saved into admin_config key <code>pooja_blocked_dates</code>.</p>
            <div className="border rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Blocked Sessions</th><th className="px-3 py-2 text-left">Action</th></tr></thead>
                <tbody>
                  {grouped.length === 0 ? (
                    <tr><td className="px-3 py-3" colSpan={3}>No blocked sessions.</td></tr>
                  ) : (
                    grouped.map(([d, arr]) => (
                      <tr key={d} className="border-t align-top">
                        <td className="px-3 py-2 whitespace-nowrap">{d}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            {arr.map((it) => (
                              <span key={`${it.date}|${it.session}`} className="inline-flex items-center gap-2 rounded border px-2 py-1">
                                {it.session}
                                <button onClick={() => remove(it)} className="text-xs opacity-70 hover:opacity-100" aria-label="Unblock session">✕</button>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {arr.length === 2 ? (
                            <span className="text-xs text-muted-foreground">All sessions blocked</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">{2 - arr.length} session open</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </AdminGuard>
  );
}
