import {
  APIError,
  type CollectionAfterChangeHook,
  type CollectionBeforeLoginHook,
  type TypeWithID,
} from "payload";

/**
 * What "Suspended" means.
 *
 * Both account collections have had a Suspended status since the first migration, and until now
 * it was a label. Nothing read it: a suspended staff account signed in exactly as before, kept
 * its dealership's stock and leads, and a suspended buyer kept their saved cars. A status that
 * only changes the colour of a badge is worse than no status, because the person who set it
 * believes the account is off.
 *
 * Two halves, and both are needed for the word to be true.
 *
 * **No new session.** `refuseSuspendedAccount` runs in `beforeLogin`, which Payload calls after
 * it has checked the password and before it signs a token, so a throw there means no session was
 * ever issued rather than one being taken back. It runs before the second-factor check: an
 * account that is switched off is not asked for a code it would gain nothing by giving.
 *
 * **No session that is already open.** Suspending somebody who is signed in has to put them out
 * now, not in eight hours when their token expires, and a live session can also renew itself at
 * /api/users/refresh-token indefinitely. `endSessionsWhenSuspended` empties the account's session
 * list the moment the status changes, and Payload's own JWT strategy then refuses every token
 * that names one of those sessions.
 *
 * Neither half fails closed on a missing status: an account whose status we cannot read signs in.
 * These hooks exist to enforce a decision somebody made, not to invent one.
 */

const SUSPENDED = "suspended";

/**
 * One message, and it says what happened and what to do about it. There is nothing to hide: the
 * password was already accepted, so this tells whoever is at the keyboard nothing they did not
 * know, and "invalid credentials" would send a suspended dealer into a password reset loop.
 */
const REFUSAL =
  "This account has been suspended, so it cannot sign in. Email hello@rynet.co.za if you think that is wrong.";

type AccountWithStatus = TypeWithID & {
  status?: string | null;
  sessions?: { id?: string | null }[] | null;
};

const isSuspended = (account: unknown): boolean =>
  (account as AccountWithStatus | null | undefined)?.status === SUSPENDED;

/** Refuses the sign-in of a suspended account. Used by `users` and by `buyers`. */
export const refuseSuspendedAccount: CollectionBeforeLoginHook = ({ user }) => {
  if (isSuspended(user)) throw new APIError(REFUSAL, 403);
  return user;
};

/**
 * Ends every open session the moment an account is suspended.
 *
 * Written through the database layer with the whole row, which is how Payload revokes a session
 * itself: the `sessions` field refuses writes from anywhere else, deliberately, and a partial
 * write here would replace the row rather than patch it. It runs inside the same transaction as
 * the update that suspended the account, so either both happen or neither does.
 */
export const endSessionsWhenSuspended: CollectionAfterChangeHook = async ({
  collection,
  doc,
  previousDoc,
  req,
}) => {
  if (!isSuspended(doc) || isSuspended(previousDoc)) return doc;

  const id = (doc as AccountWithStatus).id;
  const stored = (await req.payload.db.findOne({
    collection: collection.slug,
    req,
    where: { id: { equals: id } },
  })) as AccountWithStatus | null;

  if (!stored?.sessions?.length) return doc;

  await req.payload.db.updateOne({
    collection: collection.slug,
    data: { ...stored, sessions: [] },
    id,
    req,
    returning: false,
  });

  req.payload.logger.info(
    `Suspended ${collection.slug} ${id}: ${stored.sessions.length} open session${stored.sessions.length === 1 ? "" : "s"} ended.`,
  );

  return doc;
};
