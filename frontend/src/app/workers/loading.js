import { ListSkeleton } from '@/components/Skeleton';
import { Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="container-rr py-8">
      <Skeleton className="mb-3 h-10 w-72" />
      <Skeleton className="mb-6 h-5 w-48" />
      <ListSkeleton count={5} />
    </div>
  );
}
