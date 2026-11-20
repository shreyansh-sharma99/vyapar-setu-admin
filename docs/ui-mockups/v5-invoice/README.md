# Sidebar options + Sales Invoice module options

Mockups only (sample data); the app is unchanged. Palette: Charcoal & Saffron (no indigo / violet, IBM Plex Sans). Any of the four looks in `../v4-options` can be used instead.
Every screen uses only what the module does today; anything new is marked "new".

## What the Sales Invoice module does today (from the code)
- **List:** tabs All / Draft / Unpaid / Paid / Voided with counts and amounts; search by invoice or customer; columns Invoice, Customer, Phone, Date + time, Amount, Paid, Balance, Status; click a row to open it.
- **Row actions, by status:** View · Edit (draft) · Confirm invoice (draft) · Record payment (unpaid / part paid) · Send reminder (unpaid) · Payment link (unpaid) · Print · Download PDF · Duplicate · Void with reason (unpaid) · Delete draft.
- **Record payment:** method (Cash, UPI, Card, Bank transfer, Cheque, Online), amount, reference / txn id, notes.
- **Detail page:** Edit / Confirm (draft), Return, Receipt, More actions; payment summary (total, paid, receipts); bill details; goods used in services; product returned and void notices; receipts list (print / delete); invoice preview; full details (customer, invoice, bill, summary, notes and terms).

## Sidebar options
| | Look | Good | Watch out |
|---|---|---|---|
| **S1 · Light grouped sidebar** (`1-…`) | White, section headings (Pinned / Menu / Setup), only the open module expanded, counts and dues next to items, "Jump to page" search | Familiar (myBillBook-like), easy for staff, shows what needs attention (₹1.3L due, 4 follow-ups) | Takes 236 px of width |
| **S2 · Icon rail + fly-out** (`2-…`, `2b-…` shows the fly-out open) | 72 px charcoal rail with icon + label; hover a module → panel with its pages and quick-create keys | Most screen width for tables; fast once learnt | New users must hover to discover pages |
| **S3 · Two-level** (`3-…`) | Icon rail for modules + a light column with the module's pages, counts, Create shortcuts and saved views | Best for big modules (Sales, Reports, GST); saved views like "Unpaid > 15 days" | Two columns of navigation (≈268 px) |
| **S4 · Top menu bar** (`4-…`, `4b-…` shows a menu open) | Tally-style horizontal menu with Alt + letter hotkeys, module tabs under it, no sidebar | Full width for registers; feels like Tally | Fewer modules fit; less common in modern apps |

## Sales Invoice list / table options
| | Layout | Best for |
|---|---|---|
| **T1 · Register** (`1-…`) | Summary strip that filters · tabs · date + B2B/B2C filters · bulk select (send reminders / PDFs / print) · actions first · phone under customer · due date under balance · totals footer | Daily billing desk, most users |
| **T2 · Split view** (`2-…`) | Compact list on the left, the selected invoice on the right with its actions, customer outstanding, payment bar, items and receipts — ↑↓ changes invoice without leaving the list | Owners checking and collecting payments |
| **T3 · By customer** (`3-…`) | Unpaid / part-paid grouped by customer with total due, age bar, Remind and Receive per customer; switch Register / By customer / Day-wise at the top | Follow-ups and collections |
| **T4 · Day-wise register** (`4-…`) | Tally-style Sales Register: grouped by date with day totals, taxable / GST split, B2B / B2C, GSTIN; period total row | Accountant, GST checking, day-end |
| **Detail page** (`5-…`) | Bill exactly as printed on the left; Payment (with Record payment F6), Receipts, Customer outstanding and an **Activity** timeline (new) on the right; keys ← → for previous / next invoice | Opening one invoice |

T1–T4 are views of the same data: the switch on top (Register / By customer / Day-wise) lets us ship more than one.

## Suggested combination
- **Sidebar S3 (two-level)** for desktop, collapsing to **S2 (icon rail)** on small laptops — modules stay one click away and Sales / Reports / GST get room for counts and saved views.
- **Sales Invoices = T1 Register by default**, with **By customer** and **Day-wise** as switchable views, and the **split view (T2)** as an option when a row is opened on wide screens; the full **detail page (5)** when opened from a link or on smaller screens.
