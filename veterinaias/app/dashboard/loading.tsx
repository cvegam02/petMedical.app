export default function DashboardLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-48 rounded-lg bg-muted" />
      <div className="h-4 w-80 rounded-lg bg-muted" />
      <div className="mt-8 space-y-3">
        <div className="h-4 rounded-lg bg-muted" />
        <div className="h-4 w-5/6 rounded-lg bg-muted" />
        <div className="h-4 w-4/6 rounded-lg bg-muted" />
      </div>
    </div>
  )
}
