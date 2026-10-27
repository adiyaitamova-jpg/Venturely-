import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Server-rendered pagination that preserves existing query params. */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | string[] | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
      else if (v) q.set(k, v);
    }
    if (p > 1) q.set("page", String(p));
    else q.delete("page");
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const linkCls = "inline-flex h-8 items-center gap-1 rounded-md border border-line bg-surface-raised px-3 text-[13px] text-ink-2 shadow-xs transition-colors hover:bg-paper-2";
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3">
      <p className="text-[13px] text-muted tabular">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={linkCls} rel="prev">
            <ChevronLeft className="size-4" aria-hidden /> Previous
          </Link>
        ) : (
          <span className={cn(linkCls, "pointer-events-none opacity-40")} aria-disabled>
            <ChevronLeft className="size-4" aria-hidden /> Previous
          </span>
        )}
        {page < pages ? (
          <Link href={href(page + 1)} className={linkCls} rel="next">
            Next <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span className={cn(linkCls, "pointer-events-none opacity-40")} aria-disabled>
            Next <ChevronRight className="size-4" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}
