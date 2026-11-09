import { DatePicker as AntDatePicker } from 'antd';
import { cn } from '@/lib/utils';

const HEIGHTS = { sm: '!h-9', md: '!h-11', lg: '!h-12' };

/**
 * antd DatePicker in the Soft look (colours come from ThemeProvider).
 *   <DatePicker value={dayjs()} onChange={(d) => …} invalid size="sm|md|lg" />
 * Value and onChange use dayjs, as antd does.
 */
function DatePicker({ size = 'md', invalid, format = 'DD MMM YYYY', className, ...props }) {
  return (
    <AntDatePicker
      variant="filled"
      format={format}
      status={invalid ? 'error' : undefined}
      className={cn('w-full !rounded-control', HEIGHTS[size] ?? HEIGHTS.md, className)}
      {...props}
    />
  );
}

/** <DateRangePicker value={[from, to]} onChange={([from, to]) => …} /> */
function DateRangePicker({ size = 'md', invalid, format = 'DD MMM YYYY', className, ...props }) {
  return (
    <AntDatePicker.RangePicker
      variant="filled"
      format={format}
      status={invalid ? 'error' : undefined}
      className={cn('w-full !rounded-control', HEIGHTS[size] ?? HEIGHTS.md, className)}
      {...props}
    />
  );
}

export { DatePicker, DateRangePicker };
