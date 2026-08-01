import { useEffect, useState } from "react";

const Switch = ({
    label,
    checked,
    defaultChecked = false,
    disabled = false,
    onChange,
    color = "blue",
    size = "md",
}) => {
    const [isChecked, setIsChecked] = useState(defaultChecked);

    // Keep in sync with controlled prop
    useEffect(() => {
        if (checked !== undefined) setIsChecked(checked);
    }, [checked]);

    const handleToggle = () => {
        if (disabled) return;
        const newCheckedState = !isChecked;
        if (checked === undefined) {
            // uncontrolled mode
            setIsChecked(newCheckedState);
        }
        onChange?.(newCheckedState);
    };

    const isSm = size === "sm";

    const switchColors =
        color === "blue"
            ? {
                background: isChecked
                    ? "bg-indigo-600"
                    : "bg-gray-200 dark:bg-white/10",
                knob: isChecked
                    ? (isSm ? "translate-x-4 bg-white" : "translate-x-5 bg-white")
                    : "translate-x-0 bg-white",
            }
            : {
                background: isChecked
                    ? "bg-gray-800 dark:bg-white/10"
                    : "bg-gray-200 dark:bg-white/10",
                knob: isChecked
                    ? (isSm ? "translate-x-4 bg-white" : "translate-x-5 bg-white")
                    : "translate-x-0 bg-white",
            };

    return (
        <label
            className={`flex cursor-pointer select-none items-center gap-2 text-sm font-medium ${disabled ? "text-gray-400" : "text-gray-700 dark:text-gray-400"
                }`}
            onClick={handleToggle}
        >
            <div className="relative shrink-0">
                <div
                    className={`block transition duration-150 ease-linear rounded-full ${
                        isSm ? "h-5 w-9" : "h-6 w-11"
                    } ${disabled
                            ? "bg-gray-100 pointer-events-none dark:bg-gray-800"
                            : switchColors.background
                        }`}
                ></div>
                <div
                    className={`absolute left-0.5 top-0.5 rounded-full shadow-theme-sm duration-150 ease-linear transform ${
                        isSm ? "h-4 w-4" : "h-5 w-5"
                    } ${switchColors.knob}`}
                ></div>
            </div>
            {label}
        </label>
    );
};

export default Switch;
