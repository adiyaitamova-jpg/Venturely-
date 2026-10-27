/**
 * Seeds the skill taxonomy (always) and, unless SEED_DEMO=false, a realistic set
 * of clearly-labelled demo accounts, projects and history.
 *
 *   npm run db:seed                 # taxonomy + demo data
 *   SEED_DEMO=false npm run db:seed # taxonomy only (production)
 *
 * Demo accounts use @demo.venturely.dev and are flagged isDemo. Re-running the
 * seed deletes and recreates all demo accounts; real accounts are never touched.
 */
import { randomBytes } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SKILLS } from "../src/lib/taxonomy";
import { slugify } from "../src/lib/utils";
import { ADMIN, PEOPLE, PROJECTS } from "./seed-data";

const db = new PrismaClient();
const DAY = 24 * 3600 * 1000;
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * DAY);
const monthsAgo = (m: number) => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - m, 1));
const DEMO_DOMAIN = "demo.venturely.dev";

async function seedSkills() {
  for (const s of SKILLS) {
    await db.skill.upsert({
      where: { name: s.name },
      create: { name: s.name, slug: slugify(s.name) || s.name.toLowerCase(), category: s.category },
      update: { category: s.category },
    });
  }
  const all = await db.skill.findMany({ select: { id: true, name: true } });
  return new Map(all.map((s) => [s.name, s.id]));
}

async function main() {
  const skillIds = await seedSkills();
  console.log(`✓ ${skillIds.size} skills`);
  if (process.env.SEED_DEMO === "false") return;

  const skill = (name: string) => {
    const id = skillIds.get(name);
    if (!id) throw new Error(`Unknown skill in seed data: ${name}`);
    return id;
  };

  // Reset demo data only.
  const removed = await db.user.deleteMany({ where: { isDemo: true } });
  if (removed.count) console.log(`✓ removed ${removed.count} previous demo accounts`);
  await db.rankingRun.deleteMany({});

  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? "venturely-demo-1";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(12).toString("base64url");
  const [passwordHash, adminHash] = await Promise.all([bcrypt.hash(demoPassword, 10), bcrypt.hash(adminPassword, 12)]);

  const admin = await db.user.create({
    data: {
      email: ADMIN.email,
      passwordHash: adminHash,
      role: "ADMIN",
      isDemo: true,
      termsAcceptedAt: daysAgo(130),
      createdAt: daysAgo(130),
      profile: {
        create: {
          username: ADMIN.username,
          displayName: ADMIN.name,
          headline: "Reviews reports and achievement evidence",
          visibility: "PRIVATE",
          availability: "NOT_AVAILABLE",
          onboardingStep: 5,
          onboardedAt: daysAgo(130),
          avatarHue: 150,
        },
      },
    },
  });

  // ── People ──
  const userIds = new Map<string, string>();
  for (const p of PEOPLE) {
    const joined = daysAgo(p.joinedDaysAgo);
    // Demo usernames are first names ("maya", "tomas", …).
    const handle = slugify(p.name.split(" ")[0]!);
    const user = await db.user.create({
      data: {
        email: `${p.key}@${DEMO_DOMAIN}`,
        passwordHash,
        isDemo: true,
        termsAcceptedAt: joined,
        createdAt: joined,
        profile: {
          create: {
            username: handle.slice(0, 24),
            displayName: p.name,
            headline: p.headline,
            bio: p.bio,
            intendedMajor: p.major,
            academicInterests: p.interests,
            causes: p.causes,
            languages: p.languages,
            preferredCategories: p.categories,
            preferredRoles: p.roles,
            projectIdeas: p.ideas ?? "",
            availability: p.availability,
            experienceLevel: p.experience,
            region: p.region,
            visibility: p.visibility ?? (p.key === "jonah" || p.key === "ruby" ? "MEMBERS" : "PUBLIC"),
            githubUrl: p.github ? `https://example.com/${p.key}` : null,
            websiteUrl: p.key === "maya" || p.key === "lena" ? `https://example.org/${p.key}` : null,
            avatarHue: p.hue,
            onboardingStep: 5,
            onboardedAt: joined,
            createdAt: joined,
          },
        },
        skills: { create: p.skills.map(([name, level]) => ({ skillId: skill(name), level, createdAt: joined })) },
      },
    });
    userIds.set(p.key, user.id);

    for (const [i, a] of (p.achievements ?? []).entries()) {
      const createdAt = new Date(Math.min(now - DAY, joined.getTime() + (i + 1) * 3 * DAY));
      await db.achievement.create({
        data: {
          userId: user.id,
          title: a.title,
          description: a.description ?? "",
          type: a.type,
          level: a.level,
          category: a.category,
          issuer: a.issuer,
          date: monthsAgo(a.monthsAgo),
          evidenceUrl: a.status === "SELF_REPORTED" ? null : `https://example.org/results/${p.key}-${i + 1}`,
          status: a.status,
          verifiedAt: a.status === "VERIFIED" ? new Date(createdAt.getTime() + 4 * DAY) : null,
          verifiedById: a.status === "VERIFIED" ? admin.id : null,
          position: i,
          createdAt,
        },
      });
    }
    for (const [i, item] of (p.portfolio ?? []).entries()) {
      await db.portfolioItem.create({
        data: {
          userId: user.id,
          title: item.title,
          description: item.description,
          kind: item.kind,
          category: item.category,
          date: monthsAgo(item.monthsAgo),
          contribution: item.contribution,
          outcome: item.outcome,
          projectUrl: item.linked ? `https://example.com/${p.key}/${slugify(item.title)}` : null,
          evidenceUrl: item.linked ? `https://example.org/${p.key}/${slugify(item.title)}/evidence` : null,
          position: i,
          createdAt: new Date(joined.getTime() + (i + 1) * 2 * DAY),
          skills: { connect: item.skills.map((s) => ({ id: skill(s) })) },
        },
      });
    }
  }
  console.log(`✓ ${PEOPLE.length} demo people + 1 moderator`);

  // ── Projects ──
  const projectIds = new Map<string, { id: string; slug: string; title: string }>();
  for (const pr of PROJECTS) {
    const ownerId = userIds.get(pr.owner)!;
    const created = daysAgo(pr.createdDaysAgo);
    const slug = slugify(pr.title);
    const project = await db.project.create({
      data: {
        slug,
        title: pr.title,
        tagline: pr.tagline,
        description: pr.description,
        goals: pr.goals,
        outcomes: pr.outcomes,
        category: pr.category,
        stage: pr.stage,
        commitment: pr.commitment,
        visibility: "PUBLIC",
        repoUrl: pr.links ? `https://example.com/${slug}` : null,
        demoUrl: pr.links && ["LAUNCHED", "COMPLETED", "PROTOTYPE"].includes(pr.stage) ? `https://example.org/${slug}` : null,
        ownerId,
        createdAt: created,
        updatedAt: daysAgo(Math.max(1, Math.floor(pr.createdDaysAgo / 8))),
        stageChangedAt: daysAgo(Math.floor(pr.createdDaysAgo / 3)),
        completedAt: pr.stage === "COMPLETED" ? daysAgo(30) : null,
        skills: { connect: pr.skills.map((s) => ({ id: skill(s) })) },
        members: {
          create: [
            { userId: ownerId, role: "OWNER", title: "Founder", responsibilities: "Leads the project and owns the roadmap.", joinedAt: created },
            ...pr.members.map((m) => ({
              userId: userIds.get(m.key)!,
              role: m.role ?? "MEMBER",
              title: m.title,
              responsibilities: m.responsibilities,
              joinedAt: daysAgo(m.joinedDaysAgo),
            })),
          ],
        },
      },
    });
    projectIds.set(pr.key, { id: project.id, slug, title: pr.title });

    const activity: Prisma.ActivityEventCreateManyInput[] = [
      { projectId: project.id, actorId: ownerId, type: "PROJECT_CREATED", detail: pr.title, createdAt: created },
      ...pr.members.map((m) => ({ projectId: project.id, actorId: userIds.get(m.key)!, type: "MEMBER_JOINED" as const, detail: m.title, createdAt: daysAgo(m.joinedDaysAgo) })),
    ];
    for (const r of pr.roles) {
      await db.projectRole.create({
        data: {
          projectId: project.id,
          title: r.title,
          description: r.description,
          commitment: r.commitment,
          isOpen: r.open ?? true,
          createdAt: new Date(created.getTime() + DAY),
          skills: { connect: r.skills.map((s) => ({ id: skill(s) })) },
        },
      });
      activity.push({ projectId: project.id, actorId: ownerId, type: "ROLE_OPENED", detail: r.title, createdAt: new Date(created.getTime() + DAY) });
    }
    for (const [i, m] of pr.milestones.entries()) {
      const assigneeId = m.assignee ? userIds.get(m.assignee)! : null;
      const addedAt = new Date(created.getTime() + (i + 2) * DAY);
      await db.projectMilestone.create({
        data: {
          projectId: project.id,
          title: m.title,
          status: m.status,
          assigneeId,
          position: i,
          dueDate: m.dueInDays ? new Date(now + m.dueInDays * DAY) : null,
          completedAt: m.status === "DONE" ? daysAgo(m.doneDaysAgo ?? 5) : null,
          evidenceUrl: m.evidence ? `https://example.com/${slug}/milestone-${i + 1}` : null,
          createdAt: addedAt,
        },
      });
      activity.push({ projectId: project.id, actorId: assigneeId ?? ownerId, type: "MILESTONE_ADDED", detail: m.title, createdAt: addedAt });
      if (m.status === "DONE") {
        activity.push({ projectId: project.id, actorId: assigneeId ?? ownerId, type: "MILESTONE_COMPLETED", detail: m.title, createdAt: daysAgo(m.doneDaysAgo ?? 5) });
      }
    }
    if (pr.stage !== "IDEA") {
      activity.push({ projectId: project.id, actorId: ownerId, type: "STAGE_CHANGED", detail: pr.stage.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), createdAt: daysAgo(Math.floor(pr.createdDaysAgo / 3)) });
    }
    await db.activityEvent.createMany({ data: activity });
  }
  console.log(`✓ ${PROJECTS.length} projects with roles, milestones and activity`);

  // ── Peer feedback (only between real teammates) ──
  const feedback: [string, string, string, number, number, number][] = [
    // project, author, subject, contribution, reliability, daysAgo
    ["airwatch", "omar", "maya", 5, 5, 40],
    ["airwatch", "sofia", "maya", 5, 4, 25],
    ["airwatch", "maya", "omar", 5, 5, 38],
    ["airwatch", "maya", "sofia", 4, 5, 20],
    ["signsense", "nadia", "zara", 5, 5, 30],
    ["signsense", "chloe", "zara", 5, 4, 12],
    ["signsense", "zara", "chloe", 5, 5, 9],
    ["openarm", "ethan", "tomas", 5, 4, 22],
    ["openarm", "mateo", "tomas", 4, 5, 18],
    ["openarm", "tomas", "ethan", 4, 4, 20],
    ["plannr", "lena", "arjun", 5, 5, 35],
    ["plannr", "isabella", "arjun", 4, 5, 14],
    ["plannr", "arjun", "lena", 5, 5, 34],
    ["heatmap", "amara", "sofia", 5, 5, 40],
    ["heatmap", "sofia", "amara", 5, 4, 40],
    ["farmersmarket", "samuel", "lucas", 5, 4, 28],
    ["farmersmarket", "lucas", "samuel", 4, 4, 27],
  ];
  for (const [pk, a, s, c, r, d] of feedback) {
    await db.peerFeedback.create({
      data: { projectId: projectIds.get(pk)!.id, authorId: userIds.get(a)!, subjectId: userIds.get(s)!, contribution: c, reliability: r, createdAt: daysAgo(d) },
    });
  }

  // ── Requests & notifications for the primary demo account ──
  const maya = userIds.get("maya")!;
  const airwatch = projectIds.get("airwatch")!;
  const openarm = projectIds.get("openarm")!;
  const firmwareRole = await db.projectRole.findFirstOrThrow({ where: { projectId: openarm.id, title: "Firmware engineer" } });
  await db.collaborationInvitation.create({
    data: {
      projectId: openarm.id,
      roleId: firmwareRole.id,
      senderId: userIds.get("tomas")!,
      recipientId: maya,
      message: "Hi Maya — I saw your AirWatch firmware work. Our arm's trajectory code is jittery and I think your experience with sensor filtering would help a lot. It's about 4–6 hours a week. Want to take a look at the repo first?",
      createdAt: daysAgo(2),
    },
  });
  const frontendRole = await db.projectRole.findFirstOrThrow({ where: { projectId: airwatch.id, title: "Frontend engineer" } });
  await db.projectApplication.create({
    data: {
      projectId: airwatch.id,
      roleId: frontendRole.id,
      applicantId: userIds.get("nadia")!,
      message: "I'd love to build the teacher dashboard. I've shipped accessible React dashboards before and I care a lot about colour-blind-safe charts. I could do ~6 hours a week and start with a quick prototype in Figma so we can test it with a teacher.",
      createdAt: daysAgo(1),
    },
  });
  await db.projectApplication.create({
    data: {
      projectId: airwatch.id,
      applicantId: userIds.get("jonah")!,
      message: "I'm new to hardware but I'm learning Python and I'm good at writing docs. I could help write the assembly guide for schools and test it by building a node myself.",
      createdAt: daysAgo(3),
    },
  });
  await db.collaborationInvitation.create({
    data: {
      projectId: airwatch.id,
      senderId: maya,
      recipientId: userIds.get("chloe")!,
      message: "Hi Chloé! We need someone to interview teachers about how they'd use air-quality data in class. Your research work on Plannr-style onboarding looks perfect.",
      createdAt: daysAgo(4),
    },
  });
  await db.savedProfile.createMany({
    data: [
      { userId: maya, savedUserId: userIds.get("nadia")!, createdAt: daysAgo(6) },
      { userId: maya, savedUserId: userIds.get("zara")!, createdAt: daysAgo(10), note: "Strong on-device ML — could help shrink our calibration model.", source: "AI_MATCH" },
      { userId: maya, savedUserId: userIds.get("chloe")!, createdAt: daysAgo(12) },
    ],
  });
  await db.notification.createMany({
    data: [
      { userId: maya, type: "INVITATION_RECEIVED", title: "Tomás Rivera invited you to join OpenArm", body: "Role: Firmware engineer", link: "/requests", createdAt: daysAgo(2) },
      { userId: maya, type: "APPLICATION_RECEIVED", title: "Nadia Rahman applied to join AirWatch", body: "For: Frontend engineer", link: "/requests?tab=incoming", createdAt: daysAgo(1) },
      { userId: maya, type: "APPLICATION_RECEIVED", title: "Jonah Levi applied to join AirWatch", link: "/requests?tab=incoming", createdAt: daysAgo(3) },
      { userId: maya, type: "ACHIEVEMENT_VERIFIED", title: "Your achievement “Regional Science Fair — First Place” was verified", link: "/u/maya", createdAt: daysAgo(40), readAt: daysAgo(39) },
    ],
  });

  // A couple of open items for the moderation queue.
  await db.report.create({
    data: {
      reporterId: userIds.get("lena")!,
      targetType: "PROJECT",
      targetId: projectIds.get("cropdrone")!.id,
      reason: "OTHER",
      details: "Demo report: checking that the moderation queue works. Nothing is actually wrong with this project.",
      createdAt: daysAgo(1),
    },
  });

  console.log("✓ requests, feedback, saved profiles, notifications");

  // ── Ranking history: recompute "as of" past dates so movement is real ──
  // Imported lazily: the ranking service is shared with the app (server-only).
  const { recomputeRankings } = await import("../src/server/services/rankings");
  for (const d of [28, 21, 14, 7, 2]) await recomputeRankings(daysAgo(d));
  const latest = await recomputeRankings(new Date());
  console.log(`✓ ranking history (6 runs, ${latest?.entries ?? 0} entries in latest)`);

  console.log(`\nDemo login:  maya@${DEMO_DOMAIN} / ${demoPassword}`);
  console.log(`Moderator:   ${ADMIN.email} / ${process.env.SEED_ADMIN_PASSWORD ? "(SEED_ADMIN_PASSWORD)" : adminPassword}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
