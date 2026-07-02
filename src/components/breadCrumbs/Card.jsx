import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/inputs/Button';

export default function Card({
  title,
  h1,
  description,
  paragraph,
  buttonName,
  navigation,
  bodyClassName = 'p-6',
  buttonVariant = 'primary',
  buttonIcon,
  children,
}) {
  const navigate = useNavigate();

  const displayTitle = title || h1;
  const displayDescription = description || paragraph;

  const handleButtonClick = () => {
    if (navigation === -1 || navigation === '-1') {
      navigate(-1);
    } else if (navigation) {
      navigate(navigation);
    }
  };

  return (
    <div className="w-full rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] shadow-sm dark:shadow-none transition-colors duration-300">
      <div className="px-6 py-2 bg-[var(--vs-bg-secondary)] border-b border-[var(--vs-border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors duration-300 rounded-t-xl">
        <div className="flex items-center gap-3.5">
          <div>
            <h1 className="!text-xl font-bold !text-[var(--vs-active-text)] dark:!text-white tracking-tight leading-none">
              {displayTitle}
            </h1>
            {displayDescription && (
              <p className="text-[13px] mt-1.5 text-[var(--vs-text-secondary)] font-medium leading-relaxed">
                {displayDescription}
              </p>
            )}
          </div>
        </div>

        {/* Action Button — rendered on the right side using workspace <Button> component */}
        {buttonName && (
          <Button
            size="xs"
            variant={buttonVariant}
            startIcon={buttonIcon}
            onClick={handleButtonClick}
          >
            {buttonName}
          </Button>
        )}
      </div>

      {/* ── Card Body ── */}
      <div className={bodyClassName}>
        {children}
      </div>
    </div>
  );
}
