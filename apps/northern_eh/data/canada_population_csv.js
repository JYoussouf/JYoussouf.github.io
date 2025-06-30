// Loads the Canadian census subdivision CSV and sums the population of all subdivisions south of a given latitude
export async function getCanadianPopulationFurtherSouthFromCSV(lat) {
    const url = 'data/2024_CA_census_subdivision_with_latlon.csv';
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Could not load Canadian census subdivision data');
    const text = await resp.text();
    const lines = text.split(/\r?\n/);
    let total = 0;
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(?:\"[^\"]*\"|[^,])+/g) || lines[i].split(',');
        let popStr = row[1] ? row[1].replace(/"/g, '').replace(/,/g, '').trim() : '';
        let latStr = row[2] ? row[2].replace(/"/g, '').trim() : '';
        if (!popStr || !latStr) continue;
        const pop = parseInt(popStr, 10);
        const latVal = parseFloat(latStr);
        if (!isNaN(pop) && !isNaN(latVal) && latVal < lat) {
            total += pop;
        }
    }
    return total;
}

window.getCanadianPopulationFurtherSouthFromCSV = getCanadianPopulationFurtherSouthFromCSV;
