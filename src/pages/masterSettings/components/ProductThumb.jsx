import { useState } from 'react';
import { Package } from 'lucide-react';
import { productImageUrl } from './gstUtils';

const SIZES = {
  xs: 'w-5 h-5 rounded',
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-10 h-10 rounded-lg',
};

/** Small product image with a fallback icon (also used when the image fails to load). */
export default function ProductThumb({ product, size = 'sm' }) {
  const url = productImageUrl(product);
  const [failedUrl, setFailedUrl] = useState('');
  const showImage = url && failedUrl !== url;
  const box = SIZES[size] || SIZES.sm;

  return (
    <span
      className={`${box} shrink-0 overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400`}
    >
      {showImage ? (
        <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" onError={() => setFailedUrl(url)} />
      ) : (
        <Package className={size === 'xs' ? 'w-3 h-3' : 'w-4 h-4'} />
      )}
    </span>
  );
}
