import { execSync } from "node:child_process";

/** Applies migrations to the dedicated test database before any test runs. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://venturely:venturely@localhost:5432/venturely_test?schema=public";
  if (!/test/.test(url)) throw new Error("Refusing to run tests against a database whose name doesn't contain 'test'.");
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
}
