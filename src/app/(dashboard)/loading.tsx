export default function DashboardLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="dashboard-loading-icon">
          <svg
            viewBox="0 0 500 500"
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16"
          >
            <rect width="500" height="500" fill="#0D7BEA" rx="80" />
            <text
              x="70"
              y="285"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="88"
              fontWeight="700"
              fill="#FFFFFF"
            >
              Codix
            </text>
            <text
              x="340"
              y="285"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="88"
              fontWeight="700"
              fill="#E11B22"
            >
              IA
            </text>
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
