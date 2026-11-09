import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FileDown,
  FileSpreadsheet,
  SearchCheck,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Rows3,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Field,
  Input,
  LINE_TD,
  LINE_TH,
  LineItemsTable,
  LineRow,
  PageHeader,
  Section,
  Select,
  StatCard,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { getCategoriesApi } from '../categories/services/categoryService';
import { getBrandsApi } from '../brands/services/brandService';
import {
  exportProductsApi,
  downloadProductImportTemplateApi,
  importProductsApi,
} from './services/productService';
import ToastStack from './components/ToastStack';
import { getApiErrorMessage, saveBlobResponse, todayStamp, useToasts } from './utils/productUtils';
import useGstRates from '@/pages/masterSettings/components/useGstRates';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const MODE_OPTIONS = [
  { value: 'create', label: 'Add new products only' },
  { value: 'upsert', label: 'Add new and update existing (matched by SKU, then by a barcode in use)' },
];

const ACTION_TONE = { create: 'success', update: 'primary', skip: 'neutral', error: 'danger' };

const ACTION_LABELS = { create: 'New', update: 'Update', skip: 'Skip', error: 'Error' };

export default function ProductImportExport() {
  const navigate = useNavigate();
  const { toasts, showToast } = useToasts(5000);
  const fileInputRef = useRef(null);

  // export
  const [exportFilters, setExportFilters] = useState({ status: '', categoryId: '', brandId: '' });
  const [options, setOptions] = useState({ categories: [], brands: [] });
  const [exporting, setExporting] = useState(false);
  const { rates: gstRates } = useGstRates();
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // import
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('create');
  const [createMissing, setCreateMissing] = useState(true);
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [check, setCheck] = useState(null); // dry-run response
  const [result, setResult] = useState(null); // final response
  const [importError, setImportError] = useState(null);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getCategoriesApi({ page: 1, limit: 100 }), getBrandsApi({ page: 1, limit: 100 })]).then(([c, b]) => {
      if (cancelled) return;
      setOptions({
        categories: c.status === 'fulfilled' ? c.value?.data || [] : [],
        brands: b.status === 'fulfilled' ? b.value?.data || [] : [],
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const resetImportState = () => {
    setCheck(null);
    setResult(null);
    setImportError(null);
    setErrorsOnly(false);
  };

  const pickFile = (f) => {
    resetImportState();
    if (!f) {
      setFile(null);
      return;
    }
    if (!/\.xlsx$/i.test(f.name)) {
      setFile(null);
      setImportError('Please choose an Excel file (.xlsx). Download the template if you need the right format.');
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFile(null);
      setImportError('The file is larger than 5 MB. Split it into smaller files.');
      return;
    }
    setFile(f);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      Object.entries(exportFilters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const res = await exportProductsApi(params);
      const name = saveBlobResponse(res, `Products_${todayStamp()}.xlsx`);
      showToast(`Downloaded ${name}`, 'success');
    } catch (err) {
      showToast(await getApiErrorMessage(err, 'Export failed. Please try again.'), 'danger');
    } finally {
      setExporting(false);
    }
  };

  const handleTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await downloadProductImportTemplateApi();
      saveBlobResponse(res, 'Product_Import_Template.xlsx');
    } catch (err) {
      showToast(await getApiErrorMessage(err, 'Could not download the template.'), 'danger');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const runImport = async (dryRun) => {
    if (!file) return;
    setImportError(null);
    if (dryRun) setChecking(true);
    else setImporting(true);
    try {
      const res = await importProductsApi(file, { dryRun, mode, createMissing });
      if (dryRun) {
        setCheck(res);
        setResult(null);
      } else {
        setResult(res);
        const s = res?.summary || {};
        showToast(`Import finished: ${s.created || 0} added, ${s.updated || 0} updated.`, 'success');
      }
    } catch (err) {
      setImportError(await getApiErrorMessage(err, dryRun ? 'Could not check the file.' : 'Import failed.'));
    } finally {
      setChecking(false);
      setImporting(false);
    }
  };

  const active = result || check;
  const summary = active?.summary || {};
  const readyCount = (check?.summary?.toCreate || 0) + (check?.summary?.toUpdate || 0);
  const rows = useMemo(() => {
    const list = Array.isArray(active?.data) ? active.data : [];
    return errorsOnly ? list.filter((r) => r.action === 'error' || r.errors?.length) : list;
  }, [active, errorsOnly]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Import / Export Products"
        description="Download your catalogue as Excel, or add and update many products at once from an Excel file."
        actions={
          <Button variant="secondary" size="sm" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />

      {/* Export */}
      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <FileDown className="size-4 text-brand-ink" aria-hidden="true" /> Export products
          </span>
        }
        description="Leave filters empty to export every product."
      >
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
          <Field label="Status">
            <Select
              searchable={false}
              options={[
                { value: '', label: 'All statuses' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              value={exportFilters.status}
              onChange={(v) => setExportFilters((p) => ({ ...p, status: v }))}
              placeholder="All statuses"
            />
          </Field>
          <Field label="Category">
            <Select
              options={[{ value: '', label: 'All categories' }, ...options.categories.map((c) => ({ value: c._id, label: c.name }))]}
              value={exportFilters.categoryId}
              onChange={(v) => setExportFilters((p) => ({ ...p, categoryId: v }))}
              placeholder="All categories"
            />
          </Field>
          <Field label="Brand">
            <Select
              options={[{ value: '', label: 'All brands' }, ...options.brands.map((b) => ({ value: b._id, label: b.name }))]}
              value={exportFilters.brandId}
              onChange={(v) => setExportFilters((p) => ({ ...p, brandId: v }))}
              placeholder="All brands"
            />
          </Field>
          <Button className="h-11" onClick={handleExport} loading={exporting} startIcon={<Download />}>
            {exporting ? 'Exporting...' : 'Export to Excel'}
          </Button>
        </div>
      </Section>

      {/* Import */}
      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <Upload className="size-4 text-brand-ink" aria-hidden="true" /> Import products
          </span>
        }
        actions={
          <Button variant="secondary" size="sm" onClick={handleTemplate} loading={downloadingTemplate} startIcon={<FileSpreadsheet />}>
            Download template
          </Button>
        }
        bodyClassName="flex flex-col gap-4"
      >
        <Alert tone="neutral">
          <p className="m-0">
            Use the template, fill one product per row, then check the file before importing. Max 5 MB, .xlsx only. GST Rate % for new products must be one of {gstRates.length ? gstRates.map((r) => `${r}`).join(', ') : '…'}.
          </p>
          <p className="m-0 mt-1">
            Barcode: one per product while it has stock (incl. damaged). After the stock is fully 0, another product can use it after the Barcode hold days in Settings. An update does not change a product&apos;s barcode.
          </p>
        </Alert>

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed px-4 py-7 text-center transition-colors',
            dragActive ? 'border-brand bg-brand-soft' : 'border-line bg-fill-2 hover:border-brand'
          )}
        >
          <Input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            wrapperClassName="hidden"
            className="hidden"
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <span className="grid size-12 place-items-center rounded-card bg-brand-soft text-brand-ink">
            <FileSpreadsheet className="size-6" aria-hidden="true" />
          </span>
          {file ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="break-all font-semibold text-ink">{file.name}</span>
              <span className="text-xs text-ink-muted">({(file.size / 1024).toFixed(0)} KB)</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  pickFile(null);
                }}
                className="text-danger hover:bg-danger-soft hover:text-danger"
                title="Remove file"
                aria-label="Remove file"
              >
                <X />
              </Button>
            </div>
          ) : (
            <span className="text-sm text-ink">
              Drag & drop your .xlsx file here or <span className="font-semibold text-brand-ink">browse</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 items-end gap-3 lg:grid-cols-[1fr_auto]">
          <Field label="What should the import do?">
            <Select
              searchable={false}
              options={MODE_OPTIONS}
              value={mode}
              onChange={(v) => {
                setMode(v || 'create');
                resetImportState();
              }}
            />
          </Field>
          <Checkbox
            id="import-create-missing"
            label="Create missing categories and brands"
            checked={createMissing}
            wrapperClassName="lg:h-11"
            onChange={(v) => {
              setCreateMissing(v);
              resetImportState();
            }}
          />
        </div>

        {importError && <Alert tone="danger">{importError}</Alert>}

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => runImport(true)}
            disabled={!file || checking || importing}
            loading={checking}
            startIcon={<SearchCheck />}
          >
            {checking ? 'Checking...' : 'Check file'}
          </Button>
          {check && !result && (
            <Button onClick={() => runImport(false)} disabled={!readyCount || importing || checking} loading={importing} startIcon={<Upload />}>
              {importing ? 'Importing...' : `Import ${readyCount} product${readyCount === 1 ? '' : 's'}`}
            </Button>
          )}
        </div>
      </Section>

      {/* Summary + rows */}
      {active && (
        <Section title={result ? 'Import result' : 'File check'} bodyClassName="flex flex-col gap-4">
          <Alert tone={result ? 'success' : 'info'} icon={result ? CheckCircle2 : SearchCheck}>
            {result
              ? 'Import complete. Rows with errors were not imported. Fix them in the file and import again.'
              : summary.errors
                ? `File checked. ${summary.errors} row(s) have errors and will be skipped. Nothing has been saved yet.`
                : 'File checked. No errors found. Nothing has been saved yet.'}
          </Alert>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Rows in file" value={summary.totalRows ?? 0} icon={Rows3} tone="neutral" />
            {result ? (
              <>
                <StatCard label="Added" value={summary.created ?? 0} icon={CheckCircle2} tone="success" />
                <StatCard label="Updated" value={summary.updated ?? 0} icon={RefreshCw} tone="primary" />
              </>
            ) : (
              <>
                <StatCard label="Will be added" value={summary.toCreate ?? 0} icon={CheckCircle2} tone="success" />
                <StatCard label="Will be updated" value={summary.toUpdate ?? 0} icon={RefreshCw} tone="primary" />
              </>
            )}
            <StatCard label="Errors" value={summary.errors ?? 0} icon={AlertTriangle} tone={summary.errors ? 'danger' : 'neutral'} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-ink-muted">{rows.length} row(s) shown</span>
            <Checkbox id="import-errors-only" label="Show rows with errors only" checked={errorsOnly} onChange={setErrorsOnly} />
          </div>

          <LineItemsTable
            minWidth={640}
            className="max-h-[480px] overflow-auto"
            head={
              <tr>
                <th className={cn(LINE_TH, 'sticky top-0 z-10 w-16')}>Row</th>
                <th className={cn(LINE_TH, 'sticky top-0 z-10')}>Product</th>
                <th className={cn(LINE_TH, 'sticky top-0 z-10')}>SKU</th>
                <th className={cn(LINE_TH, 'sticky top-0 z-10 w-24')}>Action</th>
                <th className={cn(LINE_TH, 'sticky top-0 z-10')}>Problems</th>
              </tr>
            }
          >
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className={cn(LINE_TD, 'py-6 text-center text-ink-muted')}>
                  No rows to show.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <LineRow key={`${r.row}-${idx}`} tone={r.action === 'error' ? 'danger' : undefined}>
                  <td className={cn(LINE_TD, 'font-mono')}>{r.row}</td>
                  <td className={cn(LINE_TD, 'font-medium')}>{r.name || '—'}</td>
                  <td className={cn(LINE_TD, 'font-mono')}>{r.sku || '—'}</td>
                  <td className={LINE_TD}>
                    <Badge tone={ACTION_TONE[r.action] || ACTION_TONE.skip}>{ACTION_LABELS[r.action] || r.action}</Badge>
                  </td>
                  <td className={LINE_TD}>
                    {r.errors?.length ? (
                      <ul className="m-0 flex list-none flex-col gap-0.5 pl-0 text-xs text-danger">
                        {r.errors.map((e, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                            <span className="whitespace-normal">{e}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-ink-subtle">—</span>
                    )}
                  </td>
                </LineRow>
              ))
            )}
          </LineItemsTable>

          {result && (
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => pickFile(null)}>
                Import another file
              </Button>
              <Button onClick={() => navigate('/products')}>Go to Products</Button>
            </div>
          )}
        </Section>
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}
