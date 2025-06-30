const MAPBOX_TOKEN = 'pk.eyJ1Ijoiam9leW91c3NvdWYiLCJhIjoiY21jaHZzcGtvMTA3MjJqcHdkbTQxdHM5byJ9.RiCtWaN7QcwLZHcrvs2FUg';

import { getCanadianPopulationFurtherSouthFromCSV } from './data/canada_population_csv.js';

async function geocodeLocation(input) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input)}.json?limit=5&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.features.map(f => ({
        display_name: f.place_name,
        lat: f.center[1],
        lon: f.center[0]
    }));
}

function addLatitudeLine(lat) {
    // Remove any existing latitude line
    if (window.northMap.getLayer('latitude-line')) window.northMap.removeLayer('latitude-line');
    if (window.northMap.getSource('latitude-line')) window.northMap.removeSource('latitude-line');
    const latLineCoords = [];
    for (let lonDeg = -180; lonDeg <= 180; lonDeg += 0.1) {
        latLineCoords.push([lonDeg, lat]);
    }
    window.northMap.addSource('latitude-line', {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': latLineCoords
            }
        }
    });
    window.northMap.addLayer({
        'id': 'latitude-line',
        'type': 'line',
        'source': 'latitude-line',
        'layout': {},
        'paint': {
            'line-color': '#ff0000',
            'line-width': 2,
            'line-dasharray': [2,2]
        }
    });
    window.northLatitudeLine = true;
}

async function handleLocationSubmit() {
    const input = document.getElementById('location-input').value.trim();
    const results = await geocodeLocation(input);
    if (!results.length) {
        document.getElementById('result').textContent = 'Sorry, could not find that location.';
        return;
    }
    const loc = results[0];
    const lat = loc.lat;
    const lon = loc.lon;
    let canadiansFurtherSouth = null;
    try {
        canadiansFurtherSouth = await getCanadianPopulationFurtherSouthFromCSV(lat);
    } catch (e) {
        document.getElementById('result').textContent = 'Could not load Canadian census data.';
        return;
    }
    let resultText = '';
    // Assume total Canadian population is 40,769,890 (2024 estimate)
    const totalCanadianPopulation = 40769890;
    let percent = null;
    if (canadiansFurtherSouth !== null && totalCanadianPopulation > 0) {
        percent = (canadiansFurtherSouth / totalCanadianPopulation) * 100;
    }
    if (canadiansFurtherSouth !== null) {
        if (lat < 41.676555 || canadiansFurtherSouth <= 0) {
            resultText = 'Sorry! You are not further north than any Canadians.';
        } else if (canadiansFurtherSouth > 3_000_000) {
            resultText = `You're an honorary Canadian! You are further north than about ${canadiansFurtherSouth.toLocaleString()} Canadians. ${percent.toFixed(1)} percent of the country!`;
        } else {
            resultText = `You are further north than about ${canadiansFurtherSouth.toLocaleString()} Canadians, or about ${percent.toFixed(1)} percent of the country.`;
        }
    } else {
        resultText = 'Could not determine Canadian population further south.';
    }
    document.getElementById('result').textContent = resultText;
    if (!window.northMap) {
        mapboxgl.accessToken = MAPBOX_TOKEN;
        window.northMap = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [lon, lat],
            zoom: 7
        });
        window.northMap.on('load', () => {
            window.northMarker = new mapboxgl.Marker().setLngLat([lon, lat]).addTo(window.northMap);
            window.northPopup = new mapboxgl.Popup({ closeButton: true, closeOnClick: false })
                .setLngLat([lon, lat])
                .setText(loc.display_name)
                .addTo(window.northMap);
            window.northMarker.setPopup(window.northPopup);
            // Always add the latitude line after the map loads
            addLatitudeLine(lat);
        });
    } else {
        window.northMap.setCenter([lon, lat]);
        window.northMap.setZoom(7);
        // Ensure marker exists before setting its position
        if (!window.northMarker) {
            window.northMarker = new mapboxgl.Marker().setLngLat([lon, lat]).addTo(window.northMap);
        } else {
            window.northMarker.setLngLat([lon, lat]);
        }
        if (window.northPopup) {
            window.northPopup.setLngLat([lon, lat]).setText(loc.display_name);
        } else {
            window.northPopup = new mapboxgl.Popup({ closeButton: true, closeOnClick: false })
                .setLngLat([lon, lat])
                .setText(loc.display_name)
                .addTo(window.northMap);
            window.northMarker.setPopup(window.northPopup);
        }
        // Always add the latitude line after moving the map
        if (window.northMap.isStyleLoaded()) {
            addLatitudeLine(lat);
        } else {
            window.northMap.once('load', () => addLatitudeLine(lat));
        }
    }
    setTimeout(() => {
        const closeBtns = document.querySelectorAll('.mapboxgl-popup-close-button');
        closeBtns.forEach(btn => {
            if (btn.hasAttribute('aria-hidden')) btn.removeAttribute('aria-hidden');
            if (document.activeElement === btn) btn.blur();
        });
    }, 100);
    if (window.northPopup && !window.northPopup._ariaFixAdded) {
        window.northPopup.on('close', () => {
            const closeBtn = document.querySelector('.mapboxgl-popup-close-button');
            if (closeBtn && document.activeElement === closeBtn) closeBtn.blur();
        });
        window.northPopup._ariaFixAdded = true;
    }
}

// Remove datalist and debounce logic, add Bootstrap dropdown suggestion logic
async function updateSuggestions() {
    const input = document.getElementById('location-input');
    const dropdown = document.getElementById('location-suggestions');
    const query = input.value.trim();
    dropdown.innerHTML = '';
    dropdown.classList.remove('show');
    if (!query) return;
    const results = await geocodeLocation(query);
    if (!results.length) return;
    results.slice(0, 7).forEach((s, idx) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'dropdown-item';
        item.textContent = s.display_name || s.name;
        item.tabIndex = 0;
        item.addEventListener('mousedown', e => {
            e.preventDefault();
            input.value = s.display_name || s.name;
            dropdown.classList.remove('show');
            document.getElementById('location-submit').click();
        });
        dropdown.appendChild(item);
    });
    dropdown.classList.add('show');
}

document.addEventListener('DOMContentLoaded', () => {
    // Clear the search box on page load
    const input = document.getElementById('location-input');
    if (input) input.value = '';
    // Clear suggestions box on page load
    const dropdown = document.getElementById('location-suggestions');
    if (dropdown) {
        dropdown.innerHTML = '';
        dropdown.classList.remove('show');
    }
    // Lazy load the map centered on Canada by default
    if (!window.northMap) {
        mapboxgl.accessToken = MAPBOX_TOKEN;
        window.northMap = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [-95.7129, 56.1304], // Center of Canada
            zoom: 3.2
        });
        // Remove any latitude line on default view
        window.northMap.on('load', () => {
            if (window.northMap.getLayer('latitude-line')) window.northMap.removeLayer('latitude-line');
            if (window.northMap.getSource('latitude-line')) window.northMap.removeSource('latitude-line');
        });
    }
    const button = document.getElementById('location-submit');
    button.addEventListener('click', handleLocationSubmit);
    input.addEventListener('input', updateSuggestions);
    input.addEventListener('focus', updateSuggestions);
    input.addEventListener('blur', () => {
        setTimeout(() => {
            document.getElementById('location-suggestions').classList.remove('show');
        }, 150);
    });
    const locationInput = document.getElementById('location-input');
    if (locationInput) {
        locationInput.setAttribute('autocomplete', 'off');
        locationInput.setAttribute('autocorrect', 'off');
        locationInput.setAttribute('autocapitalize', 'off');
        locationInput.setAttribute('spellcheck', 'false');
    }
    const locationForm = document.getElementById('location-form');
    if (locationForm) {
        locationForm.setAttribute('autocomplete', 'off');
    }
    input.style.border = '1.5px solid #888';
    input.style.borderRadius = '8px';
    input.style.padding = '10px 14px';
    input.style.fontSize = '1.1rem';
    input.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    input.style.outline = 'none';
    input.style.transition = 'border 0.2s, box-shadow 0.2s';
    input.addEventListener('focus', () => {
        input.style.border = '1.5px solid #1976d2';
        input.style.boxShadow = '0 4px 16px rgba(25,118,210,0.10)';
    });
    input.addEventListener('blur', () => {
        input.style.border = '1.5px solid #888';
        input.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    });
});
