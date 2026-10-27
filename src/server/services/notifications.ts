import "server-only";
import type { NotificationType, Prisma } from "@prisma/client";
import { db } from "@/server/db";

type Tx = Prisma.TransactionClient | typeof db;

export async function notify(
  userId: string,
  n: { type: NotificationType; title: string; body?: string; link?: string },
  tx: Tx = db,
) {
  await tx.notification.create({ data: { userId, type: n.type, title: n.title, body: n.body ?? "", link: n.link } });
}

export async function listNotifications(userId: string, take = 50) {
  return db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
}

export async function markAllRead(userId: string) {
  await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

export async function markRead(userId: string, id: string) {
  await db.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
}
