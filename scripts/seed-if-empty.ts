/**
 * Runs the seed only when the database has never been seeded (no skills yet).
 * Used by `vercel-build` so the first deploy is usable without manual steps,
 * while later deploys never reset demo data that real users interacted with.
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();
  const skills = await db.skill.count();
  await db.$disconnect();
  if (skills > 0) {
    console.log("Database already seeded; skipping.");
    return;
  }
  execSync("npx prisma db seed", { stdio: "inherit" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
