import "server-only";
import { db } from "@/server/db";

export async function getShellCounts(userId: string) {
  const [invitations, applications, notifications] = await Promise.all([
    db.collaborationInvitation.count({ where: { recipientId: userId, status: "PENDING" } }),
    db.projectApplication.count({
      where: {
        status: "PENDING",
        project: { status: "ACTIVE", members: { some: { userId, role: { in: ["OWNER", "ADMIN"] } } } },
      },
    }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { requests: invitations + applications, notifications };
}
