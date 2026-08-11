const ADMIN_EMAILS = ["admin@cbnu.ac.kr"];

export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
