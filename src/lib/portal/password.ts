/**
 * The one rule for a password chosen in the portal: long enough to be worth having. No list of
 * symbols to include, which mostly produces "Password1!". Length is what makes it hard to guess.
 */

export const MIN_PASSWORD = 10;

export function passwordProblem(password: string, again: string): string | null {
  if (password.length < MIN_PASSWORD) {
    return `Use at least ${MIN_PASSWORD} characters. A short sentence works well.`;
  }
  if (password.length > 200) return "That is longer than it needs to be. Keep it under 200.";
  if (password !== again) return "The two passwords are not the same.";
  return null;
}
