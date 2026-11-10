# Agent query implementation tasks

Updated: 2026-11-10. This is an ordered task list, not a list of delivered features.

The lead's direction is to keep all new query logic in the agent. Implement
language parsing, clarification, product-term extraction, calculations,
aggregation, validation, confirmation, sequencing and presentation in
`ores.agent`. Reuse existing NATS business operations for reads and persistence;
retain their existing access checks and transactional guarantees. Do not add
server summary endpoints, move agent logic into backend components, or change
the main UI for this work. Draft review belongs in the agent web interface.

The installed agent remains read-only until action tools are implemented and
verified. This plan does not run reports, book trades or change business data.

Source requirements: [Example messages for quotes and booking](https://github.com/OreStudio/OreStudio/issues/4295#issuecomment-6557029516)
and [Use cases as per chat](https://github.com/OreStudio/OreStudio/issues/4295#issuecomment-6557127913).

## 1. Capture and review an FX-forward booking draft

Example: "Buy 20M EUR/USD six-month forward with counterparty X in book Group FX Hedges."

- [ ] Add a typed booking intent and agent-owned draft state, distinct from an RFQ.
- [ ] Extract side, currency pair, amounts, tenor/dates, agreed rate, counterparty,
  book and other required booking fields. Expand shorthand such as `20M`.
- [ ] Resolve records through existing discovery tools. Ask for missing or
  ambiguous terms and required conventions; never invent a rate or settlement date.
- [ ] Show an editable review in the agent UI. Support correction and discard.
  An unsaved draft must not persist a trade or start processing.
- [ ] Test complete, incomplete and ambiguous requests, including `mine`/`yours`
  only when the conversation establishes the user's side and agreed terms.

## 2. Confirm and book the reviewed trade

Examples: "Book this reviewed draft." / "Mine 20M at the agreed rate of <RATE>."

- [ ] Extend the agent tool allowlist and NATS adapter to call existing trading
  booking/draft-execution operations. Verify the current request/response contracts.
- [ ] Bind explicit confirmation to the exact reviewed terms/version, user and
  party. Any material edit requires another review and confirmation.
- [ ] Validate terms in the agent before submission and present backend rejections.
- [ ] Return the stored trade ID and read back its booked terms and status.
- [ ] Handle repeat messages, expiry, logout and timeouts without blind resubmission.
  Reconcile uncertain outcomes using existing reads; a duplicate-ID error is not
  proof that booking succeeded.
- [ ] Verify the complete flow with fixtures first; keep live booking validation
  separate from read-only evaluations and use explicitly designated test data.

## 3. Extend booking language to the issue's other products

Examples: "Pay fixed, receive floating on a 100M USD five-year SOFR swap with X."
"Book 10M Apple 3.85% 2032 bonds at the agreed price with X."

- [ ] Add product-specific term extraction, clarification and draft review for
  swaps and bonds after the FX-forward flow works.
- [ ] Map terms to existing supported product/booking contracts; check required
  schedules, conventions, identifiers, quantities and agreed price/rate units.
- [ ] Assess and record support separately for EUR/USD risk reversals, CDX IG,
  Boeing CDS, SPX collars and NVDA options. Implement agent draft/booking adapters
  only where existing product contracts can represent the full trade.
- [ ] Test multi-leg direction, strikes, expiry, protection side and contract
  multipliers. Unsupported products must receive a specific explanation.
- [ ] Keep VCON delivery and executable pricing unavailable until an existing
  integration supports them; do not fabricate tickets or quotes.

## 4. Start a report and follow its progress

Example: "Run the NPV report for book Group FX Hedges at <DATE>, then show the results."

- [ ] Resolve the report definition, scope, date and required parameters in the agent.
- [ ] Show the proposed execution and obtain explicit confirmation before triggering it.
- [ ] Wrap the existing report-trigger operation; verify its current contract and
  execution prerequisites without adding backend orchestration.
- [ ] Retain the returned execution identifiers, read progress and surface failures.
  Reconcile a timeout before retrying; cancelling chat must not imply report cancellation.
- [ ] On completion, feed the stored run into existing results tools. Report
  backend/export blockers explicitly rather than claiming successful execution.

## 5. Complete trade, book and portfolio results queries

Examples: "What is the base NPV of trade <TRADE_ID> from run <RUN_ID>?"
"Show the latest complete NPV for my portfolio and its contributors."

- [ ] Investigate the live trade `invalid_result_units` failure. Correct agent
  mapping only where explicit stored metadata proves the measure and currency;
  retain withholding if the source cannot establish them.
- [ ] Improve run discovery, scope resolution and follow-up choices for natural
  requests. Select a latest run only when health, dates and scope are unambiguous.
- [ ] Preserve historical membership, exact decimal sums, complete coverage and
  separate currencies in agent-derived book/portfolio totals.
- [ ] Explain missing, duplicate, stale and partial results and offer valid next
  steps without silently accepting partial output.
- [ ] Compare each improvement with fixed evaluation baselines; retain failures
  and distinguish fixture success from positive live evidence.

## 6. Complete risk-sensitivity queries

Examples: "Show Delta, Gamma and DV01 for this book from run <RUN_ID>."
"Show EUR/USD three-month vega for portfolio <PORTFOLIO> from run <RUN_ID>."

- [ ] Improve factor, maturity and measure clarification and contributor navigation.
- [ ] Keep grouping and totals in the agent. Preserve factor, shift, scenario,
  currency and raw/par status; do not sum across unrelated factors.
- [ ] Verify vega against a stored run with actual volatility-factor rows when
  available. Missing or suppressed rows must not become zero.
- [ ] Explain cash finite differences and signed DV01 correctly. Do not claim
  normalized/per-unit Greeks without metadata and independent verification.
- [ ] Add fixture and independent-reference comparisons for each supported measure.

## 7. Complete dated market-data queries

Examples: "What is the six-month GBP rate as of <DATE>?"
"What was EUR/USD spot from <PROVIDER> on <DATE>?"

- [ ] Improve rate intent parsing: distinguish maturity from floating tenor and
  resolve instrument, curve, index, provider and forward start through clarification.
- [ ] Verify a positive live IR lookup when suitable existing observations are
  available; report a data blocker otherwise. Do not change business data to pass.
- [ ] Preserve dated evidence, decimal units, provider selection and stale-data checks.
- [ ] Cover paraphrases and multi-turn provider/series selection with model evaluations.

## 8. Deferred queries with current capability blockers

These remain requirements from the issue, but follow the booking/results work.
The issue explicitly defers two-way pricing and funding/wash workflows.

| Query | Agent task | Current blocker / completion evidence |
| --- | --- | --- |
| "What is the three-month EUR/USD volatility?" | Add a dated volatility read adapter when an existing source supports it. | No verified volatility source/tool. Require real observations with expiry, strike/delta convention, units and provider. |
| "Price 50M EUR/USD three-month 1.0800 call versus 1.0500 put risk reversal." | Extract and review RFQ terms; orchestrate existing pricing capabilities if available. | No verified two-way pricing/volatility capability. Stored NPV is not a bid/offer. |
| "Give me a two-way market on a 20M EUR six-month EUR/USD forward." | Reuse reviewed terms and pricing evidence in an agent RFQ flow. | No current quote tool. A quote needs verified sides, units, pricing basis and validity before acceptance/booking. |
| "Quote a USD SOFR swap, Apple bond, CDX/Boeing CDS, SPX collar or NVDA call." | Add product-specific RFQ handling after pricing prerequisites are established. | Verify each product independently; a mock demonstrates integration only and must be labelled. |
| "Start the funding/wash process and show progress." | Sequence supported operations and track their identifiers in the agent. | No established funding/wash process for this use case. Do not report completion without supported operations and verified outcomes. |

## Completion rule for every task

Keep parsing, calculations, checks and orchestration in the agent and use the
same executor for chat and MCP. Add meaningful tests and evaluation cases for
the new behavior. Run the component verification gate and compare model cases
against fixed baselines. Record supported products, required data and remaining
blockers in [Validation](validation.md). Mark a query supported only after its
tool path and result have been verified; a correct refusal is not fulfillment.
