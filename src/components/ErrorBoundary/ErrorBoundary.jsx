// components/ErrorBoundary/ErrorBoundary.jsx
// App-wide safety net. Without a boundary, ANY uncaught render error
// (including ones thrown inside the map components) unmounts the whole
// React tree and the user sees a blank white screen. This catches the
// error, logs it, and shows a recoverable fallback instead.

import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Caught a render error:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            padding: 24,
            textAlign: "center",
            fontFamily: "Inter, system-ui, sans-serif",
            background: "#0f0f2e",
            color: "#fff",
          }}
        >
          <div style={{ fontSize: 40 }}>🧭</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ maxWidth: 420, color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.5 }}>
            The page hit an unexpected error and couldn't finish loading. You can
            reload to try again.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              background: "#f5c518",
              color: "#111",
              border: "none",
              borderRadius: 24,
              padding: "12px 26px",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
