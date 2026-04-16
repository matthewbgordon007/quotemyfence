/** Extra context when Supabase Auth rejects signUp because the email already exists. */
export function withAuthEmailAlreadyExistsHint(message: string): string {
  if (!/already|registered|exists|duplicate|identities/i.test(message)) return message;
  return `${message} If you deleted a company that used this email, the login may still exist: in Supabase open Authentication → Users, remove the user with this address, then try again. You can also sign in instead of registering.`;
}
