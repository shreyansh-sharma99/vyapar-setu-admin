import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import Button from '@/components/inputs/Button';

export default function Breadcrumbs({
  title,
  h1,
  description,
  paragraph,
  backText,
  buttonName,
  backTo,
  navigation,
}) {
  const navigate = useNavigate();

  const displayTitle = title || h1;
  const displayDescription = description || paragraph;

  // It is a Primary Action button if buttonName exists and does NOT contain "back" (case-insensitive).
  // Otherwise, it is a Back navigation button.
  const isAction = buttonName && !buttonName.toLowerCase().includes('back');
  const isBack = !isAction;

  const displayBackText = backText || (isBack ? buttonName : 'Back');
  const displayBackTo = backTo || navigation || -1;

  const handleBack = () => {
    if (typeof displayBackTo === 'function') {
      displayBackTo();
    } else {
      navigate(displayBackTo);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
      <div className="flex items-center gap-3.5">
        {/* Back button — rendered on the left if it's a back navigation and back props are provided */}
        {isBack && (buttonName || backText || backTo || navigation) && (
          <button
            onClick={handleBack}
            className="p-1.5 rounded-lg border transition-colors
              bg-[var(--vs-bg-primary)]
              border-[var(--vs-border)] 
              text-[var(--vs-header-icon)]
              hover:text-[var(--vs-active-text)]
              hover:bg-[var(--vs-btn-hover)] cursor-pointer"
            title={displayBackText}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        <div>
          {/* Heading: !text-sm and !text-[var(--vs-active-text)] ensure overriding of CoreUI styles */}
          <h1 className="!text-xl font-bold !text-[var(--vs-active-text)] dark:!text-white">
            {displayTitle}
          </h1>
          {displayDescription && (
            <p className="text-xs mt-0.5 text-[var(--vs-text-secondary)]">
              {displayDescription}
            </p>
          )}
        </div>
      </div>

      {/* Action button — rendered on the right if it's a forward action button (like "Add New Category") */}
      {isAction && (
        <Button
          variant="primary"
          startIcon={<Plus className="w-4 h-4" />}
          onClick={() => navigate(navigation)}
        >
          {buttonName}
        </Button>
      )}
    </div>
  );
}
