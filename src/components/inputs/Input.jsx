import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(
  ({ className, type, startIcon, endIcon, error, ...props }, ref) => {
    return (
      <div className="relative w-full flex items-center text-gray-900 dark:text-white">
        {startIcon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30 pointer-events-none flex items-center justify-center">
            {startIcon}
          </span>
        )}
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 pr-3 pl-3 py-2 text-sm text-gray-900 dark:!text-white placeholder:text-gray-400 dark:placeholder:text-white/25 transition-all duration-200 outline-none focus:border-indigo-500/60 focus:bg-indigo-500/[0.04] dark:focus:bg-indigo-500/[0.08] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 dark:border-red-500 focus:border-red-500 dark:focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)] dark:focus:shadow-[0_0_0_3px_rgba(239,68,68,0.25)]",
            startIcon && "pl-11",
            endIcon && "pr-10",
            className
          )}
          ref={ref}
          {...props}
        />
        {endIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
            {endIcon}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
