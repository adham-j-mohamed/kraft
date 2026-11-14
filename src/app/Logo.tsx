/** Märket (hantel på lime) och ordmärket. Ingen klientlogik, så det går att använda överallt. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
        <rect width="64" height="64" rx="14" fill="#b7f34a" />
        <g fill="#10150c">
          <rect x="8" y="22" width="7" height="20" rx="2" />
          <rect x="16" y="16" width="7" height="32" rx="2" />
          <rect x="23" y="29" width="18" height="6" />
          <rect x="41" y="16" width="7" height="32" rx="2" />
          <rect x="49" y="22" width="7" height="20" rx="2" />
        </g>
      </svg>
      <span className="text-accent text-sm font-bold tracking-[0.18em] uppercase">Kraft</span>
    </span>
  );
}
