const skeletonRows = Array.from({ length: 4 }, (_, index) => index);

function RecipientListSkeleton() {
  return (
    <div
      className="flex flex-col animate-pulse"
      aria-busy="true"
      aria-label="어르신 목록 불러오는 중"
    >
      <div className="mb-12 h-13 w-full sm:w-80 rounded-md bg-accent" />

      <div className="flex flex-col gap-6">
        {skeletonRows.map((row) => (
          <div
            key={row}
            className="flex flex-col gap-6 border-b border-border py-8 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-3">
              <div className="h-9 w-48 rounded bg-accent" />
              <div className="h-5 w-36 rounded bg-muted" />
            </div>
            <div className="flex gap-4">
              {Array.from({ length: 7 }, (_, day) => (
                <div key={day} className="flex flex-col items-center gap-2">
                  <div className="h-3 w-3 rounded bg-accent" />
                  <div className="h-2 w-2 rounded-full bg-accent" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="max-w-5xl w-full mx-auto px-6 sm:px-12 pt-32 pb-24 min-h-screen">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-primary pb-8 mb-12 gap-6">
        <div className="h-10 w-44 rounded bg-accent animate-pulse" />
        <div className="h-12 w-32 rounded bg-accent animate-pulse" />
      </header>
      <RecipientListSkeleton />
    </main>
  );
}
