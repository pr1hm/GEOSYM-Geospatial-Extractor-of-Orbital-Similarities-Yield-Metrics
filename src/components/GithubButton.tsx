/**
 * Navbar button that opens the project's GitHub repository in a new tab.
 * AI-assisted code: written with Claude (Anthropic), reviewed by Team TAVME.
 */
export const REPO_URL = "https://github.com/pr1hm/GEOSYM-Geospatial-Extractor-of-Orbital-Similarities-Yield-Metrics";

export function GithubButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open the GEOSYM source code on GitHub (opens in a new tab)"
      title="Source code on GitHub"
      className={`flex items-center gap-2 border border-accent px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-accent transition-colors hover:bg-accent hover:text-bg ${className}`}
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
      <span className="hidden sm:inline">GitHub</span>
      <span className="hidden sm:inline" aria-hidden="true">↗</span>
    </a>
  );
}
