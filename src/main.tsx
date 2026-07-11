import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Last-resort catch: a render crash must land on a reload affordance, never
// a white screen. The night itself survives — settled sim state persists to
// localStorage — so reload genuinely resumes.
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main
        style={{
          minHeight: "100svh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#d4d4d4", fontSize: "15px", maxWidth: "28rem" }}>
          This screen crashed. Your night is saved — reload to pick it up
          where it stood.
        </p>
        <button
          onClick={() => location.reload()}
          style={{
            border: "1px solid #525252",
            borderRadius: "0.5rem",
            padding: "0.5rem 1rem",
            color: "#e5e5e5",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </main>
    );
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);
