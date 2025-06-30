// --- Cleaned up and modernized Northern Eh main JS ---

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
    if (window.northMap.getLayer('latitude-line')) window.northMap.removeLayer('latitude-line');
    if (window.northMap.getSource('latitude-line')) window.northMap.removeSource('latitude-line');
    const latLineCoords = [];
    for (let lonDeg = -180; lonDeg <= 180; lonDeg += 0.1) latLineCoords.push([lonDeg, lat]);
    window.northMap.addSource('latitude-line', {
        type: 'geojson',
        data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: latLineCoords }
        }
    });
    window.northMap.addLayer({
        id: 'latitude-line',
        type: 'line',
        source: 'latitude-line',
        layout: {},
        paint: {
            'line-color': '#ff0000',
            'line-width': 2,
            'line-dasharray': [2,2]
        }
    });
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
    // --- Compose result text ---
    const totalCanadianPopulation = 42024966;
    let percent = null;
    if (canadiansFurtherSouth !== null && totalCanadianPopulation > 0) {
        percent = (canadiansFurtherSouth / totalCanadianPopulation) * 100;
    }
    const isInCanada = loc.display_name && /canada/i.test(loc.display_name);
    const canadiansText = isInCanada ? 'other Canadians' : 'Canadians';
    let resultText = '';
    if (canadiansFurtherSouth !== null) {
        if (lat < 41.676555 || canadiansFurtherSouth <= 0) {
            resultText = 'Sorry! You are not further north than any Canadians.';
        } else if (canadiansFurtherSouth > 3_000_000) {
            resultText = isInCanada
                ? `You are further north than about ${canadiansFurtherSouth.toLocaleString()} other Canadians. That's ${percent.toFixed(1)} percent of the country!`
                : `You're an honorary Canadian! You are further north than about ${canadiansFurtherSouth.toLocaleString()} Canadians. ${percent.toFixed(1)} percent of the country!`;
        } else {
            resultText = `You are further north than about ${canadiansFurtherSouth.toLocaleString()} ${canadiansText}, or about ${percent.toFixed(1)} percent of the country.`;
        }
    } else {
        resultText = 'Could not determine Canadian population further south.';
    }
    document.getElementById('result').textContent = resultText;

    // --- Map logic ---
    if (!window.northMap) {
        mapboxgl.accessToken = MAPBOX_TOKEN;
        window.northMap = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [lon, lat],
            zoom: 4
        });
        window.northMap.on('load', () => {
            addOrUpdateMarkerAndPopup(lon, lat, loc.display_name);
            addLatitudeLine(lat);
        });
        window.northMap.doubleClickZoom.disable();
    } else {
        window.northMap.setCenter([lon, lat]);
        window.northMap.setZoom(4);
        addOrUpdateMarkerAndPopup(lon, lat, loc.display_name);
        if (window.northMap.isStyleLoaded()) {
            addLatitudeLine(lat);
        } else {
            window.northMap.once('load', () => addLatitudeLine(lat));
        }
    }
    // --- Accessibility fix for popup close button ---
    setTimeout(() => {
        document.querySelectorAll('.mapboxgl-popup-close-button').forEach(btn => {
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

function addOrUpdateMarkerAndPopup(lon, lat, displayName) {
    // Remove previous marker and popup if they exist
    if (window.northMarker) {
        window.northMarker.remove();
        window.northMarker = null;
    }
    if (window.northPopup) {
        window.northPopup.remove();
        window.northPopup = null;
    }
    // Add new marker
    window.northMarker = new mapboxgl.Marker({ color: 'red', draggable: true })
        .setLngLat([lon, lat])
        .addTo(window.northMap);
    // Add popup
    window.northPopup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        className: 'northern-eh-popup'
    })
        .setLngLat([lon, lat])
        .setHTML(`<div class="northern-eh-popup-content">${displayName}</div>`)
        .addTo(window.northMap);
    window.northMarker.setPopup(window.northPopup);
    // Marker drag event
    window.northMarker.on('dragend', async () => {
        const lngLat = window.northMarker.getLngLat();
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lngLat.lng},${lngLat.lat}.json?limit=1&access_token=${MAPBOX_TOKEN}`;
        let placeName = `${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`;
        try {
            const resp = await fetch(url);
            if (resp.ok) {
                const data = await resp.json();
                if (data.features && data.features[0] && data.features[0].place_name) {
                    placeName = data.features[0].place_name;
                }
            }
        } catch {}
        const input = document.getElementById('location-input');
        if (input) {
            input.value = placeName;
            input.blur();
        }
        document.getElementById('location-submit').click();
    });
}

// --- Suggestions logic ---
async function updateSuggestions() {
    const input = document.getElementById('location-input');
    const dropdown = document.getElementById('location-suggestions');
    const query = input.value.trim();
    if (!query) {
        dropdown.innerHTML = '';
        dropdown.classList.remove('show');
        return;
    }
    const results = await geocodeLocation(query);
    if (!results.length) {
        dropdown.innerHTML = '';
        dropdown.classList.remove('show');
        return;
    }
    dropdown.innerHTML = '';
    results.slice(0, 7).forEach((s, idx) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'dropdown-item';
        item.textContent = s.display_name || s.name;
        item.tabIndex = 0;
        item.setAttribute('data-idx', idx);
        item.addEventListener('click', e => {
            e.preventDefault();
            input.value = s.display_name || s.name;
            dropdown.classList.remove('show');
            document.getElementById('location-submit').click();
        });
        dropdown.appendChild(item);
    });
    dropdown.classList.add('show');
}

function handleSuggestionKeydown(e) {
    const dropdown = document.getElementById('location-suggestions');
    const items = Array.from(dropdown.querySelectorAll('.dropdown-item'));
    if (!dropdown.classList.contains('show') || items.length === 0) return;
    let activeIdx = items.findIndex(item => item.classList.contains('active'));
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeIdx >= 0) items[activeIdx].classList.remove('active');
        activeIdx = (activeIdx + 1) % items.length;
        items.forEach((item, idx) => item.classList.toggle('active', idx === activeIdx));
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeIdx >= 0) items[activeIdx].classList.remove('active');
        activeIdx = (activeIdx - 1 + items.length) % items.length;
        items.forEach((item, idx) => item.classList.toggle('active', idx === activeIdx));
    } else if (e.key === 'Enter') {
        if (activeIdx >= 0) {
            e.preventDefault();
            items[activeIdx].click();
        }
    } else if (e.key === 'Escape') {
        dropdown.classList.remove('show');
    }
}

function clearActiveSuggestion() {
    const dropdown = document.getElementById('location-suggestions');
    const items = Array.from(dropdown.querySelectorAll('.dropdown-item'));
    items.forEach(item => item.classList.remove('active'));
}

// --- DOMContentLoaded: UI/UX setup ---
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('location-input');
    if (input) {
        input.value = '';
        input.focus();
    }
    const dropdown = document.getElementById('location-suggestions');
    if (dropdown) {
        dropdown.innerHTML = '';
        dropdown.classList.remove('show');
    }
    if (!window.northMap) {
        mapboxgl.accessToken = MAPBOX_TOKEN;
        window.northMap = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [-95.7129, 56.1304],
            zoom: 3.2
        });
        window.northMap.on('load', () => {
            if (window.northMap.getLayer('latitude-line')) window.northMap.removeLayer('latitude-line');
            if (window.northMap.getSource('latitude-line')) window.northMap.removeSource('latitude-line');
        });
    }
    const button = document.getElementById('location-submit');
    button.addEventListener('click', handleLocationSubmit);
    input.addEventListener('input', e => {
        clearActiveSuggestion();
        updateSuggestions();
    });
    input.addEventListener('focus', updateSuggestions);
    input.addEventListener('keydown', handleSuggestionKeydown);
    input.addEventListener('blur', () => {
        setTimeout(() => {
            if (!dropdown.contains(document.activeElement)) {
                dropdown.classList.remove('show');
            }
        }, 150);
    });
    dropdown.addEventListener('blur', () => {
        setTimeout(() => {
            if (!input.matches(':focus')) {
                dropdown.classList.remove('show');
            }
        }, 150);
    }, true);
    // Accessibility and style tweaks
    if (input) {
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'off');
        input.setAttribute('spellcheck', 'false');
        input.style.border = '1.5px solid #888';
        input.style.borderRadius = '8px';
        input.style.padding = '7px 10px'; // Smaller padding
        input.style.fontSize = '1rem';    // Slightly smaller font
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
    }
    const locationForm = document.getElementById('location-form');
    if (locationForm) {
        locationForm.setAttribute('autocomplete', 'off');
    }

    // Add floating home button with favicon
    if (!document.getElementById('joseppy-home-btn')) {
        const btn = document.createElement('a');
        btn.id = 'joseppy-home-btn';
        btn.href = 'https://joseppy.ca';
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        btn.style.position = 'fixed';
        btn.style.right = '18px';
        btn.style.bottom = '18px';
        btn.style.zIndex = '9999';
        btn.style.width = '36px';
        btn.style.height = '36px';
        btn.style.borderRadius = '50%';
        btn.style.background = '#fff';
        btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.13)';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.transition = 'box-shadow 0.2s, transform 0.2s';
        btn.style.cursor = 'pointer';
        btn.style.border = '1.5px solid #eee';
        btn.style.padding = '0';
        btn.style.opacity = '0.92';
        btn.style.backdropFilter = 'blur(2px)';
        btn.title = 'Back to joseppy.ca';
        btn.onmouseenter = () => { btn.style.boxShadow = '0 4px 16px rgba(25,118,210,0.18)'; btn.style.transform = 'scale(1.07)'; };
        btn.onmouseleave = () => { btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.13)'; btn.style.transform = 'scale(1)'; };
        const img = document.createElement('img');
        img.src = '../portfolio/images/favicon.ico';
        img.alt = 'joseppy.ca';
        img.style.width = '22px';
        img.style.height = '22px';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        img.style.borderRadius = '50%';
        btn.appendChild(img);
        document.body.appendChild(btn);
    }
});
