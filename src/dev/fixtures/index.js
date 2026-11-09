// Dev-only: per-group sample answers and preview routes (one file per page group).
import * as sales from './sales';
import * as purchase from './purchase';
import * as catalog from './catalog';
import * as inventory from './inventory';
import * as reports from './reports';
import * as settings from './settings';
import * as master from './master';
import * as dashboard from './dashboard';
import * as u7misc from './u7-misc';

const GROUPS = [sales, purchase, catalog, inventory, reports, settings, master, dashboard, u7misc];

export function groupAnswer(url, params) {
  for (const g of GROUPS) {
    const body = g.answer(url, params);
    if (body !== undefined) return body;
  }
  return undefined;
}

export const groupRoutes = GROUPS.flatMap((g) => g.routes);
