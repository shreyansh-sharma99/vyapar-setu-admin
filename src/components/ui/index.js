// Soft UI component library. Pages import from here only:
//   import { Button, Field, Input, Select, StatusBadge, toast } from '@/components/ui';
// Every component is shown in every variant on the dev page /ui-kit.
// See docs/plans/soft-ui-redesign-plan.md §3.

export { default as ThemeProvider } from './ThemeProvider';
export { STATUS_TONE, TONE_CLASSES, toneForStatus, labelForStatus } from './statusTones';

export { Button } from './Button';
export { Input, Textarea, MoneyInput, NumberInput } from './Input';
export { Label, Field, FormGrid, SettingRow } from './Field';
export { Checkbox, Switch, Segmented } from './Controls';
export { Select } from './Select';
export { DropdownMenu, Popover } from './Menu';
export { DatePicker, DateRangePicker } from './DatePicker';
export { Badge, StatusBadge } from './Badge';
export { Card, Section, PageHeader, StatCard, DetailList } from './Card';
export { Avatar, Kbd, Tooltip, EmptyState, Skeleton, SkeletonRows, Spinner, Alert } from './Display';
export { Modal, ConfirmDialog, Drawer } from './Overlay';
export { Toaster, ToastStack } from './Toaster';
export { toast } from './toastStore';
export {
  FormActions, DocumentLayout, TotalsPanel, TotalsRow, TotalsInput, TotalsToggle, PartyCard, LineItemsTable, LineRow, AddLineBar,
} from './Document';
export { PaymentPicker } from './PaymentPicker';
export { useShortcuts } from './useShortcuts';
export { LINE_TH, LINE_TD, LINE_TF, CELL_INPUT } from './styles';
export { DataTable } from './DataTable';
export { Pagination } from './Pagination';
export { MultiSelect, TagInput } from './MultiSelect';
