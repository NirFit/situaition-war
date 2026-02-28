export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`skeleton ${className}`} role="status" aria-label="טוען">
      <span className="visually-hidden">טוען...</span>
    </div>
  );
}

export function SkeletonCircle() {
  return (
    <div className="skeleton-circle">
      <Skeleton className="skeleton-title" />
      <Skeleton className="skeleton-bar" />
      <div className="skeleton-rows">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="skeleton-row" />
        ))}
      </div>
    </div>
  );
}
