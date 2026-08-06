export type SubmissionMode = "supabase" | "demo" | "unavailable";
export function resolveSubmissionMode(configured: boolean, environment = process.env.NODE_ENV ?? "development"): SubmissionMode {
  if (configured) return "supabase";
  return environment === "production" ? "unavailable" : "demo";
}
