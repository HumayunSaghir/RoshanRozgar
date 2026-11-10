const cx = (...a) => a.filter(Boolean).join(' ');

// Shimmering placeholder block. Decorative, so hidden from assistive tech.
export function Skeleton({ className, ...rest }) {
  return <div aria-hidden className={cx('rr-skeleton rounded-xl', className)} {...rest} />;
}

export function WorkerCardSkeleton() {
  return (
    <div className="flex gap-4 rounded-3xl border border-neutral-200 bg-white p-5" aria-hidden>
      <Skeleton className="h-20 w-20 shrink-0 !rounded-full" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-24 !rounded-full" />
          <Skeleton className="h-7 w-20 !rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 4, Item = WorkerCardSkeleton }) {
  return (
    <div className="space-y-3" role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }, (_, i) => <Item key={i} />)}
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4" aria-hidden>
      <Skeleton className="h-14 w-14 shrink-0 !rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-6 w-16" />
    </div>
  );
}

export function PageSkeleton({ title = true, rows = 4 }) {
  return (
    <div className="container-rr py-8" role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>
      {title && <Skeleton className="mb-6 h-10 w-64" />}
      <div className="space-y-3">{Array.from({ length: rows }, (_, i) => <RowSkeleton key={i} />)}</div>
    </div>
  );
}
