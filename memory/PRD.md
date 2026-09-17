# Inc.hood — Product Requirements & Handoff

## Original problem statement
https://capsul-eight.vercel.app/zone

Bro gue mau lu pake website ini, tapi ganti konsepnya

Pertama namanya jadi Inc.hood, konsepnya bukan pokemon card reward coin gitu tapi ubah jadi konsep rewardnya RWA, kaya Nvda, gme, Gld, dll gitu

Kedua ini untuk projek di robinhood chain jadi seusiakan sistemnya

Ketiga konsep nya kaya beli incubationnya pake token INC gitu > terus incubation > selama 2 jam reward RWA random , random nominal juga , ketika 2 jam juga token INC yg dibeli untuk incubation bakal dibalikin 75%, sisa 25% nya di burn selamanya, untuk ekosistem grow gitu

Keempar jangan pake poke ball lagi tapi sesuaikan sajaa incubationnya karna konsep bukan pokemon lagi,

Ganti tiap kata deskripsi dll maaukin swsuai konsep dan juga sesuai chain robinhood

Paham? Coba ask me

## Confirmed choices
- Interactive demo only; no real tokens, funds, wallet, blockchain transactions, or securities.
- Example NVDA, GME, GLD, TSLA, AAPL rewards with sample ranges/probabilities; owner will eventually define exact assets/economics.
- Owner said they would determine cost but supplied no figure. Default 100 INC is explicitly illustrative and editable (1–100,000 whole INC).
- Preserve the reference Zone structure while completely rebranding and redesigning without Pokémon imagery.
- Elegant, sophisticated/pro-style visual interface, not generic/mainstream.
- Conversation in casual Indonesian. App uses international English brand copy similar to reference.

## Personas and core requirements
- Project owner exploring incubation mechanics/tokenomics and presenting an Inc.hood prototype.
- Demo participant starting a cycle, watching its timer, discovering a reward, and tracking assets.
- Core cycle: commit INC → 7,200 seconds → random RWA + random amount → automatic 75% return and 25% burn → claim RWA.
- All copy and imagery relate to incubation and Robinhood Chain RWA concept, never Pokémon.
- Responsive first-screen Zone (not marketing landing), portfolio, reward pool, and protocol transparency.

## Architecture decisions
- React 19 / React Router / Shadcn dialogs, buttons, accordion / Sonner / Lucide.
- Three.js creates six custom hexagonal quantum pods and a full-bleed hero scene, no stock images needed for actual hardware models. Animated core, pointer interaction, reduced-motion support, WebGL fallback, render-ready data attribute.
- FastAPI/Motor/MongoDB. Protected `.env` URLs retained. All requests use REACT_APP_BACKEND_URL + `/api`.
- Browser-local anonymous DEMO workspace ID in `localStorage: inc-hood-demo`. This is not user authentication and must not hold real value/private account data.
- One Mongo `demo_workspaces` document per sandbox. Atomic versioned replacement protects concurrent starts, claims, and settlement. Pydantic responses; `_id` excluded from every database read.
- Cycle timestamps stored server-side. State polling every 5 seconds and every mutation settles expired cycles; reopening a browser settles missed completions. No browser-dependent timer or actual background on-chain burn.
- Whole-number INC commits allow exact quarter-unit returns/burns. USD amounts random integer cents; reference quantities calculated from fixed example prices.
- Cryptographically sourced Python random choice for DEMO distribution; not audited on-chain randomness. Odds: NVDA25%, GME20%, GLD20%, TSLA20%, AAPL15%. Same odds/ranges for all cosmetic pod series and all stake amounts.
- Limits: 200 cycles / workspace, 250 retained activity events, 1,000,000 available balance top-up limit, reset with confirmation.

## Implemented — 2026-09-17
- Premium graphite/green terminal interface, responsive navigation/watchlist, technical 3D hero, six Core/Prism/Onyx incubation pods, distinct accent colors.
- Functional Zone status and series filters, sorting, grid/list, counts, empty states, metrics, protocol sidebar.
- Configurable start amount with balance/validation/75–25 breakdown; two-hour persisted countdown; demo-only Skip2h completes active cycles.
- Random reward reveal animation, claim-once behavior, returned/burned summaries, restart claimed pods.
- Separate My Incubations route with active pods, holdings/quantities, claimed value, and full timestamped activity.
- Separate RWA Pool with example prices, ranges, probability details and explicit non-live labels.
- Separate Protocol page with cycle explanation, dynamic cost example, 75/25 visual, chain disclaimer, FAQ and treasury caveat.
- Demo balance panel, +10,000 INC top-up, editable default cost, reset/cancel/confirm.
- Demo and independent/non-affiliated disclosure. No claims that illustrated tickers are officially available on Robinhood Chain. No guarantees that burn creates growth.
- Error/loading/retry states, disabled duplicate clicks, concurrency protection, insufficient funds feedback, mobile-safe notifications.
- Metadata renamed to Inc.hood. No real auth accounts or credentials.

## API surface
- GET `/api/`, GET `/api/catalog`
- POST `/api/demo/sessions`
- GET `/api/demo/{id}`
- POST `/api/demo/{id}/start` {pod_id, amount}
- POST `/api/demo/{id}/fast-forward`
- POST `/api/demo/{id}/claim/{run_id}`
- PATCH `/api/demo/{id}/settings` {cost}
- POST `/api/demo/{id}/top-up`, POST `/api/demo/{id}/reset`

## Verification — 2026-09-17
- Production frontend build passed.
- Testing agent: 20/20 backend tests passed including concurrent starts/claims, natural timestamp expiry, validation, repeated settlement, max stakes, settings/topup/reset.
- Desktop1920×800 and mobile390×844: full start → skip → reveal → claim, navigation, pool/FAQ, portfolio, filters/list and dialogs passed. No horizontal overflow.
- Main confirmed 7 nonblank canvases on desktop/mobile using 2D copies of rendered WebGL buffers. Three.js render-ready hook added for reliable automation.
- Testing report `/app/test_reports/iteration_1.json`: no functional blockers; two small visual issues fixed (RWA hero wording, CTA icon alignment). Randomized regression test corrected to validate per-asset bounds rather than incorrectly requiring all rewards ≥$15.
- Regression files `/app/backend/tests/test_demo_api_regression.py`, `/app/backend/tests/conftest.py`.
- Final rerun after polish: 20/20 tests passed again; desktop/mobile Three.js buffer comparisons confirmed motion; start/reveal/claim and all overflow checks passed. Modal entry animation refined to keep centering stable while fading in.

## Prioritized backlog / next tasks
### P0 — required for current demo
- None outstanding after final visual verification.
### P1 — owner decisions / visible next features
- Obtain final price, reward universe, ranges and probabilities; owner has not supplied definitive economics.
- Optional visible reward editor with validated total probability100% for owner experimentation.
- Optional tokenomics simulator comparing cycle volume, refund, supply burn, and reward treasury funding (avoid guarantees).
### P2 — optional enhancements
- Shareable reward-result cards branded Inc.hood.
- Collection achievements and local milestone celebrations.
- Indonesian/English interface toggle if requested.
- Real blockchain integration explicitly out of current scope; do not initiate or suggest activation unprompted. Would require independently verified network/contracts, supported assets, funded treasury, audited randomness and user-requested auth/wallet integration playbook.

## Important constraints
- All token balances, RWA assets/prices, burns, and fast-forward actions are sandbox simulations. Backend persistence and action processing are genuinely implemented.
- No integration credentials required. Never invent contract addresses, real market quotes, Robinhood endorsement, or real asset availability.
