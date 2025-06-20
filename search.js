const id = ['specialtySearch', 'stateSearch', 'city', 'zip', 'f_name', 'l_name'];

class Card {
    constructor(config = {}) {
        this.config = {
            name: 'name',
            specialties: 'specialties',
            address: 'address',
            city: 'city',
            state: 'state',
            phone: 'phone',
            
        };
    }
}

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
    
    // Log all form values for debugging
    for (let i = 0; i < id.length; i++) {
        const inputElement = document.getElementById(id[i]);
        if (inputElement != null && inputElement != undefined) {
            console.log(id[i], inputElement.value);
        }
    }
    
    const apiUrl = buildApiUrl();
    console.log("API URL:", apiUrl);
    
    // Call the search function
    searchProviders(apiUrl);
});

async function searchProviders(url) {
    try {
        console.log("Making request to:", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("API Response:", data);
        
        // Display results (you can customize this part)
        displayResults(data);
        
    } catch (error) {
        console.error('Error:', error);
        
        // Show user-friendly error message
        displayError(error.message);
    }
}

function displayResults(data) {
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
    
    let html = `<h3>Found ${data.result_count} providers:</h3>`;
    
    data.results.forEach(provider => {
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
            
            // Add authorized official if available
            // if (basic.authorized_official_first_name && basic.authorized_official_last_name) {
            //     providerName += ` (Auth. Official: ${basic.authorized_official_first_name} ${basic.authorized_official_last_name}`;
            //     if (basic.authorized_official_credential) {
            //         providerName += `, ${basic.authorized_official_credential}`;
            //     }
            //     providerName += ')';
            // }
        } else {
            // Fallback - sometimes the structure might be different
            providerName = 'Name not available';
            providerType = 'Unknown';
        }
        


        html +=    `<div class="doctor-card">
                        <div class="row">
                            <div class="col-6">
                                <h5 class="doctor-name"><strong>${providerName}</strong></h5>
                                <p class="specialty">${taxonomies[0].desc}</p>
                                ${taxonomies.length > 1 ? `<p class='specialty'>${taxonomies.slice(1).map(t => t.desc).join('; ')}</p>` : ''}
                 
                            </div>
                            <div class="col-6 contact-info">
                                <h5>${address.address_1}${address.address_2 ? ', ' + address.address_2 : ''}</h5>
                                <h5>${address.city}, ${address.state} ${formatZipCode(address.postal_code)}</h5>
                                <h5>${address.telephone_number ? `<p>${address.telephone_number}</p>` : ''}</h5>
                            </div>
                        </div>
                    </div>`;
    });
    
    resultsContainer.innerHTML = html;
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

