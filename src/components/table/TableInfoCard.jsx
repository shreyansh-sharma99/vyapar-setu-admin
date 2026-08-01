const TableInfoCard = ({ stats = [], noBorder = false, className = '' }) => {
  return (
    <div
      className={`bg-[var(--vs-bg-primary)] px-3 py-2 flex flex-wrap items-center justify-start gap-6 transition-colors duration-200 ${noBorder ? '' : 'border border-[var(--vs-border)] rounded-xl shadow-xs dark:shadow-none'
        } ${className}`}
    >
      {stats?.map((stat, index) => (
        <div
          key={index}
          onClick={stat?.onClick}
          className={`flex items-center space-x-2.5 border-r border-[var(--vs-border)] pr-6 last:border-r-0 transition-all duration-150 ${stat?.onClick ? 'cursor-pointer hover:opacity-85' : ''
            } ${stat?.isActive
              ? 'px-2.5 py-1 rounded-lg bg-[var(--vs-active-bg)] ring-1 ring-indigo-500/30'
              : 'py-1'
            }`}
        >
          <div className="flex items-center text-sm font-medium text-[var(--vs-text-secondary)]">
            {stat?.icon && <span className="mr-2 text-base flex items-center justify-center">{stat.icon}</span>}
            <span className={stat?.isActive ? 'text-[var(--vs-active-text)] font-semibold' : 'text-[var(--vs-text-secondary)]'}>
              {stat?.label}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-lg font-bold ${stat?.colorClass || 'text-[var(--vs-text-primary)]'}`}>
              {stat?.value}
            </span>
            {(stat?.amount !== undefined || stat?.totalAmount !== undefined || stat?.subValue) && (
              <span className="text-xs font-medium text-[var(--vs-text-secondary)]">
                {stat?.subValue
                  ? stat.subValue
                  : `(₹${(stat?.amount ?? stat?.totalAmount ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })})`}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TableInfoCard;
