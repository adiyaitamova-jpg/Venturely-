"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Bookmark, BookmarkCheck, Flag, MoreHorizontal, Pencil, Send, Share2 } from "lucide-react";
import { blockUserAction, saveProfileAction, unsaveProfileAction } from "@/actions/social";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InviteDialog, type InviteOption } from "@/components/project/invite-dialog";
import { ReportDialog } from "./report-dialog";

export function SaveButton({ userId, saved: initial, size = "md" }: { userId: string; saved: boolean; size?: "sm" | "md" }) {
  const [saved, setSaved] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  return (
    <Button
      variant="secondary"
      size={size}
      aria-pressed={saved}
      loading={pending}
      onClick={async () => {
        setPending(true);
        const res = saved ? await unsaveProfileAction(userId) : await saveProfileAction(userId);
        setPending(false);
        if (!res.ok) return toast.error(res.error);
        setSaved(!saved);
        toast.success(saved ? "Removed from saved" : "Saved to your list");
      }}
    >
      {!pending && (saved ? <BookmarkCheck className="text-accent" /> : <Bookmark />)}
      {saved ? "Saved" : "Save"}
    </Button>
  );
}

export function InviteButton({
  recipient,
  options,
  size = "md",
  variant = "primary",
  defaultMessage,
}: {
  recipient: { id: string; displayName: string };
  options: InviteOption[];
  size?: "sm" | "md";
  variant?: "primary" | "secondary";
  defaultMessage?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size={size} variant={variant} onClick={() => setOpen(true)}>
        <Send /> Invite to project
      </Button>
      <InviteDialog open={open} onOpenChange={setOpen} recipient={recipient} options={options} defaultMessage={defaultMessage} />
    </>
  );
}

export function ProfileActions({
  isOwner,
  signedIn,
  user,
  saved,
  inviteOptions,
}: {
  isOwner: boolean;
  signedIn: boolean;
  user: { id: string; displayName: string; username: string };
  saved: boolean;
  inviteOptions: InviteOption[];
}) {
  const router = useRouter();
  const [reportOpen, setReportOpen] = React.useState(false);

  const share = async () => {
    const url = `${window.location.origin}/u/${user.username}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  if (isOwner) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary">
          <Link href="/settings/profile">
            <Pencil /> Edit profile
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/settings/portfolio">Manage portfolio</Link>
        </Button>
        <Button variant="ghost" size="icon" onClick={share} aria-label="Copy profile link">
          <Share2 />
        </Button>
      </div>
    );
  }
  if (!signedIn) {
    return (
      <Button asChild>
        <Link href={`/sign-up?next=/u/${user.username}`}>Join to collaborate</Link>
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <InviteButton recipient={user} options={inviteOptions} />
      <SaveButton userId={user.id} saved={saved} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={share}>
            <Share2 /> Copy profile link
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setReportOpen(true)}>
            <Flag /> Report
          </DropdownMenuItem>
          <ConfirmDialog
            trigger={
              <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                <Ban /> Block
              </DropdownMenuItem>
            }
            title={`Block ${user.displayName}?`}
            description="You won't see each other in discovery, matching or leaderboards, and neither of you can invite the other. Pending requests between you are cancelled. They aren't notified."
            confirmLabel="Block"
            destructive
            onConfirm={async () => {
              const res = await blockUserAction(user.id);
              if (!res.ok) return toast.error(res.error);
              toast.success(`${user.displayName} is blocked`);
              router.push("/discover");
            }}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="USER" targetId={user.id} subject={user.displayName} />
    </div>
  );
}
