import bcrypt from "bcryptjs";

const COST = process.env.NODE_ENV === "test" ? 4 : 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Used to keep sign-in timing similar whether or not the account exists. */
export const DUMMY_HASH = "$2b$12$mQ4CrhxJ1J/mECCdMZQJuup96LyUfWWZmEuoLhTN4KZDe7PtSNJj2";
