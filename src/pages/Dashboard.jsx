import { CRow, CCol, CCard, CCardBody, CCardHeader } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPeople, cilBasket, cilWallet, cilArrowTop, cilArrowBottom } from '@coreui/icons';

const stats = [
  { title: 'Total Views',   value: '3.456k',     change: '0.43%', up: true,  icon: cilPeople, color: 'indigo'  },
  { title: 'Total Profit',  value: '$45,231.89', change: '4.35%', up: true,  icon: cilWallet, color: 'emerald' },
  { title: 'Total Product', value: '2,450',       change: '2.59%', up: true,  icon: cilBasket, color: 'blue'    },
  { title: 'Total Users',   value: '1,205',       change: '0.95%', up: false, icon: cilPeople, color: 'rose'    },
];

const orders = [
  { id: '#ORD-98745', customer: 'Priya Patel',  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80', product: 'Handicraft Jute Bag',    date: 'Jun 22, 2026', amount: '$49.00',  status: 'success', label: 'Completed' },
  { id: '#ORD-98744', customer: 'Amit Sharma',  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80', product: 'Terracotta Diya Set',    date: 'Jun 21, 2026', amount: '$120.50', status: 'warning', label: 'Pending'   },
  { id: '#ORD-98743', customer: 'Sarah Connor', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&q=80', product: 'Blue Pottery Vase',      date: 'Jun 21, 2026', amount: '$235.00', status: 'success', label: 'Completed' },
  { id: '#ORD-98742', customer: 'Raj Malhotra', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80', product: 'Wooden Carved Elephant', date: 'Jun 20, 2026', amount: '$89.99',  status: 'danger',  label: 'Cancelled' },
];

// Stat card icon colors — bg is a CSS var string that .dark swaps automatically
const ICON_COLORS = {
  indigo:  { icon: '#6366f1', bg: 'var(--vs-stat-bg-indigo)'  },
  emerald: { icon: '#10b981', bg: 'var(--vs-stat-bg-emerald)' },
  blue:    { icon: '#3b82f6', bg: 'var(--vs-stat-bg-blue)'    },
  rose:    { icon: '#f43f5e', bg: 'var(--vs-stat-bg-rose)'    },
};

// Badge classes — Tailwind dark: variant works fine here (no CSS var conflict)
const BADGE_CLASSES = {
  success: 'text-emerald-700 bg-emerald-50 ring-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:ring-emerald-500/20',
  warning: 'text-amber-700  bg-amber-50  ring-amber-200  dark:text-amber-400  dark:bg-amber-500/10  dark:ring-amber-500/20',
  danger:  'text-rose-700   bg-rose-50   ring-rose-200   dark:text-rose-400   dark:bg-rose-500/10   dark:ring-rose-500/20',
};

export default function Dashboard() {
  const cardStyle = "rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] shadow-sm dark:shadow-none transition-colors duration-300";

  return (
    <div className="flex flex-col gap-4">

      {/* ── Stats ── */}
      <CRow className="g-3">
        {stats.map((s, i) => {
          const c = ICON_COLORS[s.color];
          return (
            <CCol sm={6} lg={3} key={i}>
              <CCard className={cardStyle}>
                <CCardBody className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--vs-text-secondary)] m-0">{s.title}</p>
                      <p className="mt-1.5 text-xl font-bold text-[var(--vs-text-primary)] m-0">{s.value}</p>
                    </div>
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                      style={{ backgroundColor: c.bg }}
                    >
                      <CIcon icon={s.icon} className="w-4 h-4" style={{ color: c.icon }} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <span
                      className="inline-flex items-center text-[11px] font-bold"
                      style={{ color: s.up ? '#10b981' : '#f43f5e' }}
                    >
                      <CIcon icon={s.up ? cilArrowTop : cilArrowBottom} className="w-3 h-3 mr-0.5" />
                      {s.change}
                    </span>
                    <span className="text-[11px] text-[var(--vs-text-secondary)]">vs last week</span>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
          );
        })}
      </CRow>

      {/* ── Revenue Chart ── */}
      <CRow className="g-3">
        <CCol xs={12}>
          <CCard className={cardStyle}>
            <CCardHeader
              className="flex items-center justify-between px-5 py-3 bg-transparent border-b border-[var(--vs-border-subtle)]"
            >
              <h5 className="text-sm font-bold m-0 text-[var(--vs-text-primary)]">Revenue Analytics</h5>
              <div className="flex gap-1.5">
                <button className="rounded-lg px-3 py-1 text-[11px] font-bold bg-[var(--vs-active-bg)] text-[var(--vs-active-text)]">
                  Weekly
                </button>
                <button className="rounded-lg px-3 py-1 text-[11px] font-semibold text-[var(--vs-text-secondary)]">
                  Monthly
                </button>
              </div>
            </CCardHeader>
            <CCardBody className="px-5 py-4">
              <div className="relative h-52 w-full">
                <svg className="w-full h-full" viewBox="0 0 1000 210" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gi2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="ge2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[40, 80, 120, 160].map(y => (
                    <line key={y} x1="0" y1={y} x2="1000" y2={y} className="stroke-[var(--vs-border-subtle)]" strokeWidth="1" />
                  ))}
                  <path d="M0 175 Q150 130 300 145 T600 65 T900 48 L1000 44 L1000 190 L0 190Z" fill="url(#gi2)" />
                  <path d="M0 175 Q150 130 300 145 T600 65 T900 48 L1000 44" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M0 188 Q150 168 300 162 T600 112 T900 95 L1000 88 L1000 190 L0 190Z" fill="url(#ge2)" />
                  <path d="M0 188 Q150 168 300 162 T600 112 T900 95 L1000 88" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="600" cy="65"  r="4" fill="#4f46e5" className="stroke-[var(--vs-bg-primary)]" strokeWidth="2" />
                  <circle cx="600" cy="112" r="4" fill="#10b981" className="stroke-[var(--vs-bg-primary)]" strokeWidth="2" />
                </svg>
              </div>
              <div className="flex justify-between mt-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <span key={d} className="text-[11px] font-medium text-[var(--vs-text-secondary)]">{d}</span>
                ))}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* ── Recent Orders ── */}
      <CRow className="g-3">
        <CCol xs={12}>
          <CCard className={cardStyle}>
            <CCardHeader className="px-5 py-3 bg-transparent border-b border-[var(--vs-border-subtle)]">
              <h5 className="text-sm font-bold m-0 text-[var(--vs-text-primary)]">Recent Orders</h5>
            </CCardHeader>
            <CCardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead className="bg-[var(--vs-input-bg)]">
                    <tr className="border-b border-[var(--vs-border-subtle)]">
                      {['Order ID', 'Customer', 'Product', 'Date', 'Amount', 'Status'].map(h => (
                        <th key={h} className="py-2.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, i) => (
                      <tr
                        key={i}
                        className={`transition-colors hover:bg-[var(--vs-drop-hover)] ${i < orders.length - 1 ? 'border-b border-[var(--vs-border-subtle)]' : ''}`}
                      >
                        <td className="py-3 px-5 text-sm font-semibold text-[var(--vs-text-primary)]">{o.id}</td>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2.5">
                            <img src={o.avatar} alt={o.customer} className="h-7 w-7 rounded-full object-cover outline outline-1 outline-[var(--vs-border)]" />
                            <span className="text-sm font-semibold text-[var(--vs-text-primary)]">{o.customer}</span>
                          </div>
                        </td>
                        <td className="py-3 px-5 text-sm text-[var(--vs-text-secondary)]">{o.product}</td>
                        <td className="py-3 px-5 text-sm text-[var(--vs-text-secondary)]">{o.date}</td>
                        <td className="py-3 px-5 text-sm font-bold text-[var(--vs-text-primary)]">{o.amount}</td>
                        <td className="py-3 px-5">
                          {/* Badge uses Tailwind dark: classes — zero JS color logic */}
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${BADGE_CLASSES[o.status]}`}>
                            {o.label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  );
}
