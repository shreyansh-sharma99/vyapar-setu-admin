import * as React from "react";
import { cn } from "@/lib/utils";

const Label = React.forwardRef(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "block text-sm font-semibold text-slate-700 dark:text-white/80 mb-2 tracking-wide text-gray-500",
        className
      )}
      {...props}
    />
  )
);
Label.displayName = "Label";

export { Label };
