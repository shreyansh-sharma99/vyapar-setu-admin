import { Edit2, Eye, Trash2 } from 'lucide-react';
import { FaHistory } from 'react-icons/fa';
import { Button, DataTable, Switch } from '@/components/ui';

/*
 * The old list table API, drawn by the Soft UI DataTable. Pages that still pass `headers` / `data`
 * keep working unchanged; new or migrated pages use <DataTable> from @/components/ui directly.
 *
 * Mapping: headers → columns (label → header, value 'unchecked' → hidden by default, numbers right-
 * aligned), onView / onEdit / onDelete / onAudit / onToggle → an actions column first (fixed while the row scrolls),
 * `actions` → toolbar, searchTerm + onSearchTermChange → controlled search (search icon / Enter = onSearchClick),
 * currentPage + pageSize + onPageChange → server paging, otherwise paging in the browser.
 */

const isActionsHeader = (h) => h.key === 'actions' || h.key === '__actions__' || (h.label || '').toLowerCase() === 'actions';

function RowActions({ item, onEdit, onDelete, onView, onAudit, auditTitle = 'Stock Audit Report', showAudit, onToggle, toggleField = 'isActive' }) {
  return (
    <div className="inline-flex items-center justify-end gap-0.5">
      {onToggle && (
        <span className="mr-1 inline-flex">
          <Switch
            size="sm"
            checked={item[toggleField] === true || item[toggleField] === 'active'}
            onChange={(val) => onToggle(item, val)}
          />
        </span>
      )}
      {onView && (
        <Button variant="ghost" size="icon-sm" title="View" aria-label="View" onClick={() => onView(item)} className="text-info hover:bg-info-soft hover:text-info">
          <Eye />
        </Button>
      )}
      {onEdit && (
        <Button variant="ghost" size="icon-sm" title="Edit" aria-label="Edit" onClick={() => onEdit(item)} className="text-info hover:bg-info-soft hover:text-info">
          <Edit2 />
        </Button>
      )}
      {onDelete && (
        <Button variant="ghost" size="icon-sm" title="Delete" aria-label="Delete" onClick={() => onDelete(item)} className="text-danger hover:bg-danger-soft hover:text-danger">
          <Trash2 />
        </Button>
      )}
      {onAudit && (!showAudit || showAudit(item)) && (
        <Button variant="ghost" size="icon-sm" title={auditTitle} aria-label={auditTitle} onClick={() => onAudit(item)} className="text-info hover:bg-info-soft hover:text-info">
          <FaHistory />
        </Button>
      )}
    </div>
  );
}

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
  auditTitle,
  showAudit,
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
  maxHeight,
}) {
  const hasRowActions = !!(onEdit || onDelete || onView || onAudit || onToggle);
  const actionsHeader = headers.find(isActionsHeader);

  const columns = headers
    .filter((h) => !isActionsHeader(h))
    .map((h) => ({
      key: h.key || h.label,
      header: h.label,
      render: h.render,
      type: h.type === 'image' ? 'image' : undefined,
      sortable: !!h.sortable,
      sortKey: h.key || h.label,
      width: h.width,
      className: h.className,
      cellClassName: h.cellClassName,
      defaultHidden: h.value ? h.value !== 'checked' : false,
      align: /(^|\s)!?text-(left|center|right|start|end)(\s|$)/.test(h.cellClassName || '') ? 'left' : 'auto',
      truncate: !h.render,
    }));

  if (actionsHeader) {
    columns.push({ key: '__actions__', header: actionsHeader.label === 'Actions' ? '' : actionsHeader.label, type: 'actions', render: actionsHeader.render });
  } else if (hasRowActions) {
    columns.push({
      key: '__actions__',
      header: '',
      type: 'actions',
      render: (item) => (
        <RowActions
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          onAudit={onAudit}
          auditTitle={auditTitle}
          showAudit={showAudit}
          onToggle={onToggle}
          toggleField={toggleField}
        />
      ),
    });
  }

  const isControlledSearch = controlledSearchTerm !== undefined && onSearchTermChange !== undefined;
  const isControlledPaging = controlledCurrentPage !== undefined && controlledPageSize !== undefined && onPageChange !== undefined;

  const search = showSearch
    ? {
        placeholder: searchPlaceholder,
        ...(isControlledSearch ? { value: controlledSearchTerm, onChange: onSearchTermChange } : {}),
        onSubmit: onSearchClick ? () => onSearchClick() : undefined,
        onClear: onSearchClear,
      }
    : undefined;

  // The search box has its own search / clear icons (DataTable).
  const toolbar = actions || null;

  const pagination = !showPagination
    ? false
    : isControlledPaging
      ? {
          page: controlledCurrentPage,
          pageSize: controlledPageSize,
          total: controlledTotalRows || 0,
          onPageChange,
          onPageSizeChange: onPageSizeChange ?? undefined,
          pageSizeOptions,
        }
      : 'client';

  return (
    <DataTable
      columns={columns}
      rows={data}
      loading={loading}
      empty={emptyMessage}
      search={search}
      toolbar={toolbar}
      columnPicker={showColumnsToggle}
      pagination={pagination}
      pageSizeOptions={pageSizeOptions}
      sort={controlledSortConfig}
      onSortChange={onSortChange}
      maxHeight={maxHeight}
    />
  );
}
