# Interface design and accessibility

## Current 0.8 arcade

See `12-v8-arcade.md`. Only the special games change: original code-native Canvas art, explicit Start/Pause/Resume, responsive square playfield, readable HUD, large flap/steering buttons, lane-tap/keyboard alternatives and a practice page. The 0.7 card/flag/photo/policy UI stays. Reduced motion suppresses cosmetic movement/particles; both optional courses can be skipped. No commercial sprites or generated raster art were added.

## Current0.7 refinement

See11-v7-refinement.md. Minimal COP31 / Cryosphere Pavilion / APECS form; flagged searchable dropdown rather than a full-screen picker. Centered round gems; seven filled/empty resource points coloured red/amber/green, with income and reference approval; coin engraving and exact card-effect numbers. Card tap opens inspection; a44px check selects immediately. Play/Shuffle/Skip share the main row. Shelf-grid Library and History are secondary. Result box has limited replay. Public display uses rank/flag/name/score and a QR invitation only. All51card photos are distinct local files, lazy loaded, with details/credits attribution. Modern popovers have a fixed-dropdown fallback, outside/focus dismissal and Escape support. Physical iPhone/Safari remains a separate test.

## Preserved0.6 phone experience

See `10-v6-experience.md` for the active interaction contract. Home has a short APECS/Cryosphere Futures title, name and searchable SVG-flag country picker. Main card taps select and focus; a separate info button opens details. Resource bars use bands and short explanations. Larger Shuffle shares the action row with Play. The ten round gems mark 4 and 7 in purple. Family frames are more saturated; rare cards use gold framing/glow, while selection uses a mint outline and check.

Background and card photos are real NASA archive photographs, compressed locally with captions/credits in `/credits` and `public/art/photos/credits.json`; generated atlases remain unused historical assets. Flags are local flag-icons SVGs under MIT, lazy loaded. Sounds are original Web Audio tones, activated by interaction and governed by a persistent mute setting. Cosmetic motion follows reduced-motion preference. The two challenge motions are essential gameplay, with keyboard controls and a skip alternative.

Primary visual references include Mega Crit's official press material and November 2024 touch-target/rarity discussion, plus official Steam storefront screenshots/trailer frames for Slay the Spire, Paladins and Balatro. Research captures are ignored under screenshots/references. No commercial art/code was copied. Browser-control startup was unavailable, so the local portable workflow used isolated Playwright/Edge for research and QA. UI/UX guidance informed target sizes, visible selection, modal focus, progressive disclosure and narrow-screen fit; the suggested 3D style was not suitable for this lightweight game.

## Preserved 0.5 planning-session revision

Remove the calendar/year strip for new games. All policies are adopted in 2026; the compact counter describes planning rounds 1–10. Card selection is separate from commitment: select one or several within the shown total budget, then Play selected. Playing keeps the round open; End round advances planning and allocation, while an untouched round offers Skip and saving. Existing hand navigation, compact HUD, Library, dialogs, keyboard access and reduced motion remain. Simulator input units and provenance are disclosed in expandable card/result details, never shown as a computed temperature. Saved earlier games keep their dated display and single-action flow.

## Historical 0.4 mechanics disclosure

Retain the compact board and home form. Fourteen years display as seven pairs with two progress pips, showing the current five-year value. Library opens the same native dialog as Played/Buffs/Stats, with search, pathway filter, tier, current effective cost/approval, prerequisite reason and successor titles. All eleven combination recipes are available before activation, with completed ingredients marked. No research tree dashboard is added to the board. Resilience and score weights are visible in Stats; transition uses the version's target (180 for 0.4).

UI/UX Pro Max guidance was used for progressive disclosure, visible modal focus, native controls, touch targets and reduced motion. Reshuffle feedback disappears after 2.5s. Card-face "Modified" is neutral because modifiers can include a surcharge or disruption, not only a positive combo. New cards reuse existing original artwork; no art generation in this revision.

## Established phone-first direction — before the 0.5 timing correction

The user replaced the marketing/dashboard layout. `/` is only one centred nickname/country form and Play, without header, footer, resume button, hero or consent checkbox. Country options include flag glyphs (native iPhone rendering); one short public-leaderboard disclosure is linked to Play. Recovery storage still permits refreshing `/play`.

`/play` is a single dynamic-height playfield: small year strip, five slim resource bars left, credits right, an illustrated three-card hand and short Play/Skip controls. Portrait phones show the central card at full size with the other cards peeking to the sides. Previous/next buttons and three selector dots provide touch and keyboard alternatives; no swipe is required. Desktop shows all three cards. Played cards, buffs, debuffs and stat explanations live in a native dialog rather than permanent dashboard sections. Results fit the same playfield. At accessibility zoom layouts may grow instead of hiding controls; dialogs can scroll.

References: inspected gameplay frames and the trailer on [Mega Crit's official Steam listing](https://store.steampowered.com/app/646570/Slay_the_Spire/), linked from the [developer's games page](https://www.megacrit.com/games/). The YouTube trailer was CAPTCHA-blocked and not bypassed. The developer's [GDC presentation](https://media.gdcvault.com/gdc2019/presentations/Yano_Casey_SlayTheSpire.pdf) stresses fewer words, UX and iterative redesign. Applied design principles: cost orb, concise effects, family framing, hand emphasis, persistent perk synergies and explicit risks. No proprietary images, code, owned deck or combat system copied. Original polar art retained.

The UI/UX automatic design-system result suggested a marketing showcase; rejected because it contradicts user intent. The narrower style search matched tactile/micro-interaction patterns; the UX search verified viewport, touch spacing and target-size guidance. Sites remains local-only. Verification is recorded separately in Progress.

## Earlier design (superseded on player screens)

The game-experience upgrade uses a cinematic polar fjord background, dark navy framing, parchment-like illustrated cards and warm gold actions. Technology is icy blue, politics gold, economics emerald, justice purple, awareness coral and nature olive. Every family also has a text label and icon. Editorial serif headings contrast with system sans-serif controls.

## Screens

| Route | Purpose |
| --- | --- |
| `/` | Short briefing, nickname, country and public-display consent |
| `/play` | Seven-round board, four resource panels, three offers, saving and turn receipts; final results reuse this route |
| `/leaderboard` | Shared display, QR code, standings, connection state and fullscreen control |
| `/admin` | Organiser login, result moderation and CSV export |
| `/about` | Rules, climate justice framing, privacy, sources and explicit model limitations |

Motion animates dealt cards, selection and turn changes using transforms and opacity. Desktop hover lifts the framed card and adds a brief sheen; inspection is an explicit button action, not hover-only. A native dialog previews resource changes, risk and perk effects before commitment. Five HUD panels show resources, and a separate transition game meter never represents real ice loss. The six family progress tokens can be expanded to explain their perks. Mobile cards become illustrated compact vertical entries rather than unreadably narrow desktop cards.

There is no WebGL, heavy game engine or remote font dependency. MotionConfig follows reduced-motion preference and the experience CSS removes hover transforms and decorative sheen under reduced motion. Art is compressed into a 223 KB background and a 513 KB eight-scene atlas, loaded from project-local files. Effects are cosmetic; gameplay never waits for an animation-end event.

Resource HUDs show a short plain-language purpose by default. Clicking or keyboard-expanding a resource reveals its detailed rule, keeping the initial board focused on the card choices. Every card's main button has a stretched hit area so the picture and body are also clickable without adding duplicate keyboard stops. Unaffordable cards can still be inspected; only committing them is disabled.

The UI has semantic headings, labelled controls, a skip link, visible focus, a native modal dialog, text-described resource meters and minimum-height action buttons. Browser tests check horizontal overflow at 375, 768, 1024 and 1440 pixels and complete a game on a 390-pixel phone viewport. Automated checks are not a full accessibility audit; manual contrast, screen-reader and touch-device testing remain required.

Country options are serialized from the server rather than regenerated during hydration. Browser and Node Intl region labels can differ, so independently generating both lists causes a hydration error.

## Open source and asset provenance

[Motion](https://motion.dev/) supplies open-source animation primitives. [Its accessibility guidance](https://motion.dev/docs/react-accessibility) informs reduced-motion handling. Lucide supplies interface icons, and qrcode.react draws the join code. Original generated raster landscapes provide game and card art; CSS supplies the frames and interaction effects. The earlier original SVG polar scene remains available but is not used in the new lobby. No art or source code was copied from Slay the Spire or another proprietary game.

The UI/UX skill's automatic “3D and Hyperrealism” suggestion was unsuitable for this light mobile game. A restrained polar card interface was selected instead. The Sites skill's local-only workflow applies: no hosting registration, source sync or publication.

On 13 October, the user explicitly requested a stronger game aesthetic. The targeted skill search matched tactile interaction patterns; its React state query had no verified database match, so implementation uses existing React/Motion conventions and general accessibility guidance. Original raster art was generated with the built-in image tool; prompts and asset mapping are in `public/art/PROVENANCE.md`. No Slay the Spire artwork or source was copied.
