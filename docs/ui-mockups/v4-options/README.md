# ecnbiz Shop Owner — UI options from Tally Prime and myBillBook

Mockups only (sample data); the app is unchanged. Same three screens (Dashboard, Sales Invoices, New Sales Invoice) in four looks.
Live HTML: `../v2-ledger/<page>.html?opt=tally|khata|green|saffron`.

## Why today's app looks "AI-made" — and the rules these options follow
| AI-default pattern in the app now | What the options do instead |
|---|---|
| Indigo / violet primary (#4f46e5), navy sidebar, lavender tints | Colours from Indian business tools: Tally teal, bahi-khata maroon, bottle green, charcoal + saffron. **No indigo, violet, purple or blue-600 anywhere.** |
| Inter font everywhere | Noto Sans (made for Indian scripts), Work Sans, IBM Plex Sans; Source Serif for ledger headings |
| Big rounded floating cards, soft shadows, gradients | Square or slightly rounded **bordered** panels, no shadows, no gradients |
| Pastel pill badges, avatar circles in tables | Status as coloured text with a dot / square; names as plain bold text |
| Lots of white space, ~8 rows per screen | Register density, ~12–15 rows per screen, totals row on every list |
| Mouse-only | Visible keys (F2–F9, Alt / Ctrl), yellow cursor row, Ctrl K jump |

## The four looks
| | **1 · Tally Classic** | **2 · Bahi Khata** | **3 · Bottle Green** | **4 · Charcoal & Saffron** |
|---|---|---|---|---|
| Idea | Feels like Tally Prime: teal title bars, cream screen, yellow cursor | The red-cloth account book shops already use: cream paper, maroon, ruled columns, double line under totals | Clean myBillBook-style forms, calm green instead of blue | Modern but warm: charcoal actions, saffron only for the one "New sale" button |
| Page / panel | #F6F3EA / #FFFDF7 | #F4ECDC / #FFFAF0 | #F3F5F2 / #FFFFFF | #F4F2ED / #FFFEFB |
| Main colour | Teal #0E5A5A | Maroon #7B1E1E | Bottle green #1F6B45 | Charcoal #2B2925 + saffron #D9731A |
| Highlight / cursor | Tally yellow #FFE08A | Turmeric #F6E2A8 | Butter #FDF3C8 | Saffron tint #FDEBD0 |
| Sidebar | Dark teal #0D4848 | Maroon #5A1515 | Forest #15261C | Charcoal #1F1D1A |
| Font | Noto Sans + Plex Mono | Noto Sans + Source Serif headings | Work Sans | IBM Plex Sans |
| Corners | Square (0) | 2 px | 8–10 px | 4 px |
| Best for | Tally users, accountants, wholesale | Traditional kirana / family shops | New users, mobile, myBillBook switchers | Broad market, premium feel |
| Screens | `tally-01/02/03` | `khata-01/02/03` | `green-01/02/03` | `saffron-01/02/03` |

All four keep the ecnbiz orange only in the logo mark (and saffron's CTA). Dr / due = brick red, Cr / paid = leaf green, in every look.

## Module by module — what Tally does, what myBillBook does, what we should do
| Module (sidebar) | Tally Prime | myBillBook | Suggestion for ecnbiz |
|---|---|---|---|
| **Dashboard** | Gateway menu + closing balances by group | KPI cards: To Collect, To Pay, Cash + Bank; latest transactions | One money strip (Sales today · To collect · To pay · Cash + Bank · Stock value), latest transactions as a mini day book, "Create / Display" hotkey panel, running-low list |
| **Customers** | Ledger master + Ledger Vouchers report (Dr / Cr, running balance) | Party list with balance, party detail tabs (transactions, ledger, details) | List shows balance Dr/Cr and days overdue; detail page = **ledger first** (opening, vouchers, running balance, closing), ageing buckets, Receive payment (F6), statement PDF, WhatsApp reminder |
| **Catalog** · Categories, Subcategories, Brands, Manufacturers | Stock groups / categories as a tree | Item categories as a filter | One "Item masters" page with a **tree** on the left (category › subcategory), brands / manufacturers as tabs; no separate card page for each |
| **Catalog** · Products, Services | Stock item master: units, GST, batches, reorder | Item list with stock, sale / purchase price, low-stock tag | Stock-first table (stock, reorder, cost, sale, value) + **side panel** for the selected item (batches, sales speed, last purchase, Reorder). Services in the same list with a "Service" type filter |
| **Catalog** · Import / Export, Barcode labels | Import from Excel with mapping | Bulk upload, barcode print | Step page: 1 pick file → 2 map columns → 3 preview errors in a table → 4 import. Labels: pick items in a table, live label preview on the right |
| **Inventory** · Stock overview, Valuation | Stock Summary (qty, rate, value) by group, drill down | Stock summary report | Tally-style **Stock Summary**: grouped rows with group totals, drill down to item → batches → movements |
| **Inventory** · Adjust stock, Damaged | Physical stock / stock journal vouchers | Adjust stock dialog (add / reduce) | Voucher-style screen: item grid with + / − qty, reason per line, F-key save; damaged = same screen with "Damaged" type |
| **Inventory** · Movement history | Stock item vouchers report | Item timeline | One movement register (date, voucher, in, out, balance) filtered by item / batch |
| **Purchases** · Suppliers | Sundry creditors ledgers | Party list (supplier) | Same as Customers but Cr / to pay; Pay supplier (F5) on the ledger |
| **Purchases** · Purchases, Returns | Purchase / Debit note vouchers | Purchase form like the sales form | Same paper layout as the new sales invoice (one design for every voucher) + "Receive stock" step; returns = debit note with "against bill" picker |
| **Sales** · Sales invoices | Sales voucher; Sales Register | Sales list with summary cards; Create invoice form | Shown in the mockups: summary strip that filters, dense list with totals, cursor row; paper-style invoice with spreadsheet item grid and F-keys |
| **Sales** · Payment account | Receipt vouchers; Bank book | Payment In / Payment Out | Receipt voucher screen (F6): party, amount, mode, **bill-wise adjustment table**; plus a Cash / Bank book page |
| **Sales** · Sales return, Credit note | Credit note voucher | Sales return / credit note forms | Same voucher layout; pick original invoice, return qty per line, reason |
| **Sales** · Follow-ups | Outstandings (bill-wise, due days) | Payment reminders | **Outstandings** register grouped by party, due / overdue days, one-key WhatsApp reminder and "note follow-up" per row |
| **Reports** · Sales register, Profit, Ageing, Price overrides | Day Book, registers, P&L, ageing analysis — all drill down | Report list → simple report pages | Reports home with a list on the left; every report = period chips + table + totals + drill down (Enter) to the voucher |
| **Reports** · GSTR-1, 2, 2B, 3B, 9, HSN, Status | GST reports with "included / not included / uncertain" sections | GSTR-1 / 3B summaries, export JSON | Section table like the return form (B2B, B2C, CDNR…) with counts and tax, an "issues" tab for missing GSTIN / HSN, export JSON / Excel |
| **Invoice setting** · General, Bill fields, Invoice settings, Layout | F12 Configure screens (on / off lines) | Invoice settings + theme picker with live preview | One settings page: left = list of yes / no lines (Tally F12 style), right = **live invoice preview** |
| **Master settings** · GST rates, Prices & offers | Stock item / group GST details, price lists | Item price edit, discounts | Price-list grid (item × price level) with "from date"; GST rate history per HSN as a ledger-style table |
| **Staff & Roles** | Security control: users and roles with allow / disallow lists | Staff with role and permission toggles | Role page = permission grid (module × view / create / edit / delete) as a register; staff list with last login and counter |

## How to choose
- Customers mostly **from Tally** → **1 · Tally Classic**.
- **Traditional kirana / family shops** that keep a bahi-khata → **2 · Bahi Khata**.
- **New or mobile-first** owners, people switching from myBillBook → **3 · Bottle Green**.
- **One look for everyone** with a modern, premium feel → **4 · Charcoal & Saffron**.

Any of them can be applied through the existing `components/ui` tokens (colours, font, corner radius, density), so the whole app changes together; the module changes in the table above are separate, page-level work.
