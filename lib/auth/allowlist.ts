export function getDemoAllowlist(): string[] {
  return (process.env.DEMO_ALLOWLIST_EMAILS ?? "")
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isDemoAllowlisted(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = getDemoAllowlist();
  return allowlist.length > 0 && allowlist.includes(email.trim().toLowerCase());
}
