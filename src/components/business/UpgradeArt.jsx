/** Two shop fronts joined by a switch — plain SVG in theme colours (no images). */
export default function UpgradeArt({ className }) {
  const shop = (x, tone) => (
    <g transform={`translate(${x} 0)`}>
      <rect x="0" y="34" width="96" height="74" rx="12" className="fill-surface" />
      <path d="M0 46 Q0 30 14 30 H82 Q96 30 96 46 V50 H0 Z" className={tone} />
      {[0, 24, 48, 72].map((s) => <path key={s} d={`M${s} 50 Q${s + 12} 64 ${s + 24} 50`} className={tone} />)}
      <rect x="14" y="66" width="26" height="42" rx="5" className="fill-fill" />
      <rect x="50" y="66" width="32" height="20" rx="5" className="fill-fill" />
      <rect x="54" y="92" width="24" height="5" rx="2.5" className="fill-line-strong" />
    </g>
  );
  return (
    <svg viewBox="0 0 280 130" className={className} role="img" aria-label="Two businesses, one login">
      {shop(10, 'fill-brand')}
      {shop(174, 'fill-highlight')}
      <circle cx="140" cy="72" r="22" className="fill-surface" />
      <path d="M128 66 H150 l-5 -5 M152 78 H130 l5 5" className="fill-none stroke-brand-ink" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
