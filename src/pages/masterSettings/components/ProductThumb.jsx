import { useState } from 'react';
import { Package } from 'lucide-react';
import { productImageUrl } from './gstUtils';

const SIZES = {
  xs: 'size-5 rounded-md',
  sm: 'size-8 rounded-lg',
  md: 'size-10 rounded-lg',
};

/** Small product image with a fallback icon (also used when the image fails to load). */
export default function ProductThumb({ product, size = 'sm' }) {
  const url = productImageUrl(product);
  const [failedUrl, setFailedUrl] = useState('');
  const showImage = url && failedUrl !== url;
  const box = SIZES[size] || SIZES.sm;

  return (
    <span className={`${box} flex shrink-0 items-center justify-center overflow-hidden bg-fill text-ink-subtle ring-1 ring-line`}>
      {showImage ? (
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setFailedUrl(url)} />
      ) : (
        <Package className={size === 'xs' ? 'size-3' : 'size-4'} />
      )}
    </span>
  );
}
