/**
 * Authorized Super Admin Emails
 */
export const ADMIN_EMAILS: readonly string[] = [
  'elrazortheodore@gmail.com',
  'elrazoretheodore@proton.me',
  'efeoghene@proton.me',
]

/**
 * Checks whether an email address is an authorized super admin
 */
export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase().trim())
}
