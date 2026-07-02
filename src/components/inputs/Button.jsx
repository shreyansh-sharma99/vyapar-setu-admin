import * as React from "react";

const Button = React.forwardRef(
  (
    {
      children,
      size = "md",
      variant = "primary",
      startIcon,
      endIcon,
      className = "",
      type = "button",
      ...props
    },
    ref
  ) => {
    // Size Classes
    const sizeClasses = {
      xs: "px-2.5 py-1 text-xs",
      sm: "px-3.5 py-1.5 text-sm",
      md: "px-4.5 py-2 text-sm",
    };

    // Variant Classes
    const variantClasses = {
      primary:
        "bg-primary text-primary-foreground shadow-theme-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:bg-primary/30",
      outline:
        "bg-transparent text-gray-700 border border-gray-300 hover:bg-gray-50 active:scale-[0.98] dark:text-gray-200 dark:border-border dark:hover:bg-white/[0.05] transition-all",
      danger:
        "bg-red-600 text-white shadow-theme-sm hover:bg-red-700 active:scale-[0.98] transition-all disabled:bg-red-300",
      login:
        "w-full h-12 !rounded-xl text-white text-[0.9375rem] font-bold tracking-wide border border-indigo-300/25 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 shadow-[0_4px_24px_rgba(99,102,241,0.45)] hover:shadow-[0_6px_32px_rgba(99,102,241,0.65)] hover:-translate-y-px active:scale-[0.98] transition-all duration-200 disabled:bg-indigo-500/40 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed",
    };

    return (
      <button
        ref={ref}
        type={type}
        className={`inline-flex items-center justify-center gap-2 transition ${variantClasses[variant]} ${
          variant !== "login" ? `${sizeClasses[size]} !rounded-xl` : ""
        } ${className}`}
        {...props}
      >
        {startIcon && <span className="flex items-center">{startIcon}</span>}
        {children}
        {endIcon && <span className="flex items-center">{endIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
