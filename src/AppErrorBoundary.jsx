import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Keep the error visible in devtools as well.
    // eslint-disable-next-line no-console
    console.error("Application render error", error, errorInfo);
  }

  render() {
    const { error, errorInfo } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div style={{
        minHeight: "100vh",
        padding: "32px",
        background: "#f4efe4",
        color: "#1d2430",
        fontFamily: 'Bahnschrift, "Segoe UI Variable Display", "Aptos", sans-serif'
      }}>
        <div style={{
          maxWidth: "960px",
          margin: "0 auto",
          background: "rgba(255, 251, 243, 0.94)",
          border: "1px solid rgba(102, 92, 68, 0.14)",
          borderRadius: "22px",
          padding: "24px",
          boxShadow: "0 16px 40px rgba(42, 36, 25, 0.14)"
        }}>
          <div style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: "0.72rem", color: "#5f6773" }}>
            Runtime Error
          </div>
          <h1 style={{ marginTop: "12px", marginBottom: "12px" }}>The app hit a render error</h1>
          <p style={{ marginTop: 0, lineHeight: 1.5 }}>
            The UI failed during rendering. The details below should make the failure visible instead of leaving a blank screen.
          </p>
          <pre style={{
            whiteSpace: "pre-wrap",
            overflowX: "auto",
            padding: "16px",
            borderRadius: "16px",
            background: "#1d2430",
            color: "#fffaf0",
            fontSize: "0.9rem"
          }}>
            {String(error && error.stack ? error.stack : error)}
          </pre>
          {errorInfo?.componentStack ? (
            <pre style={{
              whiteSpace: "pre-wrap",
              overflowX: "auto",
              padding: "16px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.75)",
              color: "#1d2430",
              fontSize: "0.85rem",
              marginTop: "12px"
            }}>
              {errorInfo.componentStack}
            </pre>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "16px",
              border: 0,
              borderRadius: "999px",
              padding: "12px 18px",
              background: "#0f766e",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700
            }}
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
}