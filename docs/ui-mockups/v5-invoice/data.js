// Shared sample invoices + icon helper for the v5 mockups.
window.INV = [
  // no, customer, phone, date, time, items, amount, paid, status, due
  ['0413', 'Gupta Kirana & General Stores', '98110 22000', '11 Nov', '5:04 pm', 4, 9658, 5000, 'part', '26 Nov', 'B2B'],
  ['0412', 'Sharma General Store', '98201 55000', '11 Nov', '4:59 pm', 6, 18450, 18450, 'paid', '—', 'B2B'],
  ['0411', 'Walk-in customer', '', '11 Nov', '1:12 pm', 2, 840, 840, 'paid', '—', 'B2C'],
  ['0410', 'Priya Patel', '98989 89898', '10 Nov', '6:40 pm', 3, 2150, 0, 'unpaid', '25 Nov', 'B2C'],
  ['0409', 'Fresh Mart', '91234 56780', '10 Nov', '11:20 am', 5, 11780, 0, 'draft', '—', 'B2B'],
  ['0408', 'Krishna Traders', '98450 12000', '09 Nov', '3:15 pm', 14, 105600, 60000, 'part', '24 Nov', 'B2B'],
  ['0407', 'Amit Sharma', '97000 12345', '09 Nov', '10:02 am', 1, 499, 499, 'paid', '—', 'B2C'],
  ['0406', 'Sai Medicals', '90000 11111', '08 Nov', '5:47 pm', 7, 23310, 23310, 'paid', '—', 'B2B'],
  ['0405', 'Raj Malhotra', '99887 76655', '07 Nov', '12:30 pm', 2, 3620, 0, 'void', '—', 'B2C'],
  ['0371', 'Mehta Electricals', '98765 43210', '10 Oct', '4:10 pm', 9, 42900, 0, 'unpaid', '25 Oct', 'B2B'],
];
window.ST = { draft: 'Draft', unpaid: 'Unpaid', part: 'Part paid', paid: 'Paid', void: 'Voided' };
window.inr = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const P = {
  view: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  ok: '<path d="M5 12l5 5 9-10"/>',
  pay: '<path d="M7 5h10M7 9h10M12 9c3 0 5 1.5 5 3.5S15 16 12 16H8l7 4"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="1"/><path d="M7 14h10v7H7z"/>',
  pdf: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M4 16V4h12"/>',
  ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
  del: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  ret: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  rcpt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  wa: '<path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-5.2A8.5 8.5 0 1 1 21 11.5z"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  stock: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  cart: '<path d="M3 4h2l2.4 11h11.2L21 7H6.2"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>',
  sale: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  rep: '<path d="M4 20V10M10 20V4M16 20v-7"/>',
  gst: '<path d="M7 3h10v4H7zM5 7h14v14H5z"/>',
  set: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  team: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  star: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
};
window.ic = (k, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[k]}</svg>`;
// Row actions exactly as the app offers them, by status.
window.actionsFor = (s) => ({
  draft: [['view'], ['edit'], ['ok'], ['print'], ['copy'], ['del', 1]],
  unpaid: [['view'], ['pay'], ['bell'], ['link'], ['print'], ['pdf'], ['ban', 1]],
  part: [['view'], ['pay'], ['print'], ['pdf'], ['copy']],
  paid: [['view'], ['print'], ['pdf'], ['copy']],
  void: [['view'], ['print']],
})[s];
window.icons = (s) => `<span class="ico">${actionsFor(s).map(([k, d]) => `<span class="${d ? 'd' : ''}">${ic(k)}</span>`).join('')}</span>`;
