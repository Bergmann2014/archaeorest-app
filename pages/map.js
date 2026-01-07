import { useEffect, useMemo, useState } from "react";
import plants from "../data/plants.json";

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseCSV(txt) {
  const lines = txt.split(/\r?\n/).filter(Boolean);
  const header = (lines.shift() || "").split(",").map(h => h.trim());
  const idx = Object.fromEntries(header.map((h,i)=>[h,i]));
  const rows = lines.map(l => l.split(",").map(x=>x.trim()));
  const out = [];
  for (const r of rows) {
    out.push({
      plant_id: r[idx["plant_id"]] || "",
      mlra_symbol: r[idx["mlra_symbol"]] || "",
      confidence: r[idx["confidence"]] || "Low",
      notes: r[idx["notes"]] || ""
    });
  }
  return out.filter(x => x.plant_id && x.mlra_symbol);
}

export default function MappingEditor() {
  const [q, setQ] = useState("");
  const [mlra, setMlra] = useState("");
  const [confidence, setConfidence] = useState("Low");
  const [notes, setNotes] = useState("");
  const [selectedPlantId, setSelectedPlantId] = useState("");
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("plant_mlra_rows");
      if (raw) setRows(JSON.parse(raw));
    } catch {}
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem("plant_mlra_rows", JSON.stringify(rows));
    } catch {}
  }, [rows]);

  const filteredPlants = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return plants.slice(0, 50);
    return plants.filter(p =>
      (p.common_name || "").toLowerCase().includes(t) ||
      (p.scientific_name || "").toLowerCase().includes(t) ||
      String(p.id).includes(t)
    ).slice(0, 50);
  }, [q]);

  function addRow() {
    if (!selectedPlantId || !mlra.trim()) {
      setMsg("Select a plant and enter an MLRA symbol (e.g., 80A).");
      return;
    }
    const newRow = {
      plant_id: String(selectedPlantId),
      mlra_symbol: mlra.trim().toUpperCase(),
      confidence,
      notes: notes.trim()
    };
    // de-dup exact pair
    const exists = rows.some(r => r.plant_id === newRow.plant_id && r.mlra_symbol === newRow.mlra_symbol);
    if (exists) {
      setMsg("That plant is already mapped to that MLRA.");
      return;
    }
    setRows([newRow, ...rows]);
    setMsg("Added.");
  }

  function removeRow(i) {
    setRows(rows.filter((_, idx) => idx !== i));
  }

  function exportCSV() {
    const header = "plant_id,mlra_symbol,confidence,notes\n";
    const body = rows.map(r => {
      const safeNotes = (r.notes || "").replaceAll('"','""');
      return `${r.plant_id},${r.mlra_symbol},${r.confidence},"${safeNotes}"`;
    }).join("\n");
    downloadText("plant_mlra.csv", header + body + "\n");
  }

  function importCSV(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseCSV(String(reader.result || ""));
        setRows(imported.concat(rows));
        setMsg(`Imported ${imported.length} rows.`);
      } catch {
        setMsg("Could not import CSV (check headers: plant_id,mlra_symbol,confidence,notes).");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: "8px 0 4px" }}>Plant ↔ MLRA Mapping Editor</h1>
      <p style={{ marginTop: 0, color: "#444" }}>
        This creates the “starter mapping” that makes MLRA (ecoregion-like) filtering accurate.
        Mappings are saved in your browser (local) and can be exported as <code>plant_mlra.csv</code>.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ display: "block", fontWeight: 600 }}>Find a plant</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type common/scientific name or index #..."
            style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
          <div style={{ marginTop: 8, border: "1px solid #eee", borderRadius: 10, padding: 8, maxHeight: 260, overflow: "auto" }}>
            {filteredPlants.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPlantId(String(p.id))}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #eee",
                  background: selectedPlantId === String(p.id) ? "#111" : "#fff",
                  color: selectedPlantId === String(p.id) ? "#fff" : "#111",
                  marginBottom: 6
                }}
              >
                <b>#{p.id}</b> — {p.common_name || p.scientific_name}<br />
                <span style={{ opacity: 0.85 }}><i>{p.scientific_name}</i></span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600 }}>Assign MLRA</label>
          <input
            value={mlra}
            onChange={(e) => setMlra(e.target.value)}
            placeholder="MLRA symbol (e.g., 80A)"
            style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8, marginBottom: 8 }}
          />

          <label style={{ display: "block", fontWeight: 600 }}>Confidence</label>
          <select value={confidence} onChange={(e)=>setConfidence(e.target.value)} style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8, marginBottom: 8 }}>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>

          <label style={{ display: "block", fontWeight: 600 }}>Notes</label>
          <textarea
            value={notes}
            onChange={(e)=>setNotes(e.target.value)}
            placeholder="Evidence/source notes (optional)"
            rows={4}
            style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button onClick={addRow} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #222", background: "#222", color: "#fff" }}>
              Add mapping
            </button>
            <button onClick={exportCSV} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", background: "#fff" }}>
              Export CSV
            </button>
            <label style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}>
              Import CSV
              <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e)=>{ if (e.target.files?.[0]) importCSV(e.target.files[0]); }} />
            </label>
          </div>

          {msg ? <div style={{ marginTop: 8, color: "#444" }}>{msg}</div> : null}
        </div>
      </div>

      <h2 style={{ marginTop: 12 }}>Current mappings ({rows.length})</h2>
      <div style={{ border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "110px 110px 110px 1fr 80px", gap: 0, padding: 10, background: "#fafafa", fontWeight: 700 }}>
          <div>Plant ID</div><div>MLRA</div><div>Confidence</div><div>Notes</div><div></div>
        </div>
        {rows.slice(0, 500).map((r, i) => (
          <div key={`${r.plant_id}-${r.mlra_symbol}-${i}`} style={{ display: "grid", gridTemplateColumns: "110px 110px 110px 1fr 80px", padding: 10, borderTop: "1px solid #eee", alignItems: "center" }}>
            <div>#{r.plant_id}</div>
            <div>{r.mlra_symbol}</div>
            <div>{r.confidence}</div>
            <div style={{ color: "#444" }}>{r.notes}</div>
            <button onClick={()=>removeRow(i)} style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #ccc", background: "#fff" }}>Remove</button>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
        Tip: after exporting, replace <code>data/plant_mlra.csv</code> in the project with your exported file so the MLRA filter works for everyone.
      </p>
    </div>
  );
}
