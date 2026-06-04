export default function BlockedPage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "sans-serif",
        textAlign: "center",
        padding: "2rem",
        background: "#f9f9f9",
        color: "#333",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
        🌍 Region Restricted
      </h1>
      <p style={{ fontSize: "1.125rem", maxWidth: "480px", color: "#555" }}>
        Sorry, this service is not available in your region. If you believe
        this is a mistake, please contact support.
      </p>
    </main>
  );
}
