// Option B sidebar (shared by the B mockups). <body data-page="dash|sales">
(function () {
  if (/theme=dark/.test(location.search)) document.documentElement.classList.add('dark');
  const p = document.body.dataset.page;
  const a = (k, i, t) => `<a class="${k === p ? 'on' : ''}"><i>${i}</i>${t}</a>`;
  const side = document.createElement('aside');
  side.className = 'side';
  side.innerHTML = `<div class="biz"><span class="lg">S</span><span><b>Sharma General Store</b><small>Pune · ▾ switch business</small></span></div>
    <div class="cta">+ Create Sales Invoice</div>
    <h6>General</h6>${a('dash', '⌂', 'Dashboard')}${a('parties', '👥', 'Parties')}${a('items', '▦', 'Items')}
    <h6>Accounting</h6>${a('sales', '↗', 'Sales')}${a('purch', '↙', 'Purchases')}${a('exp', '₹', 'Expenses')}${a('cash', '▭', 'Cash &amp; Bank')}${a('rep', '▤', 'Reports')}
    <h6>Business tools</h6>${a('pos', '⊞', 'POS Billing')}${a('stock', '⇅', 'Stock adjust')}${a('set', '⚙', 'Settings')}
    <div class="foot">ecnbiz · Owner<br><span class="muted">Free trial · 12 days left</span></div>`;
  document.body.prepend(side);
})();
