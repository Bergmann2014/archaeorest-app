# Archaeological Restoration Plant Reference (Web App)

This is a lightweight web app for archaeologists to quickly search and filter the restoration plant database.

## What it does
- Search by **common name** or **scientific name**
- Filter by **MLRA (USDA NRCS Major Land Resource Areas)** using USDA online map services
- View plant details: sun/water, soils, root profile, invasive flags, vendor + source links

## USDA / NRCS MLRA sources used
- NRCS MLRA resource page (download + documentation): {"https://www.nrcs.usda.gov/resources/data-and-reports/major-land-resource-area-mlra"} citeturn0search1
- Public ArcGIS FeatureServer for MLRA 2022 (used by the app for search/lookup): {"https://services2.arcgis.com/YqPSsZvq2dd1wPP5/ArcGIS/rest/services/MLRA_Geographic_Database_2022/FeatureServer"} citeturn0search7

## Why a small mapping file is needed
Your plant spreadsheet does **not** contain plant-to-MLRA membership by default.
To filter “plants for this ecoregion/MLRA”, the app reads a simple mapping CSV:

`data/plant_mlra.csv`
- plant_id (from CHAT_GPT_INDEX_NUMBER)
- mlra_symbol (e.g., "80A")
- confidence (High/Med/Low)
- notes

You can start with a small curated list and expand over time.

## Run locally (recommended first)
1) Install Node.js (v18+)
2) In this folder:
```bash
npm install
npm run dev
```
3) Open http://localhost:3000

## Deploy online
- Vercel is easiest:
  - Import this project
  - Set build command: `npm run build`
  - Output: Next.js default

## Updating plant data
Replace `data/plants.json` with a refreshed export from your master spreadsheet.


## Mapping Editor
Open `/map` to create the starter plant↔MLRA mappings in your browser, then export `plant_mlra.csv`.
