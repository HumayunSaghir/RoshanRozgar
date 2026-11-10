'use client';

import { useEffect } from 'react';
import BrandPage from '@/components/BrandPage';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <BrandPage code="500" title="Something went wrong" text="We hit an unexpected problem. Please try again, and if it keeps happening come back in a few minutes." onRetry={reset} />;
}
