// Hand-drawn style illustrations and icons. All decorative SVG is aria-hidden.

const Cloud = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity="0.9">
    <ellipse cx="0" cy="0" rx="46" ry="22" />
    <ellipse cx="-26" cy="6" rx="28" ry="16" />
    <ellipse cx="28" cy="6" rx="30" ry="17" />
    <ellipse cx="2" cy="-14" rx="26" ry="18" />
  </g>
);

const Tree = ({ x, y, s = 1, dark = false }: { x: number; y: number; s?: number; dark?: boolean }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-4" y="-6" width="8" height="40" rx="4" fill="#8a6a4f" />
    <ellipse cx="0" cy="-30" rx="28" ry="36" fill={dark ? "#5e9a5f" : "#7fb26f"} />
    <ellipse cx="-8" cy="-40" rx="10" ry="14" fill="#fff" opacity="0.12" />
  </g>
);

const Flower = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M0 0v12" stroke="#5e9a5f" strokeWidth="2" />
    {[0, 72, 144, 216, 288].map((a) => (
      <ellipse key={a} cx="0" cy="-5" rx="3" ry="5" fill="#fff" transform={`rotate(${a})`} />
    ))}
    <circle r="2.6" fill="#f5c64a" />
  </g>
);

function House({ x, y, roof }: { x: number; y: number; roof: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-6" y="-58" width="14" height="26" rx="3" fill="#e9ddc8" />
      <rect x="-46" y="-30" width="92" height="74" rx="8" fill="#fffaf0" />
      <path d="M-58 -24 L0 -74 L58 -24" fill="none" stroke={roof} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M-44 -30 L0 -66 L44 -30 Z" fill={roof} opacity="0.25" />
      <rect x="-12" y="8" width="24" height="36" rx="12" fill={roof} opacity="0.85" />
      <circle cx="6" cy="27" r="2" fill="#fffaf0" />
      <rect x="-36" y="-12" width="18" height="16" rx="4" fill="#d7ebf1" />
      <rect x="18" y="-12" width="18" height="16" rx="4" fill="#d7ebf1" />
      <path d="M0 -50c-3-4-9-1.5-6.5 3L0 -41l6.5-6c2.5-4.5-3.5-7-6.5-3z" fill="#e8806b" />
    </g>
  );
}

function Child({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* balloon */}
      <path d="M14 -46 C 18 -70, 30 -84, 34 -104" stroke="#8a7a6a" strokeWidth="1.5" fill="none" />
      <path d="M34 -104c-6-9-20-4-15 6l15 13 15-13c5-10-9-15-15-6z" fill="#e8806b" />
      {/* legs */}
      <path d="M-5 6 L-9 28 M5 6 L10 27" stroke="#6b4f3a" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="-10" cy="30" rx="6" ry="3.5" fill="#4e7d5b" />
      <ellipse cx="11" cy="29" rx="6" ry="3.5" fill="#4e7d5b" />
      {/* dress */}
      <path d="M-18 10 L0 -30 L18 10 Z" fill="#f5c64a" />
      <path d="M-18 10 Q0 16 18 10" fill="#f5c64a" />
      {/* arms */}
      <path d="M-8 -20 L-24 -6 M8 -20 L16 -44" stroke="#f2c6a5" strokeWidth="5" strokeLinecap="round" />
      {/* head */}
      <circle cx="0" cy="-42" r="15" fill="#f2c6a5" />
      <path d="M-16 -42 C -16 -62, 16 -62, 16 -42 C 12 -52, -6 -54, -16 -42 Z" fill="#7a4e33" />
      <circle cx="17" cy="-50" r="6" fill="#7a4e33" />
      <circle cx="-5" cy="-41" r="1.8" fill="#24312a" />
      <circle cx="6" cy="-41" r="1.8" fill="#24312a" />
      <path d="M-4 -34 Q1 -30 6 -34" stroke="#24312a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="-10" cy="-36" r="3" fill="#e8806b" opacity="0.45" />
      <circle cx="11" cy="-36" r="3" fill="#e8806b" opacity="0.45" />
    </g>
  );
}

/** Two homes on green hills, a path between them, a child with a heart balloon. */
export function HeroScene({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 600 470" className={className}>
      <Cloud x={120} y={80} s={0.9} />
      <Cloud x={360} y={50} s={0.7} />
      <Cloud x={540} y={150} s={0.6} />
      <g transform="translate(470 100)">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M0 -52 V-64" stroke="#f5c64a" strokeWidth="5" strokeLinecap="round" transform={`rotate(${i * 30})`} />
        ))}
        <circle r="38" fill="#f5c64a" />
        <circle r="38" fill="#fff" opacity="0.15" />
      </g>
      <path d="M0 250 C 120 190, 230 210, 320 240 C 420 270, 520 200, 600 215 V470 H0 Z" fill="#dcebcd" />
      <Tree x={60} y={250} s={0.9} />
      <Tree x={540} y={235} s={1.1} dark />
      <Tree x={575} y={260} s={0.7} />
      <path d="M0 320 C 100 270, 220 280, 300 300 C 400 325, 500 280, 600 290 V470 H0 Z" fill="#c8e1b0" />
      <House x={150} y={290} roof="#c9724d" />
      <House x={450} y={282} roof="#4a87a8" />
      <path d="M150 334 C 210 400, 270 330, 300 360 S 400 400, 450 326" fill="none" stroke="#f3e6bf" strokeWidth="16" strokeLinecap="round" />
      <path d="M150 334 C 210 400, 270 330, 300 360 S 400 400, 450 326" fill="none" stroke="#fffaf0" strokeWidth="4" strokeDasharray="2 12" strokeLinecap="round" />
      <path d="M0 400 C 140 365, 260 380, 330 395 C 430 415, 520 380, 600 385 V470 H0 Z" fill="#a9d18f" />
      <Child x={300} y={372} />
      {[[60, 420], [110, 440], [210, 430], [390, 440], [470, 425], [540, 445], [250, 455]].map(([x, y]) => (
        <Flower key={`${x}-${y}`} x={x!} y={y!} />
      ))}
    </svg>
  );
}

/** Soft wave between two sections. `fill` is the colour of the next section. */
export function Wave({ fill, flip = false, className = "" }: { fill: string; flip?: boolean; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 1440 90" preserveAspectRatio="none" className={`block w-full h-12 sm:h-20 ${className}`} style={flip ? { transform: "scaleY(-1)" } : undefined}>
      <path d="M0 50 C 240 10, 480 10, 720 45 C 960 80, 1200 80, 1440 40 V90 H0 Z" fill={fill} />
    </svg>
  );
}

/** Small meadow strip with flowers, used under cards. */
export function Meadow({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 60" className={className}>
      <path d="M0 40 C 100 20, 300 20, 400 40 V60 H0 Z" fill="#c8e1b0" />
      {[[40, 38], [120, 32], [200, 30], [280, 33], [360, 39]].map(([x, y]) => <Flower key={x} x={x!} y={y!} />)}
    </svg>
  );
}

type IconName = "mail" | "calendar" | "chat" | "folder" | "shield" | "clock" | "family" | "check" | "arrow" | "school" | "doctor" | "ball";
const PATHS: Record<IconName, string> = {
  mail: "M4 6h16v12H4z M4 7l8 6 8-6",
  calendar: "M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5 M8 14h3",
  chat: "M4 5h16v10H9l-5 4z M8 9h8 M8 12h5",
  folder: "M3 7h6l2 2h10v10H3z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2",
  family: "M7 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M17 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M3 20c0-4 2-6 4-6s4 2 4 6 M13 20c0-4 2-6 4-6s4 2 4 6",
  check: "M5 12l4 4 10-10",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  school: "M3 10l9-5 9 5-9 5z M7 12v4c0 1.5 2.5 3 5 3s5-1.5 5-3v-4",
  doctor: "M6 3v6a5 5 0 0 0 10 0V3 M11 14v2a4 4 0 0 0 8 0v-2 M19 12a2 2 0 1 0 0 .1",
  ball: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3.5 9.5c5 2 12 2 17 0 M3.5 14.5c5-2 12-2 17 0",
};
export function Icon({ name, className = "size-6" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src="/icon.svg" alt="" className="size-10" />
      <span className="leading-tight">
        <span className="block font-display text-xl font-semibold text-ink">Harmony</span>
        <span className="block text-[11px] text-muted">Deux maisons, un seul enfant</span>
      </span>
    </span>
  );
}
