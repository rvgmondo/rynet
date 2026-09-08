/**
 * The shapes the two-factor actions return.
 *
 * Its own file because a `"use server"` module may export nothing but async functions. A type
 * export is erased at compile time and would probably survive, but "probably" is not a good
 * enough reason to test the boundary again: the last time this project put a value in an
 * action module, Next stopped creating the action reference, the form fell back to a plain
 * HTML POST, and it looked exactly like a form that worked.
 */

export type TwoFactorState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "enabled"; message: string; recoveryCodes: string[] }
  | { status: "disabled"; message: string }
  | { status: "regenerated"; message: string; recoveryCodes: string[] };

/** What the page needs to know to decide which of the three states to render. */
export type TwoFactorStatus = {
  signedIn: boolean;
  email?: string;
  role?: string | null;
  enabled: boolean;
  /** A setup that was started and never confirmed. The key is shown again rather than reissued. */
  pending: boolean;
  secret?: string;
  otpauth?: string;
  recoveryCodesLeft: number;
  confirmedAt?: string | null;
  /** True once RYNET_REQUIRE_2FA is on and this role cannot sign in without it. */
  required: boolean;
  mandatoryNow: boolean;
};
