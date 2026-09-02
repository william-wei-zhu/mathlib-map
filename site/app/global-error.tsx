"use client";

// Catches errors thrown from the root layout itself (e.g. the map index fetch), which app/error.tsx
// cannot reach. It replaces the whole document, so it carries its own <html>/<body> and inline styles.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#fbfaf7",
          color: "#121110",
          fontFamily: "ui-serif, Georgia, 'Times New Roman', serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "32rem", textAlign: "center" }}>
          <p
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              fontSize: "0.76rem",
              color: "#b3441c",
              margin: 0,
            }}
          >
            Something went wrong
          </p>
          <h1 style={{ fontSize: "2rem", lineHeight: 1.15, margin: "1rem 0 0" }}>
            The map could not load.
          </h1>
          <p style={{ margin: "1rem 0 0", fontSize: "1rem" }}>
            This is usually a brief hiccup reaching the data store. Trying again normally fixes it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              height: "2.75rem",
              padding: "0 1.25rem",
              borderRadius: "9999px",
              border: "1px solid #121110",
              background: "transparent",
              color: "#121110",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
