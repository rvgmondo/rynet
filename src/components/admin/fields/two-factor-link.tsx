"use client";

import { FieldDescription, useAuth, useDocumentInfo, useFormFields } from "@payloadcms/ui";

const DESCRIPTION = "Each person turns this on for their own account.";

/**
 * The line under "Two-factor sign-in", and on a person's own account, where to turn it on.
 *
 * The box itself cannot be ticked here. Two-factor is set up on its own page, which scans a code
 * with a phone app, and the admin said only "Each person turns this on for their own account"
 * without saying where. The link is shown only on the signed-in person's own account, because
 * that page always sets up the account of whoever opens it.
 *
 * Drawn as the field's description, below the box: a checkbox puts anything added after its input
 * on the same line as its label, where the link covered the label.
 *
 * Display only.
 */
export function TwoFactorDescription({ path = "twoFactorEnabled" }: { path?: string }) {
  const { id } = useDocumentInfo();
  const { user } = useAuth();
  const enabled = useFormFields(([fields]) => fields?.twoFactorEnabled?.value) === true;
  const own = id !== undefined && id !== null && Boolean(user) && String(user?.id) === String(id);

  return (
    <>
      <FieldDescription description={DESCRIPTION} path={path} />
      {own ? (
        <p className="rn-admin-field-preview">
          <a className="rn-admin-field-link" href="/account/two-factor">
            {enabled
              ? "Manage two-factor sign-in for your account"
              : "Set up two-factor sign-in for your account"}
          </a>
        </p>
      ) : null}
    </>
  );
}
