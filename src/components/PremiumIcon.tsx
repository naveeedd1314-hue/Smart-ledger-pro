import React from "react";

type IconName = "dashboard" | "sales" | "products" | "purchases" | "customers" | "suppliers" | "payments" | "expenses" | "reports" | "ledger" | "inventory" | "ai" | "settings";
type Tone = "emerald" | "teal" | "gold" | "blue" | "coral" | "sage";

const paths: Record<IconName, React.ReactNode> = {
 dashboard: <><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="11" width="7" height="10" rx="2"/><rect x="3" y="14" width="8" height="7" rx="2"/></>,
 sales: <><path d="M4 5h2l2.2 10.5h9.9l2-7.5H7"/><circle cx="10" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/><path d="M12 3v6m-3-3h6"/></>,
 products: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 8 9 5 9-5M3 8v9l9 5 9-5V8M12 13v9"/></>,
 purchases: <><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h5M8 17h8"/><path d="m16 3 3 3"/></>,
 customers: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2H3Z"/><path d="M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5v1"/></>,
 suppliers: <><path d="M3 21V8l9-5 9 5v13"/><path d="M8 21v-6h8v6M7 10h2m6 0h2"/></>,
 payments: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18m-13 5h4"/><circle cx="17" cy="15" r="1"/></>,
 expenses: <><path d="M12 2v20M17 6H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6"/></>,
 reports: <><path d="M4 20V4m0 16h17"/><path d="m7 15 4-4 3 2 6-7"/><path d="M16 6h4v4"/></>,
 ledger: <><path d="M5 3h14v18H5z"/><path d="M8 7h8M8 11h8M8 15h5"/></>,
 inventory: <><path d="M3 7 12 3l9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/></>,
 ai: <><path d="M12 3 14 9l6 3-6 2-2 7-2-7-6-2 6-3 2-6Z"/><path d="m19 2 .8 2.2L22 5l-2.2.8L19 8l-.8-2.2L16 5l2.2-.8L19 2Z"/></>,
 settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.5 2.6-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.9h-3l-.3-1.9a8 8 0 0 1-1.7-1l-1.7.7-1.5-2.6 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.5-2.6 1.7.7a8 8 0 0 1 1.7-1L12.7 7h3l.3 1.9a8 8 0 0 1 1.7 1l1.7-.7 1.5 2.6-1.4 1.1a7 7 0 0 1-.1 2Z"/></>
};

const tones: Record<Tone, string> = {
 emerald: "emerald", teal: "teal", gold: "gold", blue: "blue", coral: "coral", sage: "sage"
};

export default function PremiumIcon({ name, tone = "emerald", size = 42, className = "" }: {
 name: IconName; tone?: Tone; size?: number; className?: string;
}) {
 return <span className={`sl-premium-icon sl-icon-${tones[tone]} ${className}`} style={{width:size,height:size}} aria-hidden="true">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
 </span>;
}
