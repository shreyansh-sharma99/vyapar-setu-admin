import React from "react";

const Checkbox = ({
    label,
    checked,
    id,
    onChange,
    className = "",
    disabled = false,
}) => {
    // Generate a unique fallback ID if id is not supplied
    const checkboxId = id || `checkbox-${Math.random().toString(36).substring(2, 9)}`;

    return (
        <div className="flex !flex-row items-center gap-3 h-11 select-none flex-shrink-0">
            <input
                id={checkboxId}
                type="checkbox"
                checked={!!checked}
                onChange={(e) => {
                    if (!disabled) {
                        onChange(e.target.checked);
                    }
                }}
                disabled={disabled}
                className={`w-5 h-5 rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-60 transition-all ${className}`}
            />
            {label && (
                <label
                    htmlFor={checkboxId}
                    className={`text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer disabled:opacity-60 whitespace-nowrap`}
                >
                    {label}
                </label>
            )}
        </div>
    );
};

export default Checkbox;

