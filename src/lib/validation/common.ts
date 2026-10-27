import { z } from "zod";

/** Trims and collapses control characters; rejects strings that are only whitespace when min > 0. */
export const text = (max: number, min = 0) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim())
    .pipe(z.string().min(min, min > 0 ? `Must be at least ${min} characters` : undefined).max(max, `Keep this under ${max} characters`));

/** Optional http(s) URL. Empty string becomes null. */
export const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .transform((s) => (s === "" ? null : s))
  .refine((s) => {
    if (s === null) return true;
    try {
      const u = new URL(s);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a full link starting with https://")
  .nullable();

export const tagList = (maxItems: number, maxLen = 40) =>
  z
    .array(text(maxLen, 1))
    .max(maxItems, `Choose up to ${maxItems}`)
    .transform((items) => Array.from(new Set(items.map((i) => i.trim()))).filter(Boolean));

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}(-\d{2})?$/, "Use a valid date")
  .transform((s) => new Date(s.length === 7 ? `${s}-01T00:00:00Z` : `${s}T00:00:00Z`))
  .refine((d) => !Number.isNaN(d.getTime()), "Use a valid date");

export const id = z.string().min(1).max(64);
