export type SupabaseLike = {
  auth: { getUser: () => Promise<{ data?: { user?: { id?: string | null; email?: string | null } | null } }> };
  from: (table: string) => any;
  storage?: any;
};

// Returns true if the current user has uploaded Aadhaar or PAN URLs in Profile-Table
export async function hasIdentityDocument(supabase: SupabaseLike): Promise<boolean> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    const uid = user?.id;
    const email = (user as any)?.email || "";
    if (!uid) return false;
    // Prefer user_id; fall back to id for older rows
    let q = await supabase
      .from("Profile-Table")
      .select("aadhaar_url,aadhar_url,pan_url")
      .eq("user_id", uid)
      .maybeSingle();
    if (!q?.data) {
      q = await supabase
        .from("Profile-Table")
        .select("aadhaar_url,aadhar_url,pan_url")
        .eq("id", uid)
        .maybeSingle();
    }
    const row = q?.data as any;
    const a = (row?.aadhaar_url || row?.aadhar_url || "").toString().trim();
    const p = (row?.pan_url || "").toString().trim();
    if (a || p) return true;

    // Fallback: check Storage bucket if profile row isn't populated yet
    try {
      const store = (supabase as any).storage;
      if (!store) return false;
      const bucket = "PAN-Aadhar";
      const safe = String(email).toLowerCase().replace(/[^a-z0-9._-]/gi, "_");
      const [aa, pp] = await Promise.all([
        store.from(bucket).list("aadhaar", { limit: 100 }),
        store.from(bucket).list("pan", { limit: 100 }),
      ]);
      const hasA = Array.isArray(aa?.data) && aa.data.some((f: any) => typeof f?.name === "string" && f.name.toLowerCase().startsWith(safe));
      const hasP = Array.isArray(pp?.data) && pp.data.some((f: any) => typeof f?.name === "string" && f.name.toLowerCase().startsWith(safe));
      return Boolean(hasA || hasP);
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}
