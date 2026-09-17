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

## Update — animated watchlist and product-only copy (2026-09-17)
### User request, verbatim
"Bro pertama RWA watchlist ko gak jalan? Jalanin lah bergerak itu diam aja

Kedua gue tau ini demo tapi bisa gak jangan kasih kata kata tentang demonya? Atau no real token atau yg berhubungan dengan demo? Langsung aja buat tanpa kata kata demo atau sejenisnya jangan jelasin klo masih demo, edit itu"

### Changes
- Replaced the static watchlist with a continuous, seamless left-scrolling canvas ticker containing all five assets, prices, and percentage changes. Fixed dimensions prevent horizontal page overflow; accessible asset link and pause/resume control included. Honors reduced-motion at initialization.
- Removed visible demo/sample/sandbox/prototype/illustrative/no-real-token wording from header, ticker, footer, all four routes, dialogs, reward reveal, notifications, tooltips, aria labels, metadata, and validation messages.
- Copy now describes the product's cycle and mechanics directly. Robinhood wording remains "Designed for Robinhood Chain", without claiming a real connection, endorsement, or live exchange feed.
- Old deposit/burn history messages are mapped by event type on display so pre-existing workspaces receive the new wording without changing their balances or historical records. New backend events use updated neutral wording.
- Retained existing backend API paths, test IDs and storage keys to avoid breaking persisted sessions or tests. These internal identifiers are not visible product copy.
- Underlying mechanics remain off-chain; this request is motion/presentation only, NOT real blockchain or live market-price integration. Reference prices stay unchanged; do not fabricate fluctuations or label the feed live.
- Supersedes initial requirement for visible demo labels. Do not restore those labels in subsequent UI edits unless requested.
### Verification
- Frontend production build passed. Mandatory testing_agent verification completed in `/app/test_reports/iteration_2.json`: frontend100%, backend20/20, no bugs or blockers.
- Verified actual canvas pixel/offset changes, seamless loop, pause/resume without restart, reduced-motion behavior, all five asset quotes, navigation, and zero horizontal overflow at1920×800 and390×844.
- Verified copy removal throughout all routes, expanded FAQs, dialogs, toasts, metadata and accessible labels. Seeded legacy deposit/burn messages in an isolated workspace and confirmed clean rendering in sidebar and full history.
- Full start → Skip2h → reveal → claim regression passed. No current-scope P0/P1 fixes remaining.

## Update — shared protocol, real wallet connection, Docs and reward cards (2026-09-17)
### Latest requirements
- User approved downloadable/shareable Inc.hood-branded reward cards.
- Remove second-person/individual framing (you, your, my) throughout UI, notifications and accessible text; use public protocol/community perspective.
- Explicit choice: REAL MetaMask/injected EVM Connect Wallet before Buy/Start, without blockchain transactions.
- Explicit choice: aggregate public statistics/activity across participating wallets; individual wallet balances, claims and allocations must remain wallet-scoped.
- Prominent public Docs button in header including mobile; elegant detailed Docs explaining about, 2-hour incubation, 75% return/25% burn, random RWA assets, rarity tier drop rates and estimated ranges.
- Preserve prior request to omit visible demo/sandbox disclaimers. All technical implementation facts remain documented here.

### Architecture and implementation
- Real EIP-6963 discovery / EIP-1193 fallback. eth_requestAccounts and personal_sign only; no sendTransaction, contracts, chain switch, RPC or WalletConnect keys. No fake connection when provider absent.
- SIWE-format exact server-issued public-domain message, random alphanumeric nonce, five-minute expiry, cryptographic eth-account signature recovery, atomic nonce consumption, capped attempts. EOA wallets only.
- Opaque eight-hour HttpOnly Secure cookie session. Each normalized wallet address maps uniquely to one Mongo allocation workspace. All legacy private endpoints now require a valid signature-authenticated session AND matching workspace owner. Old anonymous workspaces retained but inaccessible through private endpoints and excluded from community totals. No unsigned migration or balance claim.
- No email/password accounts. Initial new-wallet internal balance10,000INC; same-wallet reconnect restores ledger. Internal INC/RWA balances and burn remain off-chain, as user explicitly requested no transactions.
- Ledger reset retired for authenticated wallets to preserve allocation history and communal burn totals. Configurable future commitment and internal top-up remain wallet-protected.
- Added background settlement every5s and public-read settlement of expired wallet cycles. Public Mongo aggregation covers global locked INC, generated RWA value, returned/burned INC, cycle counts and participation; feed includes cycle/claim/burn/return events without full wallet addresses/private balances/workspace IDs.
- New tiers: Common60%/$1–10, Rare25%/$10–30, Epic11%/$30–100, Legendary4%/$100–500. Tier and asset draws independent, amount uniformly chosen in cents inside tier range. Boundaries may overlap between displayed tier ranges; stored tier determines rarity. Asset odds unchanged25/20/20/20/15. All pod styles/INC commitments use same distribution.
- `/docs` seven-section technical field guide: overview, cycle, rarity matrix, asset universe, tokenomics, wallet connection, FAQ. Sticky index/anchors, original 3D pod, responsive tier grid. `/protocol` redirects toDocs. No invented APYs, on-chain proofs, burn transaction IDs, or non-custodial guarantees from design-agent suggested copy were implemented.
- Wallet Holdings replaces My Incubations; new Reward cards tab. No personal-pronoun site copy; standard SIWE message necessarily retains specification wording outside app copy.
- Explicit Create reward card action publishes only an owned claimed allocation. Public immutable snapshot in `shared_rewards`, idempotent runID/publicID indices. Includes shortened wallet label but never balance/full address. Anonymous public permalink `/rewards/{public_id}`.
- PNG1000×1200 artwork, tier colors, RWA symbol/value, cycle serial/date and75/25breakdown. Download real PNG, native file sharing where supported, otherwise immediate clipboard link; explicit copy/link field available. PNG cached before user interaction to preserve browser activation.
- Wallet session lifecycle serialized across disconnect/reconnect; private dialogs close on session loss; modal close callbacks instance-scoped; epoch guards reject stale account responses and public refresh cannot incorrectly fail successful authentication.

### Integration issue found and fixed
- Confirmed infrastructure rewrites inbound public Origin to the exact configured cluster proxy origin. Strict original Origin-only check initiallyblockedauth; fixed with an explicit ASGI origin adapter solely for CORS compatibility, never identity authorization.
- APP_ORIGIN/APP_DOMAIN remain public SIWE identity. New APP_PROXY_ORIGIN is exact observed transport origin; no wildcards or forwarded-host trust.
- Added HMAC signed session-bound double-submit CSRF to ALL mutations, including wallet auth/logout. `GET /auth/csrf` uses Secure HttpOnly `__Host-inc_browser` preauth seed and `__Host-inc_csrf`; token binds the actual session after verify. Browser cross-site and same-site Fetch Metadata changes rejected. Axios loads/refreshes CSRF tokens with one bounded retry.
- Edge normalizes SameSite cookies to None+Partitioned; Secure/HttpOnly remain. CSRF HMAC, host-prefixed cookies, Fetch Metadata, exact public-domain CORS, signature and workspace-owner checks remain enforced independently of SameSite.

### Tests / remaining final verification
- Frontend production build and Python compile passed. Docs/tiers/providerless desktop1920×800 and mobile390×844 screenshots: zero horizontal overflow.
- Iteration3 exposed origin transport issue above; iteration4 backend17/17 passed afterfix. Actual signatures tested cryptographically using disposable Ethereum keys and TEST-ONLY injected browser provider; real MetaMask extension not installed in automation browser and not claimed physically tested.
- Iteration4 browser completed connect→Buy100INC→Skip2h→reveal→claim→publish→PNGdownload, public share and Docs. Exported PNG confirmed1000×1200 and nonblank.
- Two iteration4 intermittent UI cases (rapid modal reopen after reconnect, Share fallback timing) addressed by lifecycle serialization/instance close and prebuilt share file. Focused retest pending before finish.
- Historical anonymous regression test module explicitly skipped as superseded; signed-wallet regression suite is current.
- Retained test public reward for visual QA: `/rewards/960d54ba07e14968b27b55efe80c4f08`, downloaded PNG `/app/test_reports/iteration4_reward_card_download.png`.

### Current backlog
- P0: Finish focused verification of repeated wallet connect/disconnect and share clipboard/native branches.
- P1 optional: reward editor, expanded asset selection, community rarity filters.
- P2 optional: collection milestones, reward card themes, Indonesian/English toggle.
- Real blockchain transactions remain expressly out of scope; do not add without a new user request and verified integrations.
