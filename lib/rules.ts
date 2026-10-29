import type { SessionUser } from "./auth";

/*
 * Server-side access rules for the document store (the same model the page was built on):
 *  - every signed-in member reads shared documents;
 *  - data/users/<id>/... is private to <id> (read and write);
 *  - profiles/<id>, projects/<id>, requests/<id>, outbox/<id> are written only by <id>;
 *  - the moderator (ADMIN_EMAIL) may also write shared documents, e.g. moderation/verified.
 */
const SEGMENT = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const OWN_DOCS = new Set(["profiles", "projects", "requests", "outbox"]);
export const MAX_DOC_BYTES = 256 * 1024;

export function validPath(path: string) {
  const segs = path.split("/");
  return segs.length >= 2 && segs.length <= 16 && segs.length % 2 === 0 && segs.every((s) => SEGMENT.test(s) && s !== "." && s !== "..");
}

export function canRead(path: string, user: SessionUser) {
  const segs = path.split("/");
  if (segs[0] === "data") return segs[1] === "users" && segs[2] === user.id;
  return true;
}

export function canWrite(path: string, user: SessionUser) {
  if (!validPath(path)) return false;
  const segs = path.split("/");
  if (segs[0] === "data") return segs[1] === "users" && segs[2] === user.id && segs.length >= 4;
  if (user.isAdmin) return true;
  return OWN_DOCS.has(segs[0]!) && segs.length === 2 && segs[1] === user.id;
}
