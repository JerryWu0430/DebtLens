import { AnalysisSkeleton } from "@/components/analysis-skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <AnalysisSkeleton />
      </div>
    </div>
  );
}
