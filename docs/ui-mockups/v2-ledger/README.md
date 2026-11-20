# "Ledger" UI direction — Tally speed + myBillBook clarity

Mockups only (HTML + PNG in this folder, sample data). Open any `.html` in Chrome; add `?theme=dark` for dark mode.

## Why the current UI looks "AI generated"
Seen in the app today (`/ui-kit/shell/dashboard`, `/invoices`, `/sale`, `/catalog/products`):
- Every block is a big floating card: 20 px corners, soft shadows, lots of empty space. Billing apps look like paper and registers, not like a landing page.
- Indigo headings, a dark-navy totals card, orange totals, pastel pill badges and avatar circles on every row. Too much colour does the same job twice.
- Low density: about 8 invoice rows fit on a laptop screen; Tally / myBillBook users expect 15–20.
- The keyboard is hidden. Shopkeepers coming from Tally type everything (Enter → next field, F-keys); the UI is built for the mouse.
- Numbers are not where accountants look for them (no Dr / Cr, no running balance, no totals row on lists).

## What to take from each
| From Tally | From myBillBook |
|---|---|
| F-key action bar on entry screens (F2 date, F3 party, F4 item, F6 receipt, F8 sales, F9 purchase, Ctrl A save, Esc quit) | Invoice form that looks like the printed bill: Bill to / Ship to / invoice details on top, item grid, totals bottom-right, amount in words |
| Gateway menu with one-letter hotkeys (underlined letter = Alt + letter) | Simple summary strip above lists (Total / Paid / Unpaid / Overdue) that also filters |
| Yellow "cursor" row you move with ↑ ↓ and open with Enter | Party balance and credit limit shown the moment you pick a party |
| Ledger view: Debit / Credit / running Balance with Dr / Cr, opening and closing rows | Payment received + mode on the invoice itself, balance due under the total |
| Day Book: every voucher grouped by date with day totals | WhatsApp share / reminder as a first-class action |
| Go To (Alt G) — jump to any party, voucher or report by typing | Low-stock list and quick actions on the dashboard |

## Design rules (apply through the existing `components/ui` tokens — no page rewrites needed)
1. **Flat, bordered panels**: radius 6 px, 1 px border, no shadows, no gradients. Page background light grey, panels white.
2. **Density**: 13 px base text, table rows ~34 px, controls 30 px high.
3. **Colour has meaning only**: one blue for actions, green = money in / paid, red = money out / due, amber = warning. ecnbiz orange only on the logo and the single "New sale" button. Headings stay black.
4. **Status as coloured text with a dot**, not pastel pills. No avatar circles in tables.
5. **Every list gets**: a summary strip, tabs with counts, a date-range chip, a totals footer row, and a yellow keyboard cursor row.
6. **Every entry screen gets**: the F-key bar on the right, Enter-to-next-field, a key hint bar at the bottom, auto-save of drafts.
7. **Ctrl K / Alt G "Go to anything"** from every page.

## Page by page
| Mockup | Page today | Suggestion |
|---|---|---|
| `01-dashboard` | Big greeting, 4 cards, recent invoices, quick links | "Today" money strip (Sales · To collect · To pay · Cash + Bank · Stock value), 14-day sales vs purchase bars, Latest transactions (day-book style), Tally-style **Gateway** (Create / Display with hotkeys), Running low list. |
| `02-invoice-list` | Cards + rounded table, avatars, pill badges | Summary strip that filters, tabs with counts, date-range chip, dense table with actions first, Dr/Cr colours, totals footer, keyboard row (P print, R record payment, W WhatsApp). |
| `03-new-invoice` | Stacked cards, dark summary card, separate Products / Services sections | Paper layout: Bill to (with balance + limit), Ship to, invoice details, **spreadsheet item grid** with inline item search (stock / MRP / rate), totals + received + balance due under the grid, amount in words, F-key bar, Esc / Ctrl S / Ctrl P / Ctrl A buttons. |
| `04-party-ledger` | Customer details = profile + addresses only | Closing balance in Dr/Cr, credit-limit use, **ageing buckets**, full **ledger** with running balance and opening / closing rows, Receive payment (F6), statement PDF, WhatsApp reminder. |
| `05-items-stock` | Product list with switches and icons | Category tree on the left, stock-first table (stock, reorder level, cost, sale, value), low / out rows tinted, side panel for the selected item: batches, sales speed ("lasts about 11 days"), last purchase, Reorder button. |
| `06-daybook` | Reports as separate tabs | Reports home with the list on the left; **Day Book** grouped by date with day totals, period chips (Today / Week / Month / FY / Custom), Excel / Print. |
| `07-goto` | — | Ctrl K palette: type 3 letters → party with balance, actions for that party (F8 sale, F6 receipt, ledger), matching vouchers. |

Dark versions: `01-dashboard-dark`, `02-invoice-list-dark`, `03-new-invoice-dark`.

## How we would build it (if you pick this)
- **L0 tokens** (1 day): radius, shadow, density, colours in `src/index.css` + ThemeProvider → the whole app flattens at once.
- **L1 components** (2 days): DataTable (cursor row, totals footer, summary strip), StatusBadge → dot text, PageHeader (compact), Sidebar (flat, hotkeys), Header (company · FY · Ctrl K).
- **L2 keyboard layer** (2 days): global F-keys + Ctrl K palette (`useShortcuts` already exists), F-key bar component.
- **L3 pages** (4–5 days): invoice / purchase forms to the paper layout, Party ledger page, Items side panel, Day Book.
