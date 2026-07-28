export default function CatalogLoading() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] products-page">
      <div className="products-layout-container">
        <div className="mb-6 space-y-2">
          <div className="h-9 w-48 bg-black/[0.06] rounded-lg animate-pulse" />
          <div className="h-4 w-32 bg-black/[0.04] rounded animate-pulse" />
        </div>
        <div className="h-16 bg-white rounded-2xl border border-black/[0.06] mb-6 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
              <div className="aspect-square bg-black/[0.04] animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-20 bg-black/[0.04] rounded animate-pulse" />
                <div className="h-4 w-full bg-black/[0.06] rounded animate-pulse" />
                <div className="h-5 w-16 bg-black/[0.06] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
