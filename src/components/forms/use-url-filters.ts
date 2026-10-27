"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Keeps filter state in the URL so results are server-rendered, shareable and
 * survive refresh. Text input is debounced; other changes apply immediately.
 */
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = React.useTransition();
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const apply = React.useCallback(
    (updates: Record<string, string | string[] | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        next.delete(key);
        if (Array.isArray(value)) value.forEach((v) => next.append(key, v));
        else if (value) next.set(key, value);
      }
      next.delete("page");
      const qs = next.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [params, pathname, router],
  );

  const applyDebounced = React.useCallback(
    (updates: Record<string, string | null>, delay = 300) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => apply(updates), delay);
    },
    [apply],
  );

  React.useEffect(() => () => clearTimeout(timer.current), []);

  return { params, apply, applyDebounced, pending };
}
