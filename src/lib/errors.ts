/** Readable text for anything thrown or returned as an error (Supabase errors are plain objects, not Error instances). */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e && typeof e.message === "string") return e.message;
  return String(e);
}
