export function PolarScene({ compact = false }: { compact?: boolean }) {
  return <svg className={`polar-scene ${compact ? "compact" : ""}`} viewBox="0 0 900 600" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="sea" x1="450" y1="290" x2="450" y2="600" gradientUnits="userSpaceOnUse"><stop stopColor="#16667a"/><stop offset="1" stopColor="#082932"/></linearGradient>
      <linearGradient id="ice" x1="420" y1="170" x2="570" y2="470" gradientUnits="userSpaceOnUse"><stop stopColor="#efffff"/><stop offset="1" stopColor="#77c8d6"/></linearGradient>
      <linearGradient id="below" x1="430" y1="330" x2="460" y2="570" gradientUnits="userSpaceOnUse"><stop stopColor="#5cd3d2" stopOpacity=".45"/><stop offset="1" stopColor="#247786" stopOpacity=".04"/></linearGradient>
    </defs>
    <circle cx="630" cy="130" r="67" fill="#d4f4df" opacity=".08"/>
    <circle cx="630" cy="130" r="42" fill="#d4f4df" opacity=".12"/>
    <path d="M0 310L80 287L146 306L233 259L310 309L410 282L495 313L628 266L764 309L835 280L900 300V600H0Z" fill="#13424f"/>
    <path d="M0 329H900V600H0Z" fill="url(#sea)"/>
    <path d="M221 337L363 179L418 160L490 236L575 257L675 340Z" fill="url(#ice)"/>
    <path d="M221 337L363 179L418 160L396 291L345 337Z" fill="#dff6f3"/>
    <path d="M418 160L490 236L448 266L396 291Z" fill="#a5dbe4"/>
    <path d="M448 266L490 236L575 257L536 297L586 337H345L396 291Z" fill="#c1eef1"/>
    <path d="M536 297L575 257L675 340H586Z" fill="#83c5d5"/>
    <path d="M226 349L390 564L448 590L632 349Z" fill="url(#below)"/>
    <path d="M390 564L448 590L481 353L411 349Z" fill="#40b5c6" opacity=".09"/>
    <path d="M93 344H721M182 359H684M248 380H597M316 411H537M390 476H495" stroke="#8ce0dc" strokeOpacity=".18" strokeWidth="2" strokeLinecap="round"/>
    <path d="M57 421H148M687 415H826M71 508H237M578 514H762M291 542H335M733 558H875" stroke="#62c7c7" strokeOpacity=".16" strokeWidth="2" strokeLinecap="round"/>
    <path d="M72 198L103 202L123 214L94 208Z" fill="#b9dddc" opacity=".7"/>
    <path d="M146 168L165 171L178 180L157 175Z" fill="#b9dddc" opacity=".45"/>
  </svg>;
}
