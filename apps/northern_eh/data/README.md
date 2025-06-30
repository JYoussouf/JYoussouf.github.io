# how_north_are_you

## Data Preparation Instructions

This section explains how to prepare the Canadian census subdivision data for the "How North Are You?" app.

### 1. Download the Datasets

- **Population by Census Subdivision (CSV):**
  - [Statistics Canada Table 17-10-0155-01](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710015501)
  - Download the latest CSV for all Canadian census subdivisions.

- **Census Subdivision Boundaries (GML):**
  - [StatCan Boundary Files (2024, GML)](https://www12.statcan.gc.ca/census-recensement/2011/geo/bound-limit/bound-limit-s-eng.cfm?year=24)
  - Download the GML file (e.g., `lcsd000a24g_e.gml`).

### 2. Place Files in Project

- Save the population CSV as `assets/data/2024_CA_census_subdivision.csv`.
- Save the GML file as `assets/data/lcsd000a24g_e.gml`.

### 3. Generate the Combined CSV

- Run the `lat_long_script` Python script in the project root.
- This will create `assets/data/2024_CA_census_subdivision_with_latlon.csv` with population, latitude, and longitude for each subdivision.

### 4. Troubleshooting

- If you see unmatched rows, check for province name mismatches or edge-case normalization issues in the script.
- The script is safe to re-run: it skips rows that already have lat/lon.

For more details, see the comments in `lat_long_script`.

> **Disclaimer:** This README section was generated with GitHub Copilot.