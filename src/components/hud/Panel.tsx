/**
 * HUD panel with corner brackets (mission-control style).
 * AI-assisted code: written with Claude (Anthropic), reviewed by Team TAVME.
 */
import React from "react";

export function Panel({
  title,
  tag,
  right,
  children,
  className = "",
}: {
  title: string;
  tag?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`hud-panel relative border border-line bg-panel/80 ${className}`}>
      <span className="hud-corner left-[-1px] top-[-1px] border-l border-t" />
      <span className="hud-corner right-[-1px] top-[-1px] border-r border-t" />
      <span className="hud-corner bottom-[-1px] left-[-1px] border-b border-l" />
      <span className="hud-corner bottom-[-1px] right-[-1px] border-b border-r" />
      <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex items-center gap-2">
          {tag && <span className="font-mono text-[10px] text-accent">{tag}</span>}
          <h2 className="font-display text-[13px] font-semibold uppercase tracking-[0.14em] text-ink">{title}</h2>
        </div>
        {right}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

export function Stat({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`font-mono text-xl leading-tight ${accent ? "text-accent" : "text-ink"}`}>{value}</div>
    </div>
  );
}
