import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Alert, Button, Checkbox, EmptyState, Field, FormActions, Input, PageHeader, Section, Select } from '@/components/ui';
import { BILL_FIELD_TEMPLATES, newBillField } from './billFieldTemplates';
import { getBillFieldsApi, saveBillFieldsApi } from './services/billFieldService';

const TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
];
const MAX_FIELDS = 10;

export default function BillFields() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getBillFieldsApi()
      .then((rows) => { if (!cancelled) setFields(rows); })
      .catch(() => { if (!cancelled) setNotice({ tone: 'danger', text: 'Could not load the bill fields.' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const change = (index, patch) => setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  const remove = (index) => setFields((prev) => prev.filter((_, i) => i !== index));
  const move = (index, delta) => setFields((prev) => {
    const next = [...prev];
    const [row] = next.splice(index, 1);
    next.splice(index + delta, 0, row);
    return next;
  });
  const applyTemplate = (value) => {
    const template = BILL_FIELD_TEMPLATES.find((t) => t.value === value);
    if (template) setFields(template.fields.map((f) => ({ ...f })));
  };

  const save = async () => {
    setNotice(null);
    if (fields.some((f) => !String(f.label || '').trim())) {
      setNotice({ tone: 'danger', text: 'Every field needs a name.' });
      return;
    }
    setSaving(true);
    try {
      const saved = await saveBillFieldsApi(fields.map(({ key, label, type, options, required, printOnBill, isActive }) => ({
        key: key || '', label: label.trim(), type, options: type === 'dropdown' ? options : [], required: !!required, printOnBill: printOnBill !== false, isActive: isActive !== false,
      })));
      setFields(saved);
      setNotice({ tone: 'success', text: 'Bill fields saved.' });
    } catch (err) {
      setNotice({ tone: 'danger', text: err.response?.data?.message || 'Could not save the bill fields.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Bill Fields" description="Extra details to fill on each sales invoice, like vehicle number or patient age." />
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

      <Section title="Start from a template" description="This replaces the fields below. Nothing is saved until you press Save.">
        <div className="flex flex-wrap gap-2">
          {BILL_FIELD_TEMPLATES.map((t) => (
            <Button key={t.value} variant="secondary" size="sm" onClick={() => applyTemplate(t.value)}>{t.label}</Button>
          ))}
        </div>
      </Section>

      <Section title="Fields" description={`Up to ${MAX_FIELDS} fields. Old bills keep the names they were saved with.`}>
        <div className="flex flex-col gap-3">
          {!loading && fields.length === 0 && <EmptyState text="No bill fields yet." />}
          {fields.map((f, i) => (
            <div key={f.key || `new-${i}`} className="flex flex-col gap-3 rounded-control bg-fill p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Field name" required>
                  <Input value={f.label} maxLength={40} placeholder="e.g. Vehicle number" onChange={(e) => change(i, { label: e.target.value })} />
                </Field>
                <Field label="Type">
                  <Select options={TYPES} searchable={false} value={f.type} onChange={(type) => change(i, { type })} />
                </Field>
              </div>
              {f.type === 'dropdown' && (
                <Field label="Options" hint="Separate with commas">
                  <Input
                    value={(f.options || []).join(', ')}
                    placeholder="e.g. Male, Female, Other"
                    onChange={(e) => change(i, { options: e.target.value.split(',').map((o) => o.trimStart()) })}
                    onBlur={() => change(i, { options: (f.options || []).map((o) => o.trim()).filter(Boolean) })}
                  />
                </Field>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <Checkbox id={`req-${i}`} label="Required" checked={!!f.required} onChange={(v) => change(i, { required: v })} />
                  <Checkbox id={`print-${i}`} label="Print on bill" checked={f.printOnBill !== false} onChange={(v) => change(i, { printOnBill: v })} />
                  <Checkbox id={`active-${i}`} label="Show on invoice" checked={f.isActive !== false} onChange={(v) => change(i, { isActive: v })} />
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" title="Move up" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
                  <Button variant="ghost" size="icon-sm" title="Move down" aria-label="Move down" disabled={i === fields.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
                  <Button variant="danger-soft" size="icon-sm" title="Remove" aria-label="Remove" onClick={() => remove(i)}><Trash2 /></Button>
                </div>
              </div>
            </div>
          ))}
          <Button variant="secondary" size="sm" startIcon={<Plus />} disabled={fields.length >= MAX_FIELDS} onClick={() => setFields((prev) => [...prev, newBillField()])} className="self-start">
            Add field
          </Button>
        </div>
      </Section>

      <FormActions>
        <Button onClick={save} loading={saving} disabled={saving || loading}>Save</Button>
      </FormActions>
    </div>
  );
}
