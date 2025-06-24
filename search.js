const id = ['specialtySearch', 'stateSearch', 'city', 'zip', 'f_name', 'l_name'];
const pin = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-zoom-in" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11M13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0"/>
  <path d="M10.344 11.742q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1 6.5 6.5 0 0 1-1.398 1.4z"/>
  <path fill-rule="evenodd" d="M6.5 3a.5.5 0 0 1 .5.5V6h2.5a.5.5 0 0 1 0 1H7v2.5a.5.5 0 0 1-1 0V7H3.5a.5.5 0 0 1 0-1H6V3.5a.5.5 0 0 1 .5-.5"/>
</svg>`

let map;
let currentMarkers = []; // Track all markers

function entry(id) {
    return document.getElementById(id).value;
}

function buildApiUrl() {
    // Build URL with proper encoding and only include non-empty parameters
    // CHANGED: Use proxy server instead of direct API call
    const baseUrl = '/api/';  // This goes through your proxy server
    const params = new URLSearchParams();
   
    const specialty = entry('specialtySearch');
    const firstName = entry('f_name');
    const lastName = entry('l_name');
    const city = entry('city');
    const state = entry('stateSearch');
    const zip = entry('zip');
   
    if (specialty) params.append('taxonomy_description', specialty);
    if (firstName) params.append('first_name', firstName);
    if (lastName) params.append('last_name', lastName);
    if (city) params.append('city', city);
    if (state) params.append('state', state);
    if (zip) params.append('postal_code', zip);
   
    // Add default parameters
    params.append('version', '2.1');
    params.append('limit', '99'); // Reasonable default
   
    return `${baseUrl}?${params.toString()}`;
}

document.getElementById('search').addEventListener('click', function() {
    console.log("Search button clicked");
    let loc = "";

    // Log all form values for debugging
    for (let i = 0; i < id.length; i++) {
        const inputElement = document.getElementById(id[i]);
        if (inputElement != null && inputElement != undefined) {
            console.log(id[i], inputElement.value);
            if (id[i] == 'city') {
                loc = inputElement.value + ", " + loc;
            }
            if (id[i] == 'zip') {
                loc += " " + inputElement.value;
            }
            if (id[i] == 'stateSearch') {
                loc = inputElement.value;
            }
        }
    }
    
    const apiUrl = buildApiUrl();
    console.log("API URL:", apiUrl);
    // Call the search function
    searchProviders(apiUrl, loc);
});

async function searchProviders(url, location) {
    try {
        console.log("Making request to:", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("API Response:", data);
        
        // Display results (you can customize this part)
        displayResults(data, location);
        
    } catch (error) {
        console.error('Error:', error);
        
        // Show user-friendly error message
        displayError(error.message);
    }
}
function displayResults(data, loc) {
    // Find or create a results container
    let resultsContainer = document.getElementById('results-col');
    
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'results-col';
        document.body.appendChild(resultsContainer);
    }
    
    if (!data.results || data.results.length === 0) {
        resultsContainer.innerHTML = '<p>No results found.</p>';
        return;
    }

    let mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) {
        mapContainer = document.createElement('div');
        mapContainer.id = 'mapContainer';
        mapContainer.style.height = '50vh';
        mapContainer.style.width = '100%';
        document.body.appendChild(mapContainer);
    }

    // Initialize map with a default location
    if (!map) {
        map = L.map('mapContainer').setView([34.0522, -118.2437], 12); // Default to LA
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }

    // Clear existing markers
    currentMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    currentMarkers = [];

    // Set map view to search location
    getCoords(loc).then(coords => {
        if (coords) {
            map.setView(coords, 12);
        }
    });

    // Show loading message initially
    resultsContainer.innerHTML = `<h3>Found ${data.result_count} providers:</h3><p>Loading provider locations...</p>`;

    // Create promises for all providers
    const providerPromises = data.results.map(provider => {
        const basic = provider.basic;
        const addresses = provider.addresses || [];
        const taxonomies = provider.taxonomies || [];

        const address = addresses.find(addr => addr.address_purpose === 'LOCATION') 
            || addresses.find(addr => addr.address_purpose === 'PRIMARY')
            || addresses.find(addr => addr.address_purpose === 'MAILING')
            || addresses[0]
            || {};

        // Handle different provider types (Individual vs Organization)
        let providerName = '';
        let providerType = '';
        
        if (basic.first_name && basic.last_name) {
            // Individual provider
            providerName = `${basic.first_name} ${basic.last_name}`;
            if (basic.credential) {
                providerName += `, ${basic.credential}`;
            }
            providerType = 'Individual';
        } else if (basic.organization_name) {
            // Organization
            providerName = basic.organization_name;
            providerType = 'Organization';
        } else {
            // Fallback
            providerName = 'Name not available';
            providerType = 'Unknown';
        }
        
        const providerLoc = `${address.address_1}${address.address_2 ? ', ' + address.address_2 : ''}, ${address.city}, ${address.state} ${formatZipCode(address.postal_code)}`;
        
        return getCoords(providerLoc).then(coords => {
            if (coords) {
                // Add marker to map
                const popupContent = `
                <div>
                    <strong>${providerName}</strong><br>
                    ${taxonomies[0]?.desc || 'Practice Information'}<br>
                    <small>${address.address_1}${address.address_2 ? ', ' + address.address_2 : ''}<br>
                    ${address.city}, ${address.state} ${formatZipCode(address.postal_code)}</small>
                </div>
                `;
                
                const marker = L.marker(coords).addTo(map).bindPopup(popupContent);
                currentMarkers.push(marker);

                // Return HTML for this provider
                return `<div class="doctor-card">
                            <div class="row">
                                <div class="col-6">
                                    <h5 class="doctor-name"><strong>${providerName}</strong></h5>
                                    <p class="specialty">${taxonomies[0]?.desc || 'No specialty listed'}</p>
                                    ${taxonomies.length > 1 ? `<p class='specialty'>${taxonomies.slice(1).map(t => t.desc).join('; ')}</p>` : ''}
                                    </div>
                                <div class="col-6 contact-info">
                                    <h5>${address.address_1}${address.address_2 ? ', ' + address.address_2 : ''}</h5>
                                    <h5>${address.city}, ${address.state} ${formatZipCode(address.postal_code)}</h5>
                                    ${address.telephone_number ? `<h5><p>${address.telephone_number}</p></h5>` : ''}
                                    <button type="button" onclick="goToCoord(this)" class="btn btn-outline-primary" data-lat="${coords[0]}" data-lng="${coords[1]}">${pin}</button>
                                </div>
                            </div>
                        </div>`;
            } else {
                // Return HTML without coordinates if geocoding failed
                return `<div class="doctor-card">
                            <div class="row">
                                <div class="col-6">
                                    <h5 class="doctor-name"><strong>${providerName}</strong></h5>
                                    <p class="specialty">${taxonomies[0]?.desc || 'No specialty listed'}</p>
                                    ${taxonomies.length > 1 ? `<p class='specialty'>${taxonomies.slice(1).map(t => t.desc).join('; ')}</p>` : ''}
                                    </div>
                                <div class="col-6 contact-info">
                                    <h5>${address.address_1}${address.address_2 ? ', ' + address.address_2 : ''}</h5>
                                    <h5>${address.city}, ${address.state} ${formatZipCode(address.postal_code)}</h5>
                                    ${address.telephone_number ? `<h5><p>${address.telephone_number}</p></h5>` : ''}
                                    <button type="button" class="btn btn-secondary" disabled>Location unavailable</button>
                                </div>
                            </div>
                        </div>`;
            }
        }).catch(error => {
            console.error('Error getting coordinates for provider:', error);
            // Return HTML without coordinates if there's an error
            return `<div class="doctor-card">
                        <div class="row">
                            <div class="col-6">
                                <h5 class="doctor-name"><strong>${providerName}</strong></h5>
                                <p class="specialty">${taxonomies[0]?.desc || 'No specialty listed'}</p>
                                ${taxonomies.length > 1 ? `<p class='specialty'>${taxonomies.slice(1).map(t => t.desc).join('; ')}</p>` : ''}
                                <button type="button" class="btn btn-secondary" disabled>Error loading location</button>
                            </div>
                            <div class="col-6 contact-info">
                                <h5>${address.address_1}${address.address_2 ? ', ' + address.address_2 : ''}</h5>
                                <h5>${address.city}, ${address.state} ${formatZipCode(address.postal_code)}</h5>
                                ${address.telephone_number ? `<h5><p>${address.telephone_number}</p></h5>` : ''}
                            </div>
                        </div>
                    </div>`;
        });
    });

    // Wait for all providers to be processed, then render
    Promise.all(providerPromises).then(htmlParts => {
        const html = `<h3>Found ${data.result_count} providers:</h3>` + htmlParts.join('');
        resultsContainer.innerHTML = html;
    }).catch(error => {
        console.error('Error processing providers:', error);
        resultsContainer.innerHTML = `<h3>Found ${data.result_count} providers:</h3><p>Error loading provider information.</p>`;
    });
}



function displayError(errorMessage) {
    let resultsContainer = document.getElementById('results');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'results';
        document.body.appendChild(resultsContainer);
    }
    
    resultsContainer.innerHTML = `
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <strong>Error:</strong> ${errorMessage}
            <br><br>
            <small>Make sure the proxy server is running on port 3001.</small>
        </div>
    `;
}

function formatZipCode(zipCode) {
    if (!zipCode) return '';
    
    // Remove any existing dashes or spaces
    const cleanZip = zipCode.toString().replace(/[-\s]/g, '');
    

    // If it's 5 or fewer digits, return as-is
    return cleanZip.slice(0,5);
}


async function getCoords(address) {
    console.error('API KEY REQUIRED!');

    try {
        const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${API_KEY}`);

        const data = await response.json();
        
        if (data.results.length > 0) {
            return [parseFloat(data.results[0].geometry.lat), parseFloat(data.results[0].geometry.lng)];
        }
        else {
            console.error('Address not found');
            return null;
        }
    }
    catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}


function goToCoord(button) {
    map.flyTo([parseFloat(button.dataset.lat), parseFloat(button.dataset.lng)], 18)    
}
