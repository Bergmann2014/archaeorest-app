import fs from "fs";
import path from "path";

function parseCSV(txt) {
  const lines = txt.split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.split(",") || [];
  const idx = Object.fromEntries(header.map((h,i)=>[h.trim(), i]));
  const rows = lines.map(l => l.split(",").map(x=>x.trim()));
  const byMlra = {};
  const byPlantId = {};
  for (const r of rows) {
    const plantId = r[idx["plant_id"]] || "";
    const mlra = r[idx["mlra_symbol"]] || "";
    if (!plantId || !mlra) continue;
    if (!byMlra[mlra]) byMlra[mlra] = [];
    byMlra[mlra].push(plantId);
    if (!byPlantId[plantId]) byPlantId[plantId] = [];
    byPlantId[plantId].push(mlra);
  }
  return { byMlra, byPlantId };
}

export default function handler(req, res) {
  try {
    const p = path.join(process.cwd(), "data", "plant_mlra.csv");
    const txt = fs.readFileSync(p, "utf8");
    return res.status(200).json(parseCSV(txt));
  } catch (e) {
    return res.status(200).json({ byMlra: {}, byPlantId: {} });
  }
}
