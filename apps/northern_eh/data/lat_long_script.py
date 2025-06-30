import csv
import xml.etree.ElementTree as ET
import re
from rapidfuzz import process, fuzz
import unicodedata
from pyproj import Transformer
from tqdm import tqdm

# --- CONFIG ---
gml_path = 'assets/data/lcsd000a24g_e.gml'
input_csv = 'assets/data/2024_CA_census_subdivision.csv'
output_csv = 'assets/data/2024_CA_census_subdivision_with_latlon.csv'

# --- NAME NORMALIZATION ---
def normalize_name(name):
    name = re.sub(r'\s+', ' ', name)
    name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode('ascii')
    return name.lower().strip()

def clean_name(name):
    return re.sub(r'\s+', ' ', name).replace('"', '').strip()

def fuzzy_lookup(name, centroids, cutoff=0.85):
    matches = get_close_matches(name, centroids.keys(), n=1, cutoff=cutoff)
    if matches:
        return centroids[matches[0]]
    matches = get_close_matches(name, centroids.keys(), n=1, cutoff=0.7)
    if matches:
        return centroids[matches[0]]
    return ('', '')

def normalize_province(prov):
    # Use only the English part, remove accents, punctuation, and extra spaces
    prov = prov.split(' / ')[0].strip()
    prov = unicodedata.normalize('NFKD', prov).encode('ascii', 'ignore').decode('ascii')
    prov = re.sub(r'[^\w\s]', '', prov)
    prov = prov.lower().strip()
    # Handle known province name variants
    prov_map = {
        'quebec': 'quebec',
        'québec': 'quebec',
        'new brunswick': 'new brunswick',
        'nouveau brunswick': 'new brunswick',
        'nb': 'new brunswick',
        'n b': 'new brunswick',
        'n.-b.': 'new brunswick',
        'n.-b': 'new brunswick',
        'n b': 'new brunswick',
        'qc': 'quebec',
        'q c': 'quebec',
        'qué': 'quebec',
        'quebec province': 'quebec',
    }
    return prov_map.get(prov, prov)

# --- COORDINATE TRANSFORMER ---
transformer = Transformer.from_crs('EPSG:3347', 'EPSG:4326', always_xy=True)

# --- PARSE GML FOR CENTROIDS ---
print('Parsing GML for centroids...')
tree = ET.parse(gml_path)
root = tree.getroot()
ns = {'gml': 'http://www.opengis.net/gml', 'fme': 'http://www.safe.com/gml/fme'}
centroids = {}
for feature in root.findall('.//gml:featureMember', ns):
    name_el = feature.find('.//fme:CSDNAME', ns)
    type_el = feature.find('.//fme:CSDTYPE', ns)
    prov_el = feature.find('.//fme:PRNAME', ns)
    if name_el is None or type_el is None or prov_el is None:
        continue
    name = name_el.text.strip()
    csdtype = type_el.text.strip()
    prov = normalize_province(prov_el.text.strip())
    # Build normalized key to match CSV: "Name (Type), Province"
    key = f'{name} ({csdtype}), {prov}'
    norm_key = normalize_name(key)
    # Get first coordinate from gml:posList
    poslist = feature.find('.//gml:posList', ns)
    if poslist is not None:
        coords = poslist.text.strip().split()
        if len(coords) >= 2:
            x, y = float(coords[0]), float(coords[1])
            lon, lat = transformer.transform(x, y)
            centroids[norm_key] = (lat, lon)
            continue
    print(f'WARNING: No centroid found for {norm_key}')

print(f'Found {len(centroids)} centroids. Sample:')
for i, (k, v) in enumerate(centroids.items()):
    print(f'  {k}: {v}')
    if i >= 9:
        break

# --- JOIN AND OUTPUT ---
matched = 0
fuzzy_matched = 0
unmatched = 0
centroid_keys = list(centroids.keys())
with open(input_csv, newline='', encoding='utf-8') as infile, \
     open(output_csv, 'w', newline='', encoding='utf-8') as outfile:
    reader = list(csv.reader(infile))
    writer = csv.writer(outfile)
    header_written = False
    total = len(reader)
    for row in tqdm(reader, desc='Processing rows', unit='row'):
        if len(row) < 2 or not row[0] or row[0].startswith('Population estimates'):
            # Write header or skip metadata
            if not header_written:
                writer.writerow(['Geography', '2024', 'Latitude', 'Longitude'])
                header_written = True
            continue
        # If lat/lon already exist in the row, skip this row
        if len(row) >= 4 and row[2] and row[3]:
            continue
        name = clean_name(row[0])
        norm_name = normalize_name(name)
        pop = row[1]
        lat, lon = '', ''
        # Try direct match
        if norm_name in centroids:
            lat, lon = centroids[norm_name]
            matched += 1
        else:
            # Use rapidfuzz for fast fuzzy match
            result = process.extractOne(norm_name, centroid_keys, scorer=fuzz.ratio, score_cutoff=80)
            if result:
                match, score, _ = result
                lat, lon = centroids[match]
                fuzzy_matched += 1
            else:
                # Try matching without type code
                alt_key = ', '.join(norm_name.split(', ')[-2:]) if ', ' in norm_name else norm_name
                result2 = process.extractOne(alt_key, centroid_keys, scorer=fuzz.ratio, score_cutoff=75)
                if result2:
                    match, score, _ = result2
                    lat, lon = centroids[match]
                    fuzzy_matched += 1
                else:
                    print(f'NO MATCH: "{name}" | norm: "{norm_name}"')
                    unmatched += 1
        writer.writerow([row[0], pop, lat, lon])
print(f'\nSummary: {matched} direct matches, {fuzzy_matched} fuzzy matches, {unmatched} unmatched.')