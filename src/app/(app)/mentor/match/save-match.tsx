"use client";

import * as React from "react";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { saveProfileAction } from "@/actions/social";
import { Button } from "@/components/ui/button";

/** Saves a recommended person with the AI's reasoning attached as a private note. */
export function SaveMatchButton({ userId, note, saved: initial }: { userId: string; note: string; saved: boolean }) {
  const [saved, setSaved] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={pending}
      disabled={saved}
      onClick={async () => {
        setPending(true);
        const res = await saveProfileAction(userId, note.slice(0, 500) || "Saved from an AI match");
        setPending(false);
        if (!res.ok) return toast.error(res.error);
        setSaved(true);
        toast.success("Saved with the match notes");
      }}
    >
      {!pending && (saved ? <BookmarkCheck className="text-accent" /> : <Bookmark />)}
      {saved ? "Saved" : "Save match"}
    </Button>
  );
}
