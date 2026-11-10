import { Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="container-rr grid grid-cols-1 gap-8 py-8 lg:grid-cols-[1fr_380px]" role="status" aria-busy="true">
      <div className="space-y-4">
        <div className="flex gap-5"><Skeleton className="h-28 w-28 !rounded-full" /><div className="flex-1 space-y-3 pt-2"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-5 w-1/2" /></div></div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <Skeleton className="h-96 w-full !rounded-3xl" />
    </div>
  );
}
