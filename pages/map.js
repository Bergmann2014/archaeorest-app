import { useState } from "react";

export default function Map() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return [];

    const headers = lines[0].split(",").map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });
      data.push(row);
    }

    return data;
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setError("Please upload a CSV file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const parsed = parseCSV(evt.target.result);
        setRows(parsed);
        setError("");
      } catch {
        setError("Failed to parse CSV.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>ArchaeoRest – Map Data</h1>

      <p>Upload a CSV file to view archaeological records.</p>

      <input type="file" accept=".csv" onChange={handleFile} />

      {error && (
        <p style={{ color: "red", marginTop: 12 }}>
          {error}
        </p>
      )}

      {rows.length > 0 && (
        <table
          border="1"
          cellPadding="6"
          style={{ marginTop: 20, borderCollapse: "collapse" }}
        >
          <thead>
            <tr>
              {Object.keys(rows[0]).map(key => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {Object.values(row).map((val, j) => (
                  <td key={j}>{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}