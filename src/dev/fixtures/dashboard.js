// Dev-only sample API answers and preview routes for the U6 dashboard pages (/ui-kit/shell/...).
// answer(url, params) returns the response body, or undefined to let the next fixture / default answer.
// routes: [{ path, element }] mounted under /ui-kit/shell (element built with createElement, no JSX here).
// /inventory (stats + low items) and /purchase-bills (stats) already come from inventory.js / previewApi.js.
import { createElement } from 'react';
import Dashboard from '@/pages/Dashboard';
import { INVOICES, day } from '../previewApi';

// Today's counter bills of a Pune kirana (the dashboard asks with dateFrom = dateTo = today).
const todaysBills = () =>
  [
    ['Walk-in customer', '', 486, 'paid'],
    ['Deshpande Family', '9822011223', 1240, 'paid'],
    ['Walk-in customer', '', 212, 'paid'],
    ['Hotel Shivam', '9333311111', 8650, 'unpaid'],
    ['Kulkarni Tiffin Service', '9850033445', 3420, 'partially_paid'],
    ['Walk-in customer', '', 95, 'paid'],
    ['Joshi Sweets, Kothrud', '9767044556', 5780, 'paid'],
    ['Walk-in customer', '', 1310, 'draft'],
  ].map(([name, phone, total, status], i) => ({
    _id: `today-${i}`,
    invoiceNumber: `INV-2026-${String(420 - i).padStart(4, '0')}`,
    invoiceDate: day(0),
    customerSnapshot: { name, phone },
    totalAmount: total,
    paidAmount: status === 'paid' ? total : status === 'partially_paid' ? 2000 : 0,
    status,
  }));

// GET /sales-invoices/summary — grouped by status, with paidAmount like the backend.
const summary = () => {
  const groups = {};
  INVOICES.forEach((inv) => {
    const g = (groups[inv.status] ||= { _id: inv.status, count: 0, totalAmount: 0, paidAmount: 0 });
    g.count += 1;
    g.totalAmount += inv.totalAmount;
    g.paidAmount += inv.paidAmount;
  });
  return { success: true, data: Object.values(groups) };
};

export function answer(url, params = {}) {
  if (url === '/sales-invoices/summary') return summary();
  if (url === '/sales-invoices' && params.dateFrom && !params.page) {
    const rows = todaysBills();
    return { success: true, data: rows, meta: { total: rows.length, page: 1, limit: 0, totalPages: 1 } };
  }
  return undefined;
}

export const routes = [{ path: 'dashboard', element: createElement(Dashboard) }];
