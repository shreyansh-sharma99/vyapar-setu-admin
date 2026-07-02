import { useState, useRef, useEffect, useMemo } from 'react';
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react';
import {
  Loader2,
  ChevronDown,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Eye,
  ToggleLeft,
  Image as ImageIcon,
} from 'lucide-react';
import Switch from '@/components/inputs/Switch';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const getPageNumbers = (current, total) => {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
};

/** Truncate plain text to N words */
const truncateWords = (text, maxWords = 5) => {
  if (typeof text !== 'string') return { short: text, full: text, isTruncated: false };
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return { short: text, full: text, isTruncated: false };
  return { short: words.slice(0, maxWords).join(' ') + '…', full: text, isTruncated: true };
};

/* ─── TruncatedCell ─────────────────────────────────────────────────────────── */

function TruncatedCell({ value }) {
  const [expanded, setExpanded] = useState(false);
  const { short, full, isTruncated } = truncateWords(value);
  if (!isTruncated) return <span>{value}</span>;
  return (
    <span
      className="cursor-pointer select-none"
      onClick={() => setExpanded(!expanded)}
      title={expanded ? 'Click to collapse' : 'Click to expand'}
    >
      {expanded ? full : short}
    </span>
  );
}

/* ─── RowActions ────────────────────────────────────────────────────────────── */

function RowActions({ item, onEdit, onDelete, onView, onToggle, toggleField = 'isActive' }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onView && (
        <button
          type="button"
          onClick={() => onView(item)}
          className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
          title="View"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="p-2 rounded-lg text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
          title="Edit"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(item)}
          className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      {onToggle && (
        <Switch
          checked={item[toggleField] === true || item[toggleField] === 'active'}
          onChange={(val) => onToggle(item, val)}
        />
      )}
    </div>
  );
}

/* ─── Column Dropdown ───────────────────────────────────────────────────────── */

function ColumnDropdown({ headers, visibleKeys, getColKey, toggleColumn, resetColumns }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const visibleCount = headers.filter((h, i) => visibleKeys[getColKey(h, i)] !== false).length;
  const totalCount = headers.length;

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 h-10 px-4 bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] border border-[var(--vs-border)] !rounded-xl text-sm shadow-sm hover:bg-[var(--vs-bg-secondary)] cursor-pointer transition-all min-w-[160px]"
      >
        <span className="font-medium">Choose Columns</span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--vs-text-secondary)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-[calc(100%+6px)] left-0 z-50 bg-[var(--vs-bg-primary)] border border-[var(--vs-border)] rounded-xl shadow-2xl overflow-hidden w-full min-w-max"
          style={{
            boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          }}
        >
          {/* Blue top stripe like image 2 */}
          <div className="h-1 bg-indigo-600 w-full" />

          {/* Header row */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--vs-border)] bg-[var(--vs-bg-secondary)]/50">
            <span className="text-[13px] font-bold text-[var(--vs-text-secondary)] uppercase tracking-widest">
              {visibleCount}/{totalCount} visible
            </span>
            <button
              type="button"
              onClick={() => { resetColumns(); }}
              className="text-[13px] text-indigo-500 hover:text-indigo-700 font-bold transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Column items — full width, no grid, like image 2 */}
          <div className="flex flex-col gap-3 max-h-64 overflow-y-auto py-3">
            {headers.map((header, index) => {
              const key = getColKey(header, index);
              const isVisible = visibleKeys[key] !== false;
              return (
                <label
                  key={key}
                  className={`
                    flex items-center px-4 py-1 cursor-pointer select-none
                    transition-colors
                    hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded
                    ${isVisible ? 'text-[var(--vs-text-primary)]' : 'text-[var(--vs-text-secondary)]'}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => toggleColumn(key)}
                    className="sr-only"
                  />
                  {/* Custom styled checkbox to match image 2 */}
                  <span
                    className={`
                      inline-flex items-center justify-center w-5 h-5 rounded border-2 shrink-0 transition-all
                      ${isVisible
                        ? 'bg-[#0d6efd] border-[#0d6efd]'
                        : 'bg-transparent border-[var(--vs-border)]'
                      }
                    `}
                  >
                    <svg
                      className={`w-3 h-3 text-white transition-opacity ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                      fill="none"
                      viewBox="0 0 12 12"
                    >
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="ml-3 text-[14px] font-medium tracking-wide uppercase text-[#000] dark:text-slate-200">
                    {header.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Table ────────────────────────────────────────────────────────────── */

export default function Table({
  headers,
  data = [],
  loading = false,
  emptyMessage = 'No data found.',

  // Search
  showSearch = true,
  searchPlaceholder = 'Search records...',
  searchTerm: controlledSearchTerm,
  onSearchTermChange,

  // Columns
  showColumnsToggle = true,

  // Toolbar custom actions slot (e.g. Add button)
  actions,

  // ── Row-level action props ──────────────────────
  onEdit,          // (item) => void  — shows ✏️ Edit button
  onDelete,        // (item) => void  — shows 🗑️ Delete button
  onView,          // (item) => void  — shows 👁 View button
  onToggle,        // (item, newVal) => void  — shows Toggle switch
  toggleField = 'isActive', // which field drives the toggle state

  // Pagination
  showPagination = true,
  pageSizeOptions = [5, 10, 20, 50],
  currentPage: controlledCurrentPage,
  pageSize: controlledPageSize,
  totalRows: controlledTotalRows,
  onPageChange,
  onPageSizeChange,

  // Sort
  sortConfig: controlledSortConfig,
  onSortChange,
}) {
  /* ── state ── */
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const isControlledSearch = controlledSearchTerm !== undefined && onSearchTermChange !== undefined;
  const searchTerm = isControlledSearch ? controlledSearchTerm : localSearchTerm;

  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(10);
  const isControlledPagination =
    controlledCurrentPage !== undefined &&
    controlledPageSize !== undefined &&
    onPageChange !== undefined;
  const currentPage = isControlledPagination ? controlledCurrentPage : localCurrentPage;
  const pageSize = isControlledPagination ? controlledPageSize : localPageSize;

  const [localSortConfig, setLocalSortConfig] = useState({ key: null, direction: 'asc' });
  const isControlledSort = controlledSortConfig !== undefined && onSortChange !== undefined;
  const sortConfig = isControlledSort ? controlledSortConfig : localSortConfig;

  const getColKey = (header, index) => header.key || header.label || index.toString();
  const [visibleKeys, setVisibleKeys] = useState({});

  /* ── determine if row actions are needed ── */
  const hasRowActions = !!(onEdit || onDelete || onView || onToggle);

  /* ── build effective headers (auto-add Actions column) ── */
  const effectiveHeaders = useMemo(() => {
    if (!hasRowActions) return headers;
    // Don't duplicate if user already added an Actions column
    const alreadyHas = headers.some(h => (h.label || '').toLowerCase() === 'actions');
    if (alreadyHas) return headers;
    return [
      ...headers,
      {
        label: 'Actions',
        key: '__actions__',
        width: '120px',
        className: 'text-right',
        cellClassName: 'text-right',
        _isActionsCol: true,
      },
    ];
  }, [headers, hasRowActions]);

  /* ── effects ── */
  useEffect(() => {
    const initial = {};
    effectiveHeaders.forEach((h, i) => {
      // If a 'value' is provided, use it to determine visibility. Defaults to true.
      initial[getColKey(h, i)] = h.value ? h.value === 'checked' : true;
    });
    setVisibleKeys(initial);
  }, [effectiveHeaders]);

  useEffect(() => {
    if (!isControlledPagination) setLocalCurrentPage(1);
  }, [searchTerm, isControlledPagination]);

  /* ── column helpers ── */
  const toggleColumn = (key) =>
    setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }));

  const resetColumns = () => {
    const reset = {};
    effectiveHeaders.forEach((h, i) => { reset[getColKey(h, i)] = true; });
    setVisibleKeys(reset);
  };

  const visibleHeaders = effectiveHeaders.filter(
    (h, i) => visibleKeys[getColKey(h, i)] !== false
  );

  /* ── data pipeline ── */
  const filteredData = useMemo(() => {
    if (isControlledSearch) return data;
    if (!searchTerm) return data;
    const query = searchTerm.toLowerCase();
    return data.filter((item) =>
      headers.some((header) => {
        const key = header.key || header.label;
        if (!key) return false;
        const possibleKeys = [key, key.toLowerCase(), key.charAt(0).toLowerCase() + key.slice(1)];
        for (const pKey of possibleKeys) {
          const val = item[pKey];
          if (val !== undefined && val !== null) {
            if (typeof val === 'string' && val.toLowerCase().includes(query)) return true;
            if (typeof val === 'number' && val.toString().includes(query)) return true;
          }
        }
        if (header.render) {
          try {
            const rendered = header.render(item);
            if ((typeof rendered === 'string' || typeof rendered === 'number') &&
              rendered.toString().toLowerCase().includes(query)) return true;
          } catch (_) { /* silent */ }
        }
        return false;
      })
    );
  }, [data, searchTerm, headers, isControlledSearch]);

  const sortedData = useMemo(() => {
    if (isControlledSort || !sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const key = sortConfig.key;
      const resolve = (item) => {
        if (item[key] != null) return item[key];
        const lk = key.toLowerCase();
        if (item[lk] != null) return item[lk];
        const ck = key.charAt(0).toLowerCase() + key.slice(1);
        return item[ck] ?? null;
      };
      const aVal = resolve(a), bVal = resolve(b);
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortConfig.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (bVal > aVal ? 1 : -1);
    });
  }, [filteredData, sortConfig, isControlledSort]);

  const paginatedData = useMemo(() => {
    if (isControlledPagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, isControlledPagination]);

  const totalRecords = isControlledPagination ? (controlledTotalRows || 0) : sortedData.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);
  const pageNumbers = useMemo(() => getPageNumbers(currentPage, totalPages), [currentPage, totalPages]);

  /* ── handlers ── */
  const handlePageChange = (page) =>
    isControlledPagination ? onPageChange(page) : setLocalCurrentPage(page);

  const handlePageSizeChange = (size) => {
    if (isControlledPagination) { onPageSizeChange(size); }
    else { setLocalPageSize(size); setLocalCurrentPage(1); }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') key = null;
    const cfg = { key, direction };
    isControlledSort ? onSortChange(cfg) : setLocalSortConfig(cfg);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="w-3.5 h-3.5 text-indigo-500" />;
    return <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />;
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    isControlledSearch ? onSearchTermChange(val) : setLocalSearchTerm(val);
  };

  const clearSearch = () =>
    isControlledSearch ? onSearchTermChange('') : setLocalSearchTerm('');

  /* ── render cell ── */
  const renderCell = (header, item) => {
    // Auto-generated actions column
    if (header._isActionsCol) {
      return (
        <RowActions
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          onToggle={onToggle}
          toggleField={toggleField}
        />
      );
    }
    // Custom render
    if (header.render) return header.render(item);

    const raw = item[header.key];

    // Image type
    if (header.type === 'image') {
      return raw ? (
        <img
          src={raw}
          alt={item.name || 'Image'}
          className="w-12 h-12 object-cover rounded-lg border border-[var(--vs-border)] bg-[var(--vs-bg-secondary)]"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://placehold.co/100x100?text=No+Image';
          }}
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-[var(--vs-bg-secondary)] border border-[var(--vs-border)] flex items-center justify-center text-slate-400">
          <ImageIcon className="w-5 h-5" />
        </div>
      );
    }

    // Key-based with truncation
    return <TruncatedCell value={typeof raw === 'string' ? raw : raw} />;
  };

  /* ─────────────── JSX ─────────────── */
  return (
    <div className="w-full flex flex-col" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ── Toolbar ── */}
      <div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 p-3 sm:p-4 rounded-t-xl border border-[var(--vs-border)]"
        style={{ background: 'var(--vs-bg-primary)' }}
      >
        {/* Left: Column toggle + Actions slot */}
        <div className="flex flex-wrap items-end gap-2 w-full sm:w-auto">
          {showColumnsToggle && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-widest text-[var(--vs-text-secondary)] uppercase pl-0.5">
                Columns
              </span>
              <ColumnDropdown
                headers={effectiveHeaders}
                visibleKeys={visibleKeys}
                getColKey={getColKey}
                toggleColumn={toggleColumn}
                resetColumns={resetColumns}
              />
            </div>
          )}

          {actions && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-widest text-transparent uppercase select-none pl-0.5">
                &nbsp;
              </span>
              <div className="flex items-center h-10 gap-2">
                {actions}
              </div>
            </div>
          )}
        </div>

        {/* Right: Search */}
        {showSearch && (
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <span className="text-[10px] font-bold tracking-widest text-[var(--vs-text-secondary)] uppercase pl-0.5">
              Search
            </span>
            <div className="flex items-center w-full sm:w-72 md:w-80 lg:w-96">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearchChange}
                className="flex-1 h-10 px-3 bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] border border-[var(--vs-border)] rounded-l-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-0 transition-all"
              />
              <button
                type="button"
                className="h-10 w-10 flex-shrink-0 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white border border-indigo-600 shadow-sm transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={clearSearch}
                className="h-10 w-10 flex-shrink-0 flex items-center justify-center bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded-r-lg border border-rose-500 shadow-sm transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Table grid ── */}
      <div className="overflow-x-auto w-full border border-t-0 border-[var(--vs-border)] rounded-b-xl">
        <CTable hover responsive align="middle" className="mb-0 text-sm w-full border-collapse !bg-transparent">
          <CTableHead>
            <CTableRow>
              {visibleHeaders.map((header, index) => (
                <CTableHeaderCell
                  key={getColKey(header, index)}
                  className={`px-4 py-3 !bg-[var(--vs-bg-secondary)] !text-[var(--vs-text-secondary)] !border-b !border-r last:!border-r-0 !border-[var(--vs-border)] text-[11px] font-bold uppercase tracking-widest whitespace-nowrap ${header.className || ''}`}
                  style={{ width: header.width }}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{header.label}</span>
                    {header.sortable && (
                      <button
                        type="button"
                        onClick={() => handleSort(header.key || header.label)}
                        className="text-[var(--vs-text-secondary)] hover:text-[var(--vs-text-primary)] transition-colors cursor-pointer p-0.5 rounded hover:bg-[var(--vs-bg-primary)]"
                      >
                        {getSortIcon(header.key || header.label)}
                      </button>
                    )}
                  </div>
                </CTableHeaderCell>
              ))}
            </CTableRow>
          </CTableHead>

          <CTableBody>
            {loading && paginatedData.length === 0 ? (
              <CTableRow>
                <CTableDataCell
                  colSpan={visibleHeaders.length}
                  className="px-6 py-12 text-center !bg-[var(--vs-bg-primary)] !text-[var(--vs-text-secondary)] !border-none"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <span className="text-sm">Loading...</span>
                  </div>
                </CTableDataCell>
              </CTableRow>
            ) : paginatedData.length === 0 ? (
              <CTableRow>
                <CTableDataCell
                  colSpan={visibleHeaders.length}
                  className="px-6 py-12 text-center !bg-[var(--vs-bg-primary)] !text-[var(--vs-text-secondary)] !border-none"
                >
                  <div className="relative flex flex-col items-center justify-center h-48 rounded-xl bg-white text-gray-600">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-50 via-white to-indigo-50"></div>
                    <div className="absolute inset-0 rounded-xl border-2 border-dashed border-blue-200"></div>
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="p-3 mb-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full">
                        {/* <InfoIcon className="w-12 h-12 text-blue-400" /> */}
                        <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-center text-lg font-semibold text-blue-600">{emptyMessage}</p>
                    </div>
                  </div>
                </CTableDataCell>
              </CTableRow>
            ) : (
              paginatedData.map((item, rowIndex) => (
                <CTableRow
                  key={item._id || rowIndex}
                  className={`transition-colors ${rowIndex % 2 !== 0 ? 'bg-[var(--vs-bg-secondary)]/[0.3]' : ''} hover:!bg-indigo-50/[0.08]`}
                >
                  {visibleHeaders.map((header, colIndex) => (
                    <CTableDataCell
                      key={colIndex}
                      className={`px-4 py-2.5 !bg-transparent !text-[var(--vs-text-primary)] !border-r last:!border-r-0 !border-[var(--vs-border)] ${rowIndex === paginatedData.length - 1 ? '' : '!border-b'} ${header.cellClassName || ''}`}
                    >
                      {renderCell(header, item)}
                    </CTableDataCell>
                  ))}
                </CTableRow>
              ))
            )}
          </CTableBody>
        </CTable>
      </div>

      {/* ── Pagination ── */}
      {showPagination && totalRecords > 0 && (
        <div className="flex flex-col sm:flex-row justify-between sm:justify-end items-center gap-3 mt-4 text-sm text-[var(--vs-text-secondary)] flex-wrap">
          <span className="text-xs sm:text-sm whitespace-nowrap order-2 sm:order-1">
            Showing{' '}
            <span className="font-semibold text-[var(--vs-text-primary)]">{startRecord}–{endRecord}</span>
            {' '}of{' '}
            <span className="font-semibold text-[var(--vs-text-primary)]">{totalRecords}</span>
            {' '}records
          </span>

          <div className="flex items-center gap-2 order-1 sm:order-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-600 hover:text-white hover:border-indigo-600 shadow-sm transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              {pageNumbers.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => typeof p === 'number' && handlePageChange(p)}
                  disabled={p === '...'}
                  className={`h-8 min-w-[2rem] px-1.5 flex items-center justify-center rounded-lg border text-sm transition-all shadow-sm font-medium
                    ${p === currentPage
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : p === '...'
                        ? 'border-transparent bg-transparent text-[var(--vs-text-secondary)] cursor-default shadow-none text-xs'
                        : 'border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] hover:bg-indigo-600 hover:text-white hover:border-indigo-600 cursor-pointer'
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-600 hover:text-white hover:border-indigo-600 shadow-sm transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="h-8 px-2 bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] border border-[var(--vs-border)] rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt} / page</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
