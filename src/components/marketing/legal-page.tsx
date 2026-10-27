export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-[44px] leading-[1.05] tracking-[-0.01em] sm:text-[52px]">{title}</h1>
      <p className="mt-3 text-sm text-muted">Last updated {updated}</p>
      {intro && <div className="mt-6 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-[13.5px] leading-relaxed text-ink-2">{intro}</div>}
      <div className="mt-10 space-y-8 text-[15.5px] leading-[1.75] text-ink-2 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-[-0.015em] [&_h2]:text-ink [&_li]:mt-1.5 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}
