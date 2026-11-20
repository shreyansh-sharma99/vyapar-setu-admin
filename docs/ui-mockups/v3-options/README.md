# UI options for ecnbiz — inspired by Tally Prime and myBillBook

Mockups only (HTML + PNG, sample data). The app is unchanged. Open any `.html` in Chrome; add `?theme=dark` for dark mode.
These take ideas from both products' layouts; they don't copy their branding, colours or logos.

## The options

| | **A · Gateway** (Tally-style) | **B · Bill Book** (myBillBook-style) | **C · Ledger** (hybrid) | **D · Counter** (POS mode) |
|---|---|---|---|---|
| Screens | `A1-gateway-home`, `A2-sales-voucher` | `B1-dashboard`, `B2-create-invoice` | `C1-ledger-dashboard`, `C2-ledger-new-invoice` (+ 5 more in `../v2-ledger/`) | `D1-pos-counter` |
| Feel | Accounting software. Text lines, blue title bars, yellow cursor, Dr/Cr everywhere | Modern business app. White cards, dark sidebar, "+ Add" dashed boxes, pills | Business register. Flat bordered panels, dense tables, paper-style bill, keys visible | Billing counter. Big search / scan box, item tiles, cart, big pay buttons |
| Home | "Gateway" menu with one-letter hotkeys + "today at a glance" in account heads | KPI cards (To Collect / To Pay / Cash + Bank / Stock), sales chart, latest transactions, quick create | Money strip, 14-day chart, latest transactions, Gateway panel, running low | — (opens straight into billing) |
| Billing | Voucher screen: Party A/c, Sales ledger, item lines, tax ledgers, narration | Paper-like form: Bill To / Ship To, item rows, "+ Add Item", "Scan Barcode", Add Discount / Charges, Mark as fully paid | Paper layout + spreadsheet item grid + F-key bar + received / balance under total | Scan → tile → cart, qty steppers, Cash F5 / UPI F6 / Card F8 / Credit F9, held bills |
| Keyboard | Everything (F2–F10, Alt / Ctrl, letter hotkeys) | Light (Save, a few shortcuts) | Everything, but buttons work too | Everything for the counter |
| Mouse / touch / mobile | Weak | **Best** | Good | Good on touch / tablet counters |
| Who it suits | Accountants, CA-run shops, Tally switchers | New owners, mobile users, small shops | Most kirana / wholesale shops: owner + 1–3 staff | Walk-in retail counters, supermarts, medical stores |
| Learning curve | Steep for new users | Lowest | Low (buttons) → fast (keys) | Very low |
| Risk | Looks old to new customers; hard on mobile | Looks like many other apps; slower for heavy data entry | — | Only covers billing; needs the main app beside it |
| Build effort on top of current code | High (new navigation model) | Medium (restyle + form changes) | Medium (tokens + components + keys) | Medium (one new screen + printer flow) |

## Recommendation
**C (Ledger) as the main app + D (Counter) as a separate "POS mode"**, with two settings:
- *Keyboard-first* on by default (F-key bar, Enter-to-next-field, Gateway panel) — what Tally users expect.
- *Simple mode* that hides the key bar and shows bigger "+ Add" buttons — the myBillBook feel for new or mobile users.

That way one product serves both kinds of shop owner without two separate designs to maintain, and our existing `components/ui` library and tokens can carry it (no page-by-page rewrite).

If you'd rather pick one only:
- choose **A** if most customers come from Tally,
- choose **B** if most customers are first-time / mobile users.
