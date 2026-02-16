// app/loading.tsx
export default function RootLoading() {
  return (
    <div className="loading-shell">
      <div className="loading-card">
        <p className="loading-kicker">Loading RicoMatrix</p>
        <h1 className="loading-title">Read • Earn • Own</h1>
        <p className="loading-subtitle">
          Preparing your library, chapters, and on-chain data.
        </p>

        <div className="loading-bar">
          <div className="loading-bar-fill" />
        </div>

        <div className="loading-row">
          <span className="loading-orb" />
          <span className="loading-text">Syncing with BNB Smart Chain...</span>
        </div>
      </div>
    </div>
  );
}
