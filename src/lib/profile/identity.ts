export type SupabaseLike = {
  auth: { getUser: () => Promise<{ data?: { user?: { id?: string | null } | null } }> };
  from: (table: string) => any;
};

// Returns true if the current user has uploaded Aadhaar or PAN URLs in Profile-Table
export async function hasIdentityDocument(supabase: SupabaseLike): Promise<boolean> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    const uid = user?.id;
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
    return Boolean(a || p);
  } catch {
    return false;
  }
}

