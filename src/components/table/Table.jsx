import { useState, useRef, useEffect, useMemo } from 'react';
import { Pagination } from 'antd';
import {
  Search,
  X,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Eye,
  Info,
  Image as ImageIcon,
} from 'lucide-react';
import Switch from '@/components/inputs/Switch';
import Loader from '@/components/loader/Loader';
import { FaHistory } from 'react-icons/fa';

/*
 * Same look as Admin Owner's AdvanceTable: "Columns" + "Search" toolbar, bordered
 * cells (px-5 py-2 header, px-4 py-1 body), sticky header and actions column,
 * antd pagination on the right.
 */

/* ─── helpers ─────────────────────────────────────────────────────────────── */

/** Truncate plain text to N words */
const truncateWords = (text, maxWords = 8) => {
  if (typeof text !== 'string') return { short: text, full: text, isTruncated: false };
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return { short: text, full: text, isTruncated: false };
  return { short: words.slice(0, maxWords).join(' ') + '...', full: text, isTruncated: true };
};

/** true when the column already sets its own text alignment */
const hasAlign = (cls = '') => /(^|\s)!?text-(left|center|right|start|end)(\s|$)/.test(cls);

/* ─── TruncatedCell ─────────────────────────────────────────────────────────── */

function TruncatedCell({ value }) {
  const [expanded, setExpanded] = useState(false);
  const { short, full, isTruncated } = truncateWords(value);
  if (!isTruncated) return <span>{value}</span>;
  return (
    <span
      className="cursor-pointer"
      onClick={() => setExpanded(!expanded)}
      title="Click to toggle full text"
    >
      {expanded ? full : short}
    </span>
  );
}

/* ─── RowActions ────────────────────────────────────────────────────────────── */

const iconBtn = 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer';

function RowActions({ item, onEdit, onDelete, onView, onAudit, onToggle, toggleField = 'isActive' }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {onToggle && (
        <Switch
          size="sm"
          checked={item[toggleField] === true || item[toggleField] === 'active'}
          onChange={(val) => onToggle(item, val)}
        />
      )}
      {onView && (
        <button type="button" onClick={() => onView(item)} className={iconBtn} title="View">
          <Eye className="w-5 h-5" />
        </button>
      )}
      {onEdit && (
        <button type="button" onClick={() => onEdit(item)} className={iconBtn} title="Edit">
          <Edit2 className="w-5 h-5" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(item)}
          className="text-red-600 hover:text-red-800 transition-colors cursor-pointer"
          title="Delete"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
      {onAudit && (
        <button type="button" onClick={() => onAudit(item)} className={iconBtn} title="Stock Audit Report">
          <FaHistory className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/* ─── Column Dropdown ───────────────────────────────────────────────────────── */

function ColumnDropdown({ headers, visibleKeys, getColKey, toggleColumn }) {
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

  return (
    <div className="relative" ref={ref}>
      {/* <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Columns</label> */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center justify-between gap-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-md text-sm w-full sm:w-44 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
      >
        <span>Columns ({visibleCount}/{headers.length})</span>
        <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {headers.map((header, index) => {
            const key = getColKey(header, index);
            return (
              <label
                key={key}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={visibleKeys[key] !== false}
                  onChange={() => toggleColumn(key)}
                  className="h-4 w-4 rounded text-blue-600 border-gray-300"
                />
                <span className="text-gray-700 dark:text-gray-200">{header.label}</span>
              </label>
            );
          })}
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
  emptyMessage = 'No records found',
  showSearch = true,
  searchPlaceholder = 'Search records...',
  searchTerm: controlledSearchTerm,
  onSearchTermChange,
  onSearchClick,
  onSearchClear,
  showColumnsToggle = true,
  actions,
  onEdit,
  onDelete,
  onView,
  onAudit,
  onToggle,
  toggleField = 'isActive',
  showPagination = true,
  pageSizeOptions = [10, 20, 50, 100, 500],
  currentPage: controlledCurrentPage,
  pageSize: controlledPageSize,
  totalRows: controlledTotalRows,
  onPageChange,
  onPageSizeChange,
  sortConfig: controlledSortConfig,
  onSortChange,
  maxHeight, // optional CSS height of the scroll area (default: fills the screen)
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
  const hasRowActions = !!(onEdit || onDelete || onView || onAudit || onToggle);

  /* ── build effective headers (Actions column always first and sticky) ── */
  const effectiveHeaders = useMemo(() => {
    let actionsHeader = null;
    const otherHeaders = [];

    headers.forEach((h) => {
      const isActions = h.key === 'actions' || h.key === '__actions__' || (h.label || '').toLowerCase() === 'actions';
      if (isActions) {
        actionsHeader = { ...h, _isActionsCol: true };
      } else {
        otherHeaders.push(h);
      }
    });

    if (!actionsHeader && hasRowActions) {
      actionsHeader = {
        label: 'Action',
        key: '__actions__',
        className: 'text-center',
        cellClassName: 'text-center',
        _isActionsCol: true,
      };
    }

    if (actionsHeader) return [actionsHeader, ...otherHeaders];
    return headers;
  }, [headers, hasRowActions]);

  /* ── reset on change (during render, not in an effect) ── */
  const [colsFor, setColsFor] = useState(null);
  if (colsFor !== effectiveHeaders) {
    const initial = {};
    effectiveHeaders.forEach((h, i) => {
      initial[getColKey(h, i)] = h.value ? h.value === 'checked' : true;
    });
    setColsFor(effectiveHeaders);
    setVisibleKeys(initial);
  }

  const [searchFor, setSearchFor] = useState(searchTerm);
  if (searchFor !== searchTerm) {
    setSearchFor(searchTerm);
    if (!isControlledPagination) setLocalCurrentPage(1);
  }

  /* ── column helpers ── */
  const toggleColumn = (key) =>
    setVisibleKeys((prev) => ({ ...prev, [key]: prev[key] === false }));

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
          } catch { /* silent */ }
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

  /* ── handlers ── */
  const handlePageChange = (page) =>
    isControlledPagination ? onPageChange(page) : setLocalCurrentPage(page);

  const handlePageSizeChange = (size) => {
    if (isControlledPagination) { onPageSizeChange?.(size); }
    else { setLocalPageSize(size); setLocalCurrentPage(1); }
  };

  const handlePaginationChange = (page, size) => {
    if (size && size !== pageSize) handlePageSizeChange(size);
    else handlePageChange(page);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') key = null;
    const cfg = { key, direction };
    isControlledSort ? onSortChange(cfg) : setLocalSortConfig(cfg);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    isControlledSearch ? onSearchTermChange(val) : setLocalSearchTerm(val);
  };

  const clearSearch = () => {
    if (isControlledSearch) onSearchTermChange('');
    else setLocalSearchTerm('');
    onSearchClear?.();
  };

  /* ── render cell ── */
  const renderCell = (header, item) => {
    if (header.render) return header.render(item);

    if (header._isActionsCol) {
      return (
        <RowActions
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          onAudit={onAudit}
          onToggle={onToggle}
          toggleField={toggleField}
        />
      );
    }

    const raw = item[header.key];

    if (header.type === 'image') {
      return raw ? (
        <img
          src={raw}
          alt={item.name || 'Image'}
          className="w-16 h-16 object-cover rounded"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://placehold.co/100x100?text=No+Image';
          }}
        />
      ) : (
        <div className="w-16 h-16 rounded bg-gray-50 dark:bg-white/[0.04] flex items-center justify-center text-gray-400">
          <ImageIcon className="w-5 h-5" />
        </div>
      );
    }

    return <TruncatedCell value={raw} />;
  };

  /** Admin rule: numbers and "—" centered, text left — unless the column says otherwise */
  const cellAlign = (header, item) => {
    if (hasAlign(header.cellClassName)) return '';
    if (header._isActionsCol) return 'text-center';
    const raw = item[header.key];
    return typeof raw === 'number' || raw === '—' || raw === '-' ? 'text-center' : 'text-start';
  };

  const cellBorder = 'border border-gray-200 dark:border-gray-700';
  // sticky cells lose their collapsed borders while scrolling: draw the right and bottom line inside the cell
  const stickyLine = 'shadow-[inset_-1px_-1px_0_#e5e7eb] dark:shadow-[inset_-1px_-1px_0_#374151]';

  /* ─────────────── JSX ─────────────── */
  return (
    <div className="w-full max-w-full overflow-hidden">

      {/* ── Toolbar ── */}
      {(showColumnsToggle || actions || showSearch) && (
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between flex-wrap">
          {/* Left: column picker + page buttons */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap">
            {showColumnsToggle && (
              <ColumnDropdown
                headers={effectiveHeaders}
                visibleKeys={visibleKeys}
                getColKey={getColKey}
                toggleColumn={toggleColumn}
              />
            )}
            {actions && <div className="flex flex-wrap items-end gap-1.5">{actions}</div>}
          </div>

          {/* Right: search */}
          {showSearch && (
            <div className="w-full sm:w-auto sm:flex-1 sm:max-w-sm">
              {/* <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Search</label> */}
              <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition">
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && onSearchClick) onSearchClick();
                  }}
                  className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm outline-none border-0"
                />
                <button
                  type="button"
                  onClick={onSearchClick}
                  className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center cursor-pointer"
                  title="Search"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="px-3 py-2 bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center cursor-pointer"
                  title="Clear"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center h-[300px]"><Loader /></div>
      ) : paginatedData.length === 0 ? (
        <div className="relative flex flex-col items-center justify-center h-48 rounded-xl bg-white dark:bg-white/[0.03] text-gray-600">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-50 via-white to-indigo-50 dark:from-blue-900/10 dark:via-transparent dark:to-indigo-900/10"></div>
          <div className="absolute inset-0 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-800/50"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="p-3 mb-3 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-full">
              <Info className="w-12 h-12 text-blue-400" />
            </div>
            <p className="text-center text-lg font-semibold text-blue-600 dark:text-blue-400">{emptyMessage}</p>
          </div>
        </div>
      ) : (
        <div
          className="w-full max-w-full overflow-x-auto overflow-y-auto relative border border-gray-200 dark:border-gray-700 rounded-md"
          style={{ maxHeight: maxHeight || 'max(320px, calc(100vh - 330px))' }}
        >
          <table className="min-w-full border-collapse bg-white dark:bg-[var(--vs-bg-primary)]">
            <thead className="sticky top-0 z-40 bg-white dark:bg-[var(--vs-bg-primary)]">
              <tr>
                {visibleHeaders.map((header, index) => {
                  const isActions = header._isActionsCol;
                  const sortKey = header.key || header.label;
                  const sortable = header.sortable && !isActions;
                  return (
                    <th
                      key={getColKey(header, index)}
                      onClick={sortable ? () => handleSort(sortKey) : undefined}
                      className={`px-5 py-2 font-medium text-sm text-gray-600 dark:text-white text-center whitespace-nowrap border-t-0 ${isActions
                        ? `sticky left-0 z-40 bg-white dark:bg-[var(--vs-bg-primary)] ${cellBorder} ${stickyLine} min-w-[120px]`
                        : cellBorder} ${sortable ? 'cursor-pointer select-none' : ''} ${header.className || ''}`}
                      style={{ width: header.width }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {header.label}
                        {sortable && (
                          <div className="flex flex-col items-center justify-center ml-1">
                            <ArrowUp className={`w-3 h-3 ${sortConfig.key === sortKey && sortConfig.direction === 'asc' ? 'text-black dark:text-white' : 'text-gray-300 dark:text-gray-600'}`} />
                            <ArrowDown className={`w-3 h-3 ${sortConfig.key === sortKey && sortConfig.direction === 'desc' ? 'text-black dark:text-white' : 'text-gray-300 dark:text-gray-600'}`} />
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {paginatedData.map((item, rowIndex) => (
                <tr key={item._id || rowIndex}>
                  {visibleHeaders.map((header, colIndex) => {
                    const isActions = header._isActionsCol;
                    return (
                      <td
                        key={colIndex}
                        className={`text-sm text-gray-800 dark:text-gray-100 whitespace-nowrap ${isActions
                          ? `sticky left-0 z-30 bg-white dark:bg-[var(--vs-bg-primary)] ${cellBorder} ${stickyLine} px-4 py-1.5 min-w-[120px]`
                          : `px-4 py-1 ${cellBorder}`} ${cellAlign(header, item)} ${header.cellClassName || ''}`}
                      >
                        {renderCell(header, item)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {showPagination && totalRecords > 0 && (
        <div className="flex justify-end mt-4">
          <Pagination
            current={currentPage}
            total={totalRecords}
            pageSize={pageSize}
            onChange={handlePaginationChange}
            showSizeChanger
            showQuickJumper
            pageSizeOptions={pageSizeOptions.map(String)}
            className="ant-pagination-custom"
            showTotal={(total, range) => `Showing ${range[0]}-${range[1]} of ${total} records`}
          />
        </div>
      )}
    </div>
  );
}
