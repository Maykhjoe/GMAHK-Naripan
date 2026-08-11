import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const candidates = [
  ".env",
  ".env.production",
  ".env.local",
  ".env.production.local",
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const values = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const fileEnv = candidates.reduce(
  (result, file) => ({ ...result, ...parseEnvFile(path.join(projectRoot, file)) }),
  {},
);
const env = { ...fileEnv, ...process.env };
const failures = [];
const warnings = [];

function exists(key) {
  const value = String(env[key] ?? "").trim();
  return Boolean(value && !/YOUR_|CHANGE_ME|placeholder/i.test(value));
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

for (const key of [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
  "TURNSTILE_EXPECTED_HOSTNAME",
]) {
  if (!exists(key)) fail(`${key} belum dikonfigurasi.`);
}

let siteUrl;
try {
  siteUrl = new URL(env.NEXT_PUBLIC_SITE_URL ?? "");
  if (siteUrl.protocol !== "https:") {
    fail("NEXT_PUBLIC_SITE_URL production harus menggunakan HTTPS.");
  }
  if (["localhost", "127.0.0.1", "0.0.0.0"].includes(siteUrl.hostname)) {
    fail("NEXT_PUBLIC_SITE_URL masih menggunakan hostname lokal.");
  }
} catch {
  fail("NEXT_PUBLIC_SITE_URL bukan URL yang valid.");
}

try {
  const supabaseUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  if (supabaseUrl.protocol !== "https:") {
    fail("NEXT_PUBLIC_SUPABASE_URL harus menggunakan HTTPS.");
  }
} catch {
  fail("NEXT_PUBLIC_SUPABASE_URL bukan URL yang valid.");
}

if (
  siteUrl &&
  exists("TURNSTILE_EXPECTED_HOSTNAME") &&
  siteUrl.hostname.toLowerCase() !==
    String(env.TURNSTILE_EXPECTED_HOSTNAME).trim().toLowerCase()
) {
  fail("TURNSTILE_EXPECTED_HOSTNAME tidak sama dengan hostname website.");
}

for (const key of [
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_ACCESS_TOKEN",
]) {
  if (exists(key)) fail(`${key} tidak boleh digunakan karena mengekspos secret.`);
}

if (String(env.NEXT_PUBLIC_SITE_URL ?? "").includes("vercel.app")) {
  warn("Canonical URL masih memakai vercel.app. Gunakan domain resmi saat sudah tersedia.");
}

for (const message of warnings) console.warn(`WARNING: ${message}`);

if (failures.length) {
  for (const message of failures) console.error(`FAIL: ${message}`);
  console.error(`\nProduction environment belum siap (${failures.length} masalah).`);
  process.exit(1);
}

console.log("Production environment check: PASS");
console.log("Tidak ada nilai secret yang dicetak oleh pemeriksaan ini.");
