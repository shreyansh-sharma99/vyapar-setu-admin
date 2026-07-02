import { useState } from "react";

const TagInput = ({ value, onChange, placeholder }) => {
    const [inputValue, setInputValue] = useState("");

    // Handle initial state if value is array or comma-separated string
    let tags = [];
    if (Array.isArray(value)) {
        tags = value;
    } else if (typeof value === "string") {
        tags = value.split(",").map(t => t.trim()).filter(Boolean);
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const tagValue = inputValue.trim();

            if (tagValue && !tags.includes(tagValue)) {
                onChange([...tags, tagValue]);
            }

            setInputValue("");
        }
    };

    const removeTag = (tag) => {
        onChange(tags.filter((t) => t !== tag));
    };

    const handleBlur = () => {
        const tagValue = inputValue.trim();
        if (tagValue && !tags.includes(tagValue)) {
            onChange([...tags, tagValue]);
        }
        setInputValue("");
    };

    return (
        <div
            className="w-full min-h-[42px] border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2 flex flex-wrap items-center gap-2 focus-within:ring-2 focus-within:ring-indigo-500 bg-gray-50 dark:bg-white/5 focus-within:border-indigo-500/60 transition-all duration-200"
        >
            {tags.map((tag) => (
                <span
                    key={tag}
                    className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full flex items-center gap-2 text-sm font-medium"
                >
                    {tag}
                    <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-red-600 dark:text-red-400 font-bold leading-none hover:text-red-800 dark:hover:text-red-300 text-base"
                    >
                        ×
                    </button>
                </span>
            ))}

            {/* Visible typing input */}
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                placeholder={tags.length === 0 ? placeholder : ""}
                className="flex-grow min-w-[120px] outline-none border-none focus:ring-0 p-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25"
            />
        </div>
    );
};

export default TagInput;

