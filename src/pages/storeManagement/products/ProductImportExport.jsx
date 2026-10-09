import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FileDown,
  FileSpreadsheet,
  Loader2,
  SearchCheck,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import Select from '@/components/inputs/Select';
import Checkbox from '@/components/inputs/Checkbox';
import { Label } from '@/components/inputs/Label';
import { getCategoriesApi } from '../categories/services/categoryService';
import { getBrandsApi } from '../brands/services/brandService';
import {
  exportProductsApi,
  downloadProductImportTemplateApi,
  importProductsApi,
} from './services/productService';
import ToastStack from './components/ToastStack';
import { getApiErrorMessage, saveBlobResponse, todayStamp, useToasts } from './utils/productUtils';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const MODE_OPTIONS = [
  { value: 'create', label: 'Add new products only' },
  { value: 'upsert', label: 'Add new and update existing (matched by SKU or barcode)' },
];

const ACTION_STYLES = {
  create: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  update: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
  skip: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
  error: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
};

const ACTION_LABELS = { create: 'New', update: 'Update', skip: 'Skip', error: 'Error' };

function SummaryTile({ label, value, tone = 'default' }) {
  const tones = {
    default: 'text-[var(--vs-text-primary)]',
    green: 'text-emerald-600 dark:text-emerald-400',
    blue: 'text-indigo-600 dark:text-indigo-400',
    red: 'text-rose-600 dark:text-rose-400',
  };
  return (
    <div className="flex flex-col p-3 rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-secondary)]">
      <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--vs-text-secondary)]">{label}</span>
      <span className={`text-xl font-bold ${tones[tone]}`}>{value ?? 0}</span>
    </div>
  );
}

export default function ProductImportExport() {
  const navigate = useNavigate();
  const { toasts, showToast } = useToasts(5000);
  const fileInputRef = useRef(null);

  // export
  const [exportFilters, setExportFilters] = useState({ status: '', categoryId: '', brandId: '' });
  const [options, setOptions] = useState({ categories: [], brands: [] });
  const [exporting, setExporting] = useState(false);
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
    <div className="flex flex-col gap-6">
      <Card
        h1="Import / Export Products"
        description="Download your catalogue as Excel, or add and update many products at once from an Excel file."
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-4 sm:p-6 flex flex-col gap-6"
      >
        {/* Export */}
        <section className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--vs-text-primary)] m-0 flex items-center gap-2">
              <FileDown className="w-4 h-4 text-indigo-500" /> Export products
            </h3>
            <p className="text-xs text-[var(--vs-text-secondary)] m-0">Leave filters empty to export every product.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] gap-3 items-end">
            <div>
              <Label className="!mb-1 text-xs">Status</Label>
              <Select
                options={[
                  { value: '', label: 'All statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                value={exportFilters.status}
                onChange={(v) => setExportFilters((p) => ({ ...p, status: v }))}
                placeholder="All statuses"
              />
            </div>
            <div>
              <Label className="!mb-1 text-xs">Category</Label>
              <Select
                options={[{ value: '', label: 'All categories' }, ...options.categories.map((c) => ({ value: c._id, label: c.name }))]}
                value={exportFilters.categoryId}
                onChange={(v) => setExportFilters((p) => ({ ...p, categoryId: v }))}
                placeholder="All categories"
              />
            </div>
            <div>
              <Label className="!mb-1 text-xs">Brand</Label>
              <Select
                options={[{ value: '', label: 'All brands' }, ...options.brands.map((b) => ({ value: b._id, label: b.name }))]}
                value={exportFilters.brandId}
                onChange={(v) => setExportFilters((p) => ({ ...p, brandId: v }))}
                placeholder="All brands"
              />
            </div>
            <Button
              className="!h-11"
              onClick={handleExport}
              disabled={exporting}
              startIcon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            >
              {exporting ? 'Exporting...' : 'Export to Excel'}
            </Button>
          </div>
        </section>

        <hr className="border-[var(--vs-border)] m-0" />

        {/* Import */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--vs-text-primary)] m-0 flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-500" /> Import products
              </h3>
              <p className="text-xs text-[var(--vs-text-secondary)] m-0">
                Use the template, fill one product per row, then check the file before importing. Max 5 MB, .xlsx only.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleTemplate}
              disabled={downloadingTemplate}
              startIcon={downloadingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            >
              Download template
            </Button>
          </div>

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
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-6 px-4 text-center cursor-pointer transition-colors ${dragActive
              ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20'
              : 'border-[var(--vs-border)] bg-[var(--vs-bg-secondary)] hover:border-indigo-500'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                pickFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <FileSpreadsheet className="w-8 h-8 text-indigo-500" />
            {file ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-[var(--vs-text-primary)] break-all">{file.name}</span>
                <span className="text-xs text-[var(--vs-text-secondary)]">({(file.size / 1024).toFixed(0)} KB)</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    pickFile(null);
                  }}
                  className="p-1 rounded text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <span className="text-sm text-[var(--vs-text-primary)]">
                Drag & drop your .xlsx file here or <span className="text-indigo-600 dark:text-indigo-400 font-semibold">browse</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <Label className="!mb-1 text-xs">What should the import do?</Label>
              <Select
                options={MODE_OPTIONS}
                value={mode}
                onChange={(v) => {
                  setMode(v || 'create');
                  resetImportState();
                }}
              />
            </div>
            <Checkbox
              id="import-create-missing"
              label="Create missing categories and brands"
              checked={createMissing}
              onChange={(v) => {
                setCreateMissing(v);
                resetImportState();
              }}
            />
          </div>

          {importError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400">
              {importError}
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => runImport(true)}
              disabled={!file || checking || importing}
              startIcon={checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchCheck className="w-4 h-4" />}
            >
              {checking ? 'Checking...' : 'Check file'}
            </Button>
            {check && !result && (
              <Button
                onClick={() => runImport(false)}
                disabled={!readyCount || importing || checking}
                startIcon={importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              >
                {importing ? 'Importing...' : `Import ${readyCount} product${readyCount === 1 ? '' : 's'}`}
              </Button>
            )}
          </div>
        </section>

        {/* Summary + rows */}
        {active && (
          <section className="flex flex-col gap-4">
            <div
              className={`flex items-start gap-2 p-3 rounded-xl border text-sm ${result
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-950/30 dark:text-indigo-300'}`}
            >
              {result ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <SearchCheck className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>
                {result
                  ? 'Import complete. Rows with errors were not imported. Fix them in the file and import again.'
                  : summary.errors
                    ? `File checked. ${summary.errors} row(s) have errors and will be skipped. Nothing has been saved yet.`
                    : 'File checked. No errors found. Nothing has been saved yet.'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryTile label="Rows in file" value={summary.totalRows} />
              {result ? (
                <>
                  <SummaryTile label="Added" value={summary.created} tone="green" />
                  <SummaryTile label="Updated" value={summary.updated} tone="blue" />
                </>
              ) : (
                <>
                  <SummaryTile label="Will be added" value={summary.toCreate} tone="green" />
                  <SummaryTile label="Will be updated" value={summary.toUpdate} tone="blue" />
                </>
              )}
              <SummaryTile label="Errors" value={summary.errors} tone={summary.errors ? 'red' : 'default'} />
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-[var(--vs-text-secondary)]">{rows.length} row(s) shown</span>
              <Checkbox id="import-errors-only" label="Show rows with errors only" checked={errorsOnly} onChange={setErrorsOnly} />
            </div>

            <div className="overflow-auto max-h-[480px] border border-[var(--vs-border)] rounded-xl">
              <table className="w-full text-left border-collapse text-xs min-w-[640px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[var(--vs-bg-secondary)] border-b border-[var(--vs-border)] text-[var(--vs-text-secondary)] font-bold">
                    <th className="py-2.5 px-3 w-16">Row</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3 w-24">Action</th>
                    <th className="py-2.5 px-3">Problems</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--vs-border)]">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[var(--vs-text-secondary)]">
                        No rows to show.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => (
                      <tr key={`${r.row}-${idx}`} className="text-[var(--vs-text-primary)]">
                        <td className="py-2 px-3 font-mono">{r.row}</td>
                        <td className="py-2 px-3 font-medium">{r.name || '—'}</td>
                        <td className="py-2 px-3 font-mono">{r.sku || '—'}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${ACTION_STYLES[r.action] || ACTION_STYLES.skip}`}>
                            {ACTION_LABELS[r.action] || r.action}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {r.errors?.length ? (
                            <ul className="m-0 pl-0 list-none flex flex-col gap-0.5 text-rose-600 dark:text-rose-400">
                              {r.errors.map((e, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                  <span className="whitespace-normal">{e}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-[var(--vs-text-secondary)]">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {result && (
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => pickFile(null)}>
                  Import another file
                </Button>
                <Button onClick={() => navigate('/products')}>Go to Products</Button>
              </div>
            )}
          </section>
        )}
      </Card>

      <ToastStack toasts={toasts} />
    </div>
  );
}
