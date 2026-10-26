import { Skeleton } from "../../../components/ui";

export function DashboardChartSkeleton() {
  return (
    <div className="distribution-skeleton">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index}>
          <Skeleton />
          <Skeleton />
        </div>
      ))}
    </div>
  );
}

export function AttentionSkeleton() {
  return (
    <div className="attention-skeleton">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index}>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ))}
    </div>
  );
}
