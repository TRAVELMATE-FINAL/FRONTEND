/* ─────────────────────────────────────────────────────────────────
   FloatingIconsBg
   ---------------
   Decorative pink icons that fan out from dead-centre on mount.
   Use it as a sibling of the actual content inside any section that
   has `position: relative; overflow: hidden`. The component is
   pointer-events:none so it never blocks clicks on overlapping
   content (e.g. the search bar that sits above it).

   Used by:
     • <Hero> (home / find-ride page)
     • <Findfriend> top search bar wrapper
   ───────────────────────────────────────────────────────────────── */
import './FloatingIconsBg.css';

/* Resting offsets (in px) from the hero's centre. Matches the Figma
   reference — 5 icon types arranged in left + right clusters. */
const FLOATING_ICONS = [
  // ─── LEFT cluster ──────────────────────────────
  { type: 'bike',   x: -620, y: -200, size: 50, delay: 0.06 },
  { type: 'pop',    x: -700, y:  100, size: 52, delay: 0.10 },
  { type: 'car',    x: -500, y:  -40, size: 42, delay: 0.14 },
  { type: 'heart',  x: -540, y:  220, size: 44, delay: 0.18 },
  { type: 'people', x: -340, y:  120, size: 40, delay: 0.22 },
  // ─── RIGHT cluster ─────────────────────────────
  { type: 'pop',    x:  680, y: -200, size: 52, delay: 0.08 },
  { type: 'heart',  x:  540, y: -100, size: 44, delay: 0.12 },
  { type: 'bike',   x:  300, y:   40, size: 50, delay: 0.16 },
  { type: 'car',    x:  430, y:  150, size: 42, delay: 0.20 },
  { type: 'people', x:  560, y:  240, size: 40, delay: 0.24 },
];

function FloatIcon({ type, size }) {
  const fill   = '#e879c4';
  const stroke = '#ec4899';
  switch (type) {
    case 'bike':
      return (
        <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
          <g stroke={stroke} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="22" cy="9" r="2.6" fill={fill} />
            <path d="M19 12 L20 19 L26 17 L28 23" />
            <path d="M22 12 L28 10" />
            <path d="M9 28 L 16 24 L 22 28 L 29 24" />
            <circle cx="9"  cy="29" r="4.4" />
            <circle cx="29" cy="29" r="4.4" />
          </g>
        </svg>
      );
    case 'car':
      return (
        <svg viewBox="0 0 40 32" width={size} height={size * 0.8} aria-hidden="true">
          <g stroke={stroke} strokeWidth="2.2" fill="none" strokeLinejoin="round" strokeLinecap="round">
            <path d="M4 22 L 6 14 Q 8 11 12 11 L 28 11 Q 32 11 34 14 L 36 22 L 36 25 L 4 25 Z" />
            <line x1="10" y1="14" x2="30" y2="14" />
            <circle cx="12" cy="26" r="2.8" fill={fill} />
            <circle cx="28" cy="26" r="2.8" fill={fill} />
          </g>
        </svg>
      );
    case 'people':
      return (
        <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden="true">
          <g stroke={stroke} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="11" r="3.6" fill={fill} />
            <circle cx="24" cy="11" r="3.6" fill={fill} />
            <path d="M5 30 Q 5 19 12 19 Q 18 19 18 30" />
            <path d="M18 30 Q 18 19 24 19 Q 31 19 31 30" />
          </g>
        </svg>
      );
    case 'pop':
      return (
        <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden="true">
          <g fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 32 L 13 23 L 17 27 Z" />
            <path d="M13 23 L 22 13" stroke={stroke} strokeWidth="2.2" fill="none" />
            <circle cx="24" cy="8"  r="1.8" />
            <circle cx="30" cy="12" r="1.5" />
            <circle cx="20" cy="4"  r="1.4" />
            <circle cx="32" cy="20" r="1.6" />
            <path d="M27 16 L 29 14" stroke={stroke} strokeWidth="2.2" fill="none" />
            <path d="M25 22 L 27 20" stroke={stroke} strokeWidth="2.2" fill="none" />
          </g>
        </svg>
      );
    case 'heart':
      return (
        <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden="true">
          <g stroke={stroke} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M28 7 Q 12 7 12 18 Q 12 30 28 30" />
            <path d="M18 17 Q 17 14.6 14.5 14.6 Q 12 14.6 12 17.4 Q 12 20.5 18 23.5 Q 24 20.5 24 17.4 Q 24 14.6 21.5 14.6 Q 19 14.6 18 17 Z" fill={fill} />
          </g>
        </svg>
      );
    default:
      return null;
  }
}

export default function FloatingIconsBg() {
  return (
    <div className="floating-icons-bg" aria-hidden="true">
      {FLOATING_ICONS.map((it, i) => (
        <span
          key={i}
          className={`floating-icons-bg__wrap floating-icons-bg__wrap--${it.type}`}
          style={{
            '--x': `${it.x}px`,
            '--y': `${it.y}px`,
            '--delay': `${it.delay}s`,
          }}
        >
          <span className="floating-icons-bg__icon">
            <FloatIcon type={it.type} size={it.size} />
          </span>
        </span>
      ))}
    </div>
  );
}
