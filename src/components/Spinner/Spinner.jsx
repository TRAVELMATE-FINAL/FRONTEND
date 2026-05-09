import "./Spinner.css";

/**
 * Reusable professional loader. Two variants:
 *
 *   <Spinner label="Loading rides..." />          // ring + caption
 *   <Spinner size="sm" inline />                  // tiny inline spinner
 *
 * Props:
 *   size:      "sm" | "md" | "lg"  (default "md")
 *   label:     optional caption rendered under the ring
 *   sublabel:  optional second line in muted text
 *   inline:    boolean — flow inline instead of block (no surrounding padding)
 *   color:     ring colour (default purple #7c3aed)
 *   fullScreen: boolean — center the spinner in the entire viewport
 */
export default function Spinner({
  size = "md",
  label,
  sublabel,
  inline = false,
  color = "#7c3aed",
  fullScreen = false,
}) {
  const dim = size === "sm" ? 20 : size === "lg" ? 64 : 40;
  const border = size === "sm" ? 2 : size === "lg" ? 5 : 3.5;

  const ring = (
    <div
      className="tm-spinner__ring"
      style={{
        width: dim,
        height: dim,
        borderWidth: border,
        borderTopColor: color,
      }}
    />
  );

  if (inline) return ring;

  const wrapStyle = fullScreen
    ? { minHeight: "60vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12, padding: 20 }
    : { display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 10, padding: "26px 16px" };

  return (
    <div className="tm-spinner" style={wrapStyle}>
      {ring}
      {label && (
        <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>
          {label}
        </div>
      )}
      {sublabel && (
        <div style={{ fontSize: 12, color: "#6b7280" }}>{sublabel}</div>
      )}
    </div>
  );
}
