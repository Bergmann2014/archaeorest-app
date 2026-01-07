import { useEffect, useMemo, useState } from "react";
import plants from "../data/plants.json";

/**
 * Download helper
 */
function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Very simple CSV parser (handles commas + quoted values)
 * Returns array of objects using header row.
 */
function parseCSV(text) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) return [];

  const parseLine = (line) => {
    const out = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"' && line[i + 1] === '"' && inQuotes) {
        // escaped quote ""
        cur += '"';
        i++;
        continue;
      }

      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
        continue;
      }

      cur += ch;
    }

    out.push(cur.trim());
    return out;
  };

  const header = parseLine(lines[0]).map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const obj = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = (cols[c] ?? "").trim();
    }
    rows.push(obj);
  }

  return rows;
}

/**
 * Build a lookup map from plants.json
 * Supports common field names; you can tweak these if your JSON differs.
 */
function buildPlantIndex(plantsArray) {
  const byPlantId = new Map();
  const byMlra = new Map();
  const byName = new Map();

  for (const p of plantsArray) {
    // try common keys
    const plantId =
      p.plant_id ?? p.plantId ?? p.PLANT_ID ?? p.id ?? p.ID ?? "";
    const mlra =
      p.mlra_symbol ?? p.mlra ?? p.MLRA ?? p.MLRA_SYMBOL ?? p.mlraSymbol ?? "";
    const name =
      p.name ?? p.common_name ?? p.scientific_name ?? p.title ?? "";

    if (plantId) byPlantId.set(String(plantId).toLowerCase(), p);
    if (mlra) byMlra.set(String(mlra).toLowerCase(), p);
    if (name) byName.set(String(name).toLowerCase(), p);
  }

  return { byPlantId, byMlra, byName };
}

/**
 * Convert array of objects to CSV
 */
function objectsToCSV(rows) {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);

  const esc = (v) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [];
  lines.push(headers.map(esc).join(","));
  for (const r of rows) {
    lines.push(headers.map((h) => esc(r[h])).join(","));
  }
  return lines.join("\n");
}

export default function Map() {
  const [csvName, setCsvName] = useState("");
  const [rawRows, setRawRows] = useState([]);
  const [error, setError] = useState("");

  // controls
  const [minConfidence, setMinConfidence] = useState("any"); // any/high/medium/low
  const [query, setQuery] = useState("");
  const [showOnlyMatched, setShowOnlyMatched] = useState(true);

  const plantIndex = useMemo(() => buildPlantIndex(plants || []), []);

  useEffect(() => {
    // sanity check: plants.json loaded
    if (!plants || !Array.isArray(plants)) {
      setError(
        "plants.json did not load as an array. Check data/plants.json format."
      );
    }
  }, []);

  const onFile = async (file) => {
    setError("");
    setCsvName(file?.name || "");
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        setRawRows([]);
        setError("CSV loaded, but it looks empty.");
        return;
      }

      setRawRows(rows);
    } catch (e) {
      setError("Could not read/parse CSV: " + (e?.message || String(e)));
    }
  };

  /**
   * Normalize and attempt to match CSV rows to plants.json
   * Looks for common CSV columns:
   * - plant_id
   * - mlra_symbol
   * - notes
   * - confidence
   */
  const processed = useMemo(() => {
    const norm = (s) => String(s ?? "").trim();
    const lower = (s) => norm(s).toLowerCase();

    const confRank = (c) => {
      const x = lower(c);
      if (x === "high") return 3;
      if (x === "medium") return 2;
      if (x === "low") return 1;
      return 0;
    };

    const minRank =
      minConfidence === "high"
        ? 3
        : minConfidence === "medium"
        ? 2
        : minConfidence === "low"
        ? 1
        : 0;

    const out = rawRows.map((r, idx) => {
      // try multiple header spellings
      const plantId =
        r["plant_id"] ??
        r["plantId"] ??
        r["PLANT_ID"] ??
        r["id"] ??
        r["ID"] ??
        "";

      const mlra =
        r["mlra_symbol"] ??
        r["mlra"] ??
        r["MLRA"] ??
        r["MLRA_SYMBOL"] ??
        r["mlraSymbol"] ??
        "";

      const confidence = r["confidence"] ?? r["Confidence"] ?? r["CONFIDENCE"] ?? "";
      const notes = r["notes"] ?? r["Notes"] ?? r["NOTES"] ?? "";

      let match = null;
      let matchHow = "";

      const pidKey = lower(plantId);
      const mlraKey = lower(mlra);

      if (pidKey && plantIndex.byPlantId.has(pidKey)) {
        match = plantIndex.byPlantId.get(pidKey);
        matchHow = "plant_id";
      } else if (mlraKey && plantIndex.byMlra.has(mlraKey)) {
        match = plantIndex.byMlra.get(mlraKey);
        matchHow = "mlra_symbol";
      }

      // extract display fields from match (tolerant to different json fields)
      const mPlantId =
        match?.plant_id ?? match?.plantId ?? match?.PLANT_ID ?? match?.id ?? "";
      const mMlra =
        match?.mlra_symbol ?? match?.mlra ?? match?.MLRA ?? match?.MLRA_SYMBOL ?? "";
      const mName =
        match?.name ??
        match?.common_name ??
        match?.scientific_name ??
        match?.title ??
        "";

      const row = {
        row_index: idx + 1,
        plant_id: norm(plantId),
        mlra_symbol: norm(mlra),
        confidence: norm(confidence) || "Low",
        notes: norm(notes),
        matched: match ? "YES" : "NO",
        match_how: matchHow || "",
        match_name: mName ? String(mName) : "",
        match_plant_id: mPlantId ? String(mPlantId) : "",
        match_mlra_symbol: mMlra ? String(mMlra) : "",
      };

      return row;
    });

    // filters
    let filtered = out;

    // confidence filter
    if (minRank > 0) {
      filtered = filtered.filter((r) => confRank(r.confidence) >= minRank);
    }

    // query filter
    const q = lower(query);
    if (q) {
      filtered = filtered.filter((r) => {
        return (
          lower(r.plant_id).includes(q) ||
          lower(r.mlra_symbol).includes(q) ||
          lower(r.notes).includes(q) ||
          lower(r.match_name).includes(q) ||
          lower(r.match_plant_id).includes(q) ||
          lower(r.match_mlra_symbol).includes(q)
        );
      });
    }

    // matched-only toggle
    if (showOnlyMatched) {
      filtered = filtered.filter((r) => r.matched === "YES");
    }

    return { all: out, filtered };
  }, [rawRows, plantIndex, minConfidence, query, showOnlyMatched]);

  const stats = useMemo(() => {
    const total = processed.all.length;
    const matched = processed.all.filter((r) => r.matched === "YES").length;
    const shown = processed.filtered.length;
    return { total, matched, shown };
  }, [processed]);

  const downloadFiltered = () => {
    const csv = objectsToCSV(processed.filtered);
    if (!csv) {
      setError("Nothing to download yet.");
      return;
    }
    const nameBase = csvName ? csvName.replace(/\.csv$/i, "") : "results";
    downloadText(`${nameBase}-matched.csv`, csv);
  };

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ marginTop: 0 }}>ArchaeoRest</h1>

      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 8 }}>
          <strong>Upload CSV:</strong>{" "}
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <label>
            <span style={{ display: "inline-block", width: 120 }}>
              Min confidence:
            </span>
            <select
              value={minConfidence}
              onChange={(e) => setMinConfidence(e.target.value)}
            >
              <option value="any">Any</option>
              <option value="high">High</option>
              <option value="medium">Medium+</option>
              <option value="low">Low+</option>
            </select>
          </label>

          <label>
            <span style={{ display: "inline-block", width: 120 }}>Search:</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="plant_id, mlra, notes, name..."
              style={{ width: 260 }}
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={showOnlyMatched}
              onChange={(e) => setShowOnlyMatched(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Show only matched
          </label>

          <button onClick={downloadFiltered} style={{ padding: "6px 10px" }}>
            Download shown as CSV
          </button>
        </div>

        <div style={{ marginTop: 10, color: "#555" }}>
          <div>
            <strong>Total rows:</strong> {stats.total}{" "}
            <span style={{ marginLeft: 10 }}>
              <strong>Matched:</strong> {stats.matched}
            </span>{" "}
            <span style={{ marginLeft: 10 }}>
              <strong>Shown:</strong> {stats.shown}
            </span>
          </div>
          <div style={{ marginTop: 6 }}>
            <small>
              Matching tries <code>plant_id</code> first, then{" "}
              <code>mlra_symbol</code>.
            </small>
          </div>
        </div>

        {error ? (
          <div style={{ marginTop: 10, color: "crimson" }}>
            <strong>Error:</strong> {error}
          </div>
        ) : null}
      </div>

      <hr />

      {processed.filtered.length === 0 ? (
        <p style={{ color: "#666" }}>
          No results yet. Upload a CSV (or change filters).
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              minWidth: 900,
              width: "100%",
            }}
          >
            <thead>
              <tr>
                {Object.keys(processed.filtered[0]).map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                      padding: "8px 6px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processed.filtered.map((r, i) => (
                <tr key={i}>
                  {Object.keys(r).map((h) => (
                    <td
                      key={h}
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: "8px 6px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {String(r[h] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 18, color: "#666" }}>
        <small>
          Tip: If your CSV headers are different (ex: “Plant ID” instead of
          “plant_id”), tell me the exact headers and I’ll adjust the mapper.
        </small>
      </div>
    </div>
  );
}