import { ImageResponse } from "next/og";

export const alt = "Buddy Matcher — random groups for classes and teams";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#f1f8f3", padding: "58px 70px", fontFamily: "sans-serif", color: "#173c2a" }}>
      <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#198754" }}>Buddy Matcher</div>
      <div style={{ display: "flex", fontSize: 66, fontWeight: 700, letterSpacing: "-2px", lineHeight: 1.1, marginTop: 28, maxWidth: 930 }}>Random groups for classes and teams.</div>
      <div style={{ display: "flex", fontSize: 26, color: "#4b6054", marginTop: 22 }}>Free pairs &amp; trios. More control with Pro.</div>
      <div style={{ display: "flex", gap: 18, marginTop: 35 }}>
        {[{ group: "Group 1", names: "Alex  ·  Sam  ·  Jo" }, { group: "Group 2", names: "Ari  ·  Kim  ·  Lee" }, { group: "Group 3", names: "Kai  ·  Ash  ·  Robin" }].map((item) => (
          <div key={item.group} style={{ display: "flex", flexDirection: "column", background: "#fff", border: "1px solid #d2e3d7", borderRadius: 16, padding: "20px 24px", flex: 1 }}>
            <div style={{ display: "flex", fontSize: 20, fontWeight: 700 }}>{item.group}</div>
            <div style={{ display: "flex", fontSize: 22, marginTop: 9, color: "#456451" }}>{item.names}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", fontSize: 19, color: "#4b6054", marginTop: 25 }}>buddymatcher.co.uk</div>
    </div>,
    size,
  );
}
