import React from "react";

const Tabs = ({
  tabs,
  activeTab,
  onChange,
  rightSide,
}) => {
  return (
    <div
      className="
        w-full rounded-md border-b
        bg-gray-100 border-gray-300
        dark:bg-gray-900 dark:border-gray-700
        px-4 pt-2 mb-2
      "
    >
      <div className="flex items-end justify-between">
        {/* LEFT: Tabs */}
        <div className="flex items-end">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.value;

            return (
              <React.Fragment key={tab.value}>
                <button
                  type="button"
                  onClick={() => onChange(tab.value)}
                  className={`
                    px-5 py-2 text-sm font-medium rounded-t-md border
                    transition-all duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500

                    ${isActive
                      ? `
                          bg-blue-500 text-white border-blue-500
                          hover:bg-blue-600
                          shadow-theme-xs
                          dark:bg-blue-600 dark:border-blue-600
                          dark:hover:bg-blue-500
                        `
                      : `
                          bg-white text-gray-700 border-gray-300
                          hover:bg-gray-50
                          
                          dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700
                          dark:hover:bg-gray-700 dark:hover:text-white
                        `
                    }
                  `}
                >
                  {tab.label}
                </button>

                {index < tabs.length - 1 && <div className="w-2" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* RIGHT: Optional content */}
        {rightSide && (
          <div className="flex items-center gap-3 pb-1 text-gray-700 dark:text-gray-300">
            {rightSide}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tabs;
