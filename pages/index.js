import { useEffect, useMemo, useState } from "react";
import plants from "../data/plants.json";

function includesCI(hay, needle) {
  return (hay || "").toString().toLowerCase().includes((needle || "").toString().toLowerCase());
}

export default function Home() {
  const [q, setQ] = useState("");
  const [mlra, setMlra] = useState(""); // MLRA symbol like "80A"
  const [mlraName, setMlraName] = useState("");
  const [mlraLoading, setMlraLoading] = useState(false);
  const [mlraErr, setMlraErr] = useState("");

  // Load mapping CSV (optional). If empty, MLRA filter won't remove plants.
  const [mapping, setMapping] = useState(null);

  useEffect(() => {
    fetch("/api/mapping")
      .then(r => r.json())
      .then(setMapping)
      .catch(() => setMapping({ byPlantId: {}, byMlra: {} }));
  }, []);

  const filtered = useMemo(() => {
    const base = plants.filter(p => {
      if (!q) return true;
      return includesCI(p.common_name, q) || includesCI(p.scientific_name, q);
    });

    if (!mlra) return base;

    // If mapping not present, return base (no plant gets excluded)
    if (!mapping?.byMlra?.[mlra]) return base;

    const allowed = new Set(mapping.byMlra[mlra]);
    return base.filter(p => allowed.has(String(p.id)));
  }, [q, mlra, mapping]);

  async function lookupMlraByName() {
    setMlraLoading(true); setMlraErr("");
    try {
      const res = await fetch(`/api/mlra?q=${encodeURIComponent(mlraName)}`);
      if (!res.ok) throw new Error("MLRA lookup failed");
      const data = await res.json();
      if (!data?.results?.length) {
        setMlraErr("No MLRA found for that search.");
        setMlra("");
      } else {
        // pick first match
        setMlra(data.results[0].mlra_symbol);
      }
    } catch (e) {
      setMlraErr("Could not reach USDA MLRA service right now.");
    } finally {
      setMlraLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: "8px 0 4px" }}>Archaeological Restoration Plant Reference</h1>
      <p style={{ marginTop: 0, color: "#444" }}>
        Search plants by name. Optionally filter by USDA NRCS MLRA (ecoregion-like units).
        
        <span style={{ display: "inline-block", marginLeft: 8 }}>
          <a href="/map">Open Mapping Editor</a>
        </span>
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ display: "block", fontWeight: 600 }}>Search plants</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type common or scientific name..."
            style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600 }}>Filter by MLRA (search by name/code)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={mlraName}
              onChange={(e) => setMlraName(e.target.value)}
              placeholder='e.g., "Central Rolling Red Prairies" or "80A"'
              style={{ flex: 1, padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
            />
            <button
              onClick={lookupMlraByName}
              disabled={mlraLoading || !mlraName.trim()}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #222", background: "#222", color: "#fff" }}
            >
              {mlraLoading ? "Searching..." : "Set"}
            </button>
            <button
              onClick={() => { setMlra(""); setMlraName(""); setMlraErr(""); }}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", background: "#fff" }}
            >
              Clear
            </button>
          </div>
          {mlra ? (
            <div style={{ marginTop: 6, color: "#1a1a1a" }}>
              Active MLRA filter: <b>{mlra}</b>
              {mapping?.byMlra?.[mlra] ? (
                <span style={{ color: "#444" }}> (mapped plants: {mapping.byMlra[mlra].length})</span>
              ) : (
                <span style={{ color: "#b45309" }}> (no mapping yet — showing all plants)</span>
              )}
            </div>
          ) : null}
          {mlraErr ? <div style={{ marginTop: 6, color: "#b91c1c" }}>{mlraErr}</div> : null}
        </div>
      </div>

      <div style={{ marginBottom: 10, color: "#444" }}>
        Results: <b>{filtered.length.toLocaleString()}</b>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 10 }}>
        {filtered.slice(0, 200).map((p) => (
          <div key={p.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 14, color: "#555" }}>#{p.id}</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{p.common_name || p.scientific_name}</div>
            <div style={{ color: "#444", marginBottom: 8 }}><i>{p.scientific_name}</i></div>

            <div style={{ fontSize: 13, color: "#333" }}>
              <div><b>Sun:</b> {p.SUN_EXPOSURE || "—"}</div>
              <div><b>Water:</b> {p.WATER_NEEDS || "—"}</div>
              <div><b>Planting:</b> {p.PLANTING_SEASON || "—"}</div>
              <div><b>Roots:</b> {p.ROOT_TYPE || "—"} | Avg {p.AVERAGE_ROOT_DEPTH || "—"}</div>
              <div><b>Invasive:</b> {p.INVASIVE || "—"}</div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {p.VENDOR_LINK_TO_ORDER ? (
                <a href={p.VENDOR_LINK_TO_ORDER} target="_blank" rel="noreferrer">Vendor</a>
              ) : null}
              {p.SOURCE_LINK_1 ? (
                <a href={p.SOURCE_LINK_1} target="_blank" rel="noreferrer">USDA</a>
              ) : null}
              {p.SOURCE_LINK_2 ? (
                <a href={p.SOURCE_LINK_2} target="_blank" rel="noreferrer">Wildflower</a>
              ) : null}
              {p.SOURCE_LINK_3 ? (
                <a href={p.SOURCE_LINK_3} target="_blank" rel="noreferrer">NatureServe</a>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, color: "#666", fontSize: 13 }}>
        Showing first 200 cards for performance. Search/refine to narrow results.
      </div>
    </div>
  );
}
export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/map",
      permanent: false,
    },
  };
}

