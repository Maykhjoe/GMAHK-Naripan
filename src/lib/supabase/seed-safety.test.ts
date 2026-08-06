import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readSql(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

describe("Supabase seed safety", () => {
  it("keeps auth trigger definitions out of seed data", () => {
    const seed = readSql("supabase/seed.sql");

    expect(seed).not.toMatch(/create\s+or\s+replace\s+function\s+public\.handle_new_user/i);
    expect(seed).not.toMatch(/create\s+trigger\s+on_auth_user_created/i);
  });

  it("restores the hardened auth profile trigger in a corrective migration", () => {
    const migration = readSql("supabase/migrations/202608020006_restore_hardened_auth_trigger.sql");

    expect(migration).toMatch(/drop\s+trigger\s+if\s+exists\s+on_auth_user_created/i);
    expect(migration).toMatch(/execute\s+function\s+public\.handle_new_auth_user\(\)/i);
  });
});
