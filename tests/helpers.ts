import { db } from "@/server/db";
import { SKILLS } from "@/lib/taxonomy";
import { slugify } from "@/lib/utils";
import { hashPassword } from "@/server/auth/password";

/** Wipes all application tables (test database only). */
export async function resetDb() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("test")) throw new Error("resetDb refused: not a test database");
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

export async function seedSkills() {
  for (const s of SKILLS.slice(0, 20)) {
    await db.skill.create({ data: { name: s.name, slug: slugify(s.name), category: s.category } });
  }
  return db.skill.findMany();
}

let counter = 0;
export async function makeUser(opts: Partial<{ username: string; visibility: "PUBLIC" | "MEMBERS" | "PRIVATE"; onboarded: boolean; role: "USER" | "ADMIN"; createdAt: Date; availability: "COMMITTED" | "PART_TIME" | "FEW_HOURS" | "NOT_AVAILABLE" }> = {}) {
  counter++;
  const username = opts.username ?? `user${counter}${Date.now() % 10000}`;
  return db.user.create({
    data: {
      email: `${username}@test.local`,
      passwordHash: await hashPassword("password-123"),
      role: opts.role ?? "USER",
      createdAt: opts.createdAt,
      profile: {
        create: {
          username,
          displayName: `Test ${username}`,
          visibility: opts.visibility ?? "MEMBERS",
          availability: opts.availability ?? "PART_TIME",
          onboardingStep: 5,
          onboardedAt: opts.onboarded === false ? null : new Date(),
        },
      },
    },
  });
}

export const projectInput = (overrides: Record<string, unknown> = {}) => ({
  title: "Test Project",
  tagline: "A project used in automated tests",
  description: "A sufficiently long description of the project used in automated tests to pass validation.",
  goals: "",
  outcomes: "",
  category: "SOFTWARE" as const,
  stage: "IDEA" as const,
  commitment: "MODERATE" as const,
  visibility: "PUBLIC" as const,
  repoUrl: null,
  demoUrl: null,
  skillIds: [] as string[],
  ...overrides,
});
