import { createAdminClient } from "~/scripts/lib/supabase-admin";

describe("createAdminClient", () => {
  it("throws when the supabase url is missing", () => {
    expect(() => createAdminClient({ supabaseUrl: "", serviceRoleKey: "k" })).toThrow(
      /SUPABASE_URL/
    );
  });

  it("throws when the service-role key is missing", () => {
    expect(() =>
      createAdminClient({ supabaseUrl: "https://x.supabase.co", serviceRoleKey: "" })
    ).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("constructs a client with .from() when both are present", () => {
    const client = createAdminClient({
      supabaseUrl: "https://x.supabase.co",
      serviceRoleKey: "fake-key",
    });
    expect(client).toBeDefined();
    expect(typeof client.from).toBe("function");
  });
});
