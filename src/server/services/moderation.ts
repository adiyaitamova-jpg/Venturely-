import "server-only";
import { db } from "@/server/db";
import { forbidden, invalid, notFound } from "@/server/errors";
import { notify } from "./notifications";

async function assertAdmin(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (u?.role !== "ADMIN") throw forbidden("Moderator access required.");
}

export async function getModerationQueue(adminId: string) {
  await assertAdmin(adminId);
  const [pending, reports, stats] = await Promise.all([
    db.achievement.findMany({
      where: { status: "PENDING" },
      orderBy: { updatedAt: "asc" },
      take: 50,
      include: { user: { select: { id: true, profile: { select: { username: true, displayName: true } } } } },
    }),
    db.report.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: { reporter: { select: { profile: { select: { username: true, displayName: true } } } } },
    }),
    Promise.all([db.user.count(), db.project.count(), db.report.count({ where: { status: "OPEN" } })]),
  ]);
  // Resolve report targets to human-readable labels and links.
  const resolved = await Promise.all(
    reports.map(async (r) => {
      let label = "Deleted content";
      let href: string | null = null;
      let ownerId: string | null = null;
      if (r.targetType === "USER") {
        const p = await db.profile.findUnique({ where: { userId: r.targetId }, select: { username: true, displayName: true } });
        if (p) {
          label = `${p.displayName} (@${p.username})`;
          href = `/u/${p.username}`;
          ownerId = r.targetId;
        }
      } else if (r.targetType === "PROJECT") {
        const p = await db.project.findUnique({ where: { id: r.targetId }, select: { title: true, slug: true, ownerId: true } });
        if (p) {
          label = `Project: ${p.title}`;
          href = `/projects/${p.slug}`;
          ownerId = p.ownerId;
        }
      } else if (r.targetType === "PORTFOLIO_ITEM") {
        const p = await db.portfolioItem.findUnique({ where: { id: r.targetId }, select: { title: true, userId: true, user: { select: { profile: { select: { username: true } } } } } });
        if (p) {
          label = `Portfolio: ${p.title}`;
          href = `/u/${p.user.profile?.username}`;
          ownerId = p.userId;
        }
      } else {
        const a = await db.achievement.findUnique({ where: { id: r.targetId }, select: { title: true, userId: true, user: { select: { profile: { select: { username: true } } } } } });
        if (a) {
          label = `Achievement: ${a.title}`;
          href = `/u/${a.user.profile?.username}`;
          ownerId = a.userId;
        }
      }
      return { ...r, label, href, ownerId };
    }),
  );
  return { pending, reports: resolved, stats: { users: stats[0], projects: stats[1], openReports: stats[2] } };
}

export async function reviewAchievement(adminId: string, achievementId: string, approve: boolean, note: string) {
  await assertAdmin(adminId);
  const a = await db.achievement.findUnique({ where: { id: achievementId } });
  if (!a) throw notFound("That achievement no longer exists.");
  if (a.status !== "PENDING") throw invalid("This achievement isn't waiting for review.");
  if (!approve && !note.trim()) throw invalid("Add a short note explaining why it couldn't be verified.");
  await db.$transaction(async (tx) => {
    await tx.achievement.update({
      where: { id: achievementId },
      data: approve
        ? { status: "VERIFIED", verifiedAt: new Date(), verifiedById: adminId, reviewNote: note || null }
        : { status: "REJECTED", verifiedAt: null, verifiedById: adminId, reviewNote: note },
    });
    await notify(
      a.userId,
      {
        type: approve ? "ACHIEVEMENT_VERIFIED" : "ACHIEVEMENT_REJECTED",
        title: approve ? `Your achievement “${a.title}” was verified` : `We couldn't verify “${a.title}”`,
        body: approve ? "It now counts in full toward your ranking." : note,
        link: "/settings/portfolio#achievements",
      },
      tx,
    );
  });
}

export async function resolveReport(adminId: string, reportId: string, action: "dismiss" | "actioned", note: string) {
  await assertAdmin(adminId);
  const r = await db.report.findUnique({ where: { id: reportId } });
  if (!r) throw notFound("Report not found.");
  await db.report.update({
    where: { id: reportId },
    data: { status: action === "dismiss" ? "DISMISSED" : "ACTIONED", resolvedById: adminId, resolvedAt: new Date(), resolutionNote: note || null },
  });
}

/** Suspension hides the account everywhere and ends its sessions. */
export async function setSuspended(adminId: string, userId: string, suspended: boolean) {
  await assertAdmin(adminId);
  if (adminId === userId) throw invalid("You can't suspend yourself.");
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { suspendedAt: suspended ? new Date() : null } }),
    ...(suspended ? [db.session.deleteMany({ where: { userId } })] : []),
  ]);
}
