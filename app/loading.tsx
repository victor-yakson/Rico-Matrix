// app/loading.tsx
export default function RootLoading() {
  return (
    <div className="loading-shell">
      <div className="loading-card">
        <div className="loading-mark" aria-hidden="true">
          <span>RM</span>
        </div>
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

        <div className="loading-dots" aria-hidden="true">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
        </div>
      </div>
    </div>
  );
}
