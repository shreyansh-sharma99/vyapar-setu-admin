// Mockup shell: sidebar + top bar, injected so every page shares them.
// <body data-page="invoices" data-crumb="Sales"> … <main class="body">…</main>
(function () {
  if (/[?&]theme=dark/.test(location.search)) document.documentElement.classList.add('dark');
  const opt = (location.search.match(/[?&]opt=(\w+)/) || [])[1];
  if (opt) document.documentElement.classList.add('th-' + opt);
  const I = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    sale: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    buy: '<path d="M3 4h2l2.4 11h11.2L21 7H6.2"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>',
    party: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    item: '<path d="M21 8l-9-5-9 5 9 5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    cash: '<rect x="2.5" y="6" width="19" height="12" rx="1.5"/><circle cx="12" cy="12" r="2.5"/>',
    rep: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    gst: '<path d="M7 3h10v4H7zM5 7h14v14H5z"/><path d="M9 12h6M9 16h4"/>',
    set: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${I[k]}</svg>`;
  window.ICON = svg;
  const page = document.body.dataset.page;
  // First letter underlined = Alt + letter, like Tally's Gateway menu.
  const nav = [
    ['Overview', [['home', 'dashboard', '<span class="u">D</span>ashboard', '']]],
    ['Billing', [
      ['sale', 'invoices', '<span class="u">S</span>ales', 'Alt S'],
      ['buy', 'purchases', '<span class="u">P</span>urchases', 'Alt P'],
      ['cash', 'cash', 'Cash &amp; <span class="u">B</span>ank', 'Alt B'],
    ]],
    ['Masters', [
      ['party', 'parties', 'Part<span class="u">i</span>es', 'Alt I'],
      ['item', 'items', 'I<span class="u">t</span>ems &amp; Stock', 'Alt T'],
    ]],
    ['Books', [
      ['rep', 'daybook', 'Day <span class="u">B</span>ook &amp; Reports', 'Alt R'],
      ['gst', 'gst', '<span class="u">G</span>ST Returns', 'Alt G'],
      ['set', 'settings', 'Settings', ''],
    ]],
  ];
  const side = `<aside class="side">
    <div class="logo"><span class="mark">e</span><span class="word">ecn<i>biz</i></span></div>
    ${nav.map(([h, items]) => `<div class="grp"><h6>${h}</h6>${items.map(([ic, key, label, kb]) =>
      `<a class="${key === page ? 'on' : ''}">${svg(ic)}<span>${label}</span>${kb ? `<kbd>${kb}</kbd>` : ''}</a>`).join('')}</div>`).join('')}
    <div class="foot">Sharma General Store<br><span style="color:#5d6679">Owner · 3 users</span></div>
  </aside>`;
  const top = `<header class="top">
    <div class="co">Sharma General Store <small>GSTIN 27ABCPS4521K1Z8 · Pune</small></div>
    <span class="chip">FY 2026-27</span>
    <span class="chip">Wed, 11 Nov 2026</span>
    <div class="search">${svg('search')}<span>Search or jump to…  (invoice, party, item, report)</span><kbd>Ctrl K</kbd></div>
    <span class="sp"></span>
    <span class="chip">${document.documentElement.classList.contains('dark') ? '☾ Dark' : '☀ Light'}</span>
    <span class="avatar">RK</span>
  </header>`;
  const main = document.querySelector('.main-content');
  const wrap = document.createElement('div');
  wrap.className = 'app';
  wrap.innerHTML = side + `<div class="main">${top}</div>`;
  document.body.prepend(wrap);
  wrap.querySelector('.main').append(main);
})();
