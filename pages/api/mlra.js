export default async function handler(req, res) {
  const q = (req.query.q || "").toString().trim();
  if (!q) return res.status(400).json({ error: "Missing q" });

  // USDA NRCS MLRA 2022 FeatureServer (public)
  const base = "https://services2.arcgis.com/YqPSsZvq2dd1wPP5/ArcGIS/rest/services/MLRA_Geographic_Database_2022/FeatureServer/0/query";

  // Search by MLRA symbol OR name (case-insensitive)
  // Field names commonly include: MLRA_SYMBOL, MLRA_NAME (may vary slightly). We'll try both.
  const where = encodeURIComponent(
    `UPPER(MLRA_SYMBOL) LIKE '%${q.toUpperCase().replace(/'/g,"''")}%' OR UPPER(MLRA_NAME) LIKE '%${q.toUpperCase().replace(/'/g,"''")}%'`
  );

  const url = `${base}?where=${where}&outFields=MLRA_SYMBOL,MLRA_NAME&returnGeometry=false&f=json`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    const feats = (data.features || []).slice(0, 10).map(f => ({
      mlra_symbol: f.attributes?.MLRA_SYMBOL ?? f.attributes?.mlra_symbol ?? null,
      mlra_name: f.attributes?.MLRA_NAME ?? f.attributes?.mlra_name ?? null,
    })).filter(x => x.mlra_symbol || x.mlra_name);

    return res.status(200).json({ results: feats });
  } catch (e) {
    return res.status(502).json({ error: "Failed to query MLRA service" });
  }
}
