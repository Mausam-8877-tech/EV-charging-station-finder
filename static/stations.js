// Global variables
let map;
let markers = [];
let userLocation = null;
let selectedStation = null;
let routingControl = null;
let allStations = []; // Store all stations for filtering
let currentPage = 1;
let itemsPerPage =2;
let totalPages = 1;
let filteredStations = [];

// Initialize the map when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initMap();
});

// Initialize the map
function initMap() {
  console.log("Initializing map");

  // Create the map centered on India
  map = L.map('map').setView([20.5937, 78.9629], 5); // Center of India

  // Add OpenStreetMap tile layer
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const state = urlParams.get('state');
  const district = urlParams.get('district');
  const distance = urlParams.get('distance');

  // Load states and districts
  loadStates().then(() => {
    // Set the state and district from URL parameters if available
    if (state) {
      document.getElementById('stateFilter').value = state;
      loadDistricts(state).then(() => {
        if (district) {
          document.getElementById('districtFilter').value = district;
        }

        // Set distance filter if available
        if (distance) {
          document.getElementById('distanceFilter').value = distance;
        }

        // Load stations based on URL parameters
        loadStations(state, district);
      });
    } else {
      // Load all stations if no parameters
      loadStations();
    }
  });

  // Add event listeners
  setupEventListeners();

  // Request user location after a short delay to ensure the page is loaded
  setTimeout(() => {
    // Show location request overlay
    document.getElementById('locationRequest').style.display = 'flex';
  }, 1000);
}

// Load states from API
async function loadStates() {
  try {
    const response = await fetch('https://sajan2288.pythonanywhere.com/api/states');
    const states = await response.json();

    const stateFilter = document.getElementById('stateFilter');
    states.forEach(state => {
      const option = document.createElement('option');
      option.value = state;
      option.textContent = state;
      stateFilter.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading states:", error);
    showError("Failed to load states. Please try again later.");
  }
}

// Load districts for a specific state
async function loadDistricts(state) {
  try {
    const districtFilter = document.getElementById('districtFilter');
    districtFilter.innerHTML = '<option value="">All Districts</option>';

    if (!state) {
      districtFilter.disabled = true;
      return;
    }

    const response = await fetch(`https://sajan2288.pythonanywhere.com/api/districts?state=${encodeURIComponent(state)}`);
    const districts = await response.json();

    districts.forEach(district => {
      const option = document.createElement('option');
      option.value = district;
      option.textContent = district;
      districtFilter.appendChild(option);
    });

    districtFilter.disabled = false;
  } catch (error) {
    console.error("Error loading districts:", error);
    showError("Failed to load districts. Please try again later.");
  }
}

// Load stations based on filters
async function loadStations(state = null, district = null) {
  // Show loading indicator
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'flex';
  }

  const stationList = document.getElementById('stationList');
  if (stationList) {
    stationList.innerHTML = '';
  }

  clearMarkers();

  try {
    let apiUrl = 'https://sajan2288.pythonanywhere.com/api/stations';

    // If district is provided, use it as the city parameter
    if (district) {
      apiUrl += `?city=${encodeURIComponent(district)}`;
      if (state) {
        apiUrl += `&state=${encodeURIComponent(state)}`;
      }
    } else if (state) {
      // If only state is provided, use the first district of that state
      const districtsResponse = await fetch(`https://sajan2288.pythonanywhere.com/api/districts?state=${encodeURIComponent(state)}`);
      const districts = await districtsResponse.json();
      if (districts && districts.length > 0) {
        apiUrl += `?city=${encodeURIComponent(districts[0])}&state=${encodeURIComponent(state)}`;
      } else {
        showNoResults();
        return;
      }
    } else {
      // If no filters are provided, use a default location or show all stations
      // For now, let's use a default district
      const testResponse = await fetch('/test');
      const testData = await testResponse.json();
      if (testData.districts && testData.districts.length > 0) {
        apiUrl += `?city=${encodeURIComponent(testData.districts[0])}&state=Bihar`;
      } else {
        showNoResults();
        return;
      }
    }

    console.log("Fetching stations from:", apiUrl);

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log("API response:", data);

    if (!data || data.length === 0) {
      showNoResults();
      return;
    }

    // Update results title and stats
    const resultsTitle = document.getElementById('resultsTitle');
    if (resultsTitle) {
      resultsTitle.textContent = state && district
        ? `Charging Stations in ${district}, ${state}`
        : state
          ? `Charging Stations in ${state}`
          : "Charging Stations";
    }

    const resultsStats = document.getElementById('resultsStats');
    if (resultsStats) {
      resultsStats.textContent = `${data.length} stations found`;
    }

    // Store all stations for filtering
    allStations = data;
    filteredStations = [...data];

    // Add markers to map
    addMarkersToMap(data);

    // Reset pagination
    currentPage = 1;

    // Calculate total pages
    totalPages = Math.ceil(filteredStations.length / itemsPerPage);

    // Display first page of stations
    displayStationsPage(currentPage);

  } catch (error) {
    console.error("Error loading stations:", error);
    showError("Failed to load stations. Please try again later.");
  } finally {
    // Hide loading indicator
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }
}

// Add markers to the map
function addMarkersToMap(stations) {
  // Clear existing markers
  clearMarkers();

  // Create array to store marker positions for bounds
  const markerPositions = [];

  // Add markers for each station
  stations.forEach((station) => {
    // Check if station has valid coordinates
    if (!station.latitude || !station.longitude ||
        isNaN(parseFloat(station.latitude)) ||
        isNaN(parseFloat(station.longitude))) {
      console.log(`Station ${station.name} has invalid coordinates:`, station.latitude, station.longitude);
      return;
    }

    const lat = parseFloat(station.latitude);
    const lng = parseFloat(station.longitude);

    // Create marker
    const marker = L.marker([lat, lng], {
      title: station.name
    }).addTo(map);

    // Store additional station data with the marker
    marker.station = station;

    // Create popup content
    const content = `
      <div class="info-window">
        <h3>${station.name}</h3>
        <p><strong>Address:</strong> ${station.address}</p>
        <p><strong>Contact:</strong> ${station.contact}</p>
        <p><strong>Services:</strong> ${station.services}</p>
        <p><strong>Timing:</strong> ${station.timing}</p>
        <button class="info-window-button" onclick="showDirectionsFromUser(${lat}, ${lng}, '${station.name}')">
          Get Directions
        </button>
      </div>
    `;

    // Bind popup to marker
    marker.bindPopup(content);

    // Add click event to marker
    marker.on('click', () => {
      // Highlight the corresponding card
      highlightCard(station.name);

      // Store as selected station
      selectedStation = station;
    });

    // Store marker
    markers.push(marker);

    // Add position to array for bounds
    markerPositions.push([lat, lng]);
  });

  // If we have markers, fit the map to show all of them
  if (markerPositions.length > 0) {
    map.fitBounds(markerPositions);

    // If only one marker, zoom out a bit
    if (markerPositions.length === 1) {
      map.setZoom(14);
    }
  }
}

// Create station cards
function createStationCards(stations) {
  const stationList = document.getElementById('stationList');
  stationList.innerHTML = '';

  stations.forEach(station => {
    const card = document.createElement('div');
    card.className = 'station-card';
    card.dataset.stationName = station.name;

    const hasCoordinates = station.latitude && station.longitude &&
                          !isNaN(parseFloat(station.latitude)) &&
                          !isNaN(parseFloat(station.longitude));

    // Add coordinates as data attributes for distance calculation
    if (hasCoordinates) {
      card.dataset.lat = parseFloat(station.latitude);
      card.dataset.lng = parseFloat(station.longitude);
    }

    // Add distance element if user location is available
    let distanceHtml = '';
    if (userLocation && hasCoordinates) {
      const distance = calculateDistance(
        userLocation.lat, userLocation.lng,
        parseFloat(station.latitude), parseFloat(station.longitude)
      );
      const formattedDistance = formatDistance(distance);
      distanceHtml = `<p class="station-distance"><i class="fas fa-route"></i> <strong>Distance:</strong> <span>${formattedDistance}</span></p>`;
    }

    card.innerHTML = `
      <h3><i class="fas fa-charging-station"></i> ${station.name}</h3>
      <p><strong>Address:</strong> ${station.address}</p>
      <p><strong>Contact:</strong> ${station.contact || 'Not available'}</p>
      <p><strong>Services:</strong> ${station.services || 'Standard charging'}</p>
      <p><strong>Timing:</strong> ${station.timing || 'Not specified'}</p>
      ${distanceHtml}
      <div class="station-card-actions">
        ${station.contact && station.contact !== "N/A" ?
          `<a href="tel:${station.contact}" class="station-card-button">
            <i class="fas fa-phone"></i> Call
          </a>` : ''}
        ${hasCoordinates ?
          `<button class="station-card-button primary view-on-map" data-lat="${station.latitude}" data-lng="${station.longitude}" data-name="${station.name}">
            <i class="fas fa-map-marker-alt"></i> View on Map
          </button>` : ''}
        ${hasCoordinates ?
          `<button class="station-card-button get-directions" data-lat="${station.latitude}" data-lng="${station.longitude}" data-name="${station.name}">
            <i class="fas fa-directions"></i> Directions
          </button>` : ''}
      </div>
    `;

    stationList.appendChild(card);
  });

  // Add event listeners to "View on Map" buttons
  document.querySelectorAll('.view-on-map').forEach(button => {
    button.addEventListener('click', () => {
      const lat = parseFloat(button.dataset.lat);
      const lng = parseFloat(button.dataset.lng);
      const name = button.dataset.name;

      // Find the marker for this station
      const marker = markers.find(m => m.station && m.station.name === name);

      if (marker) {
        // Center map on marker
        map.setView([lat, lng], 15);

        // Open popup for this marker
        marker.openPopup();

        // Highlight the card
        highlightCard(name);

        // If user location is available, show directions
        if (userLocation) {
          showDirectionsFromUser(lat, lng, name);
        }
      }
    });
  });

  // Add event listeners to "Get Directions" buttons
  document.querySelectorAll('.get-directions').forEach(button => {
    button.addEventListener('click', () => {
      const lat = parseFloat(button.dataset.lat);
      const lng = parseFloat(button.dataset.lng);
      const name = button.dataset.name;

      // Check if we have user's location
      if (!userLocation) {
        // Show location request overlay
        const locationRequest = document.getElementById('locationRequest');
        if (locationRequest) {
          locationRequest.style.display = 'flex';
        }

        // Store destination for later use
        sessionStorage.setItem('pendingDirectionLat', lat);
        sessionStorage.setItem('pendingDirectionLng', lng);
        sessionStorage.setItem('pendingDirectionName', name);
        sessionStorage.setItem('pendingDirectionOpenExternal', 'true');
      } else {
        // Open directions in external map
        openExternalDirections(lat, lng);
      }
    });
  });
}

// Highlight the selected station card
function highlightCard(stationName) {
  // Remove highlight from all cards
  document.querySelectorAll('.station-card').forEach(card => {
    card.classList.remove('selected');
  });

  // Add highlight to the selected card
  const selectedCard = document.querySelector(`.station-card[data-station-name="${stationName}"]`);
  if (selectedCard) {
    selectedCard.classList.add('selected');
    selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Clear all markers from the map
function clearMarkers() {
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];

  // Remove routing control if it exists
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }
}

// Calculate distance between two points in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Format distance for display
function formatDistance(distance) {
  if (distance < 1) {
    return Math.round(distance * 1000) + " m";
  } else {
    return distance.toFixed(1) + " km";
  }
}

// Show directions from user location to station
function showDirectionsFromUser(lat, lng, stationName) {
  // Check if we have user's location
  if (!userLocation) {
    // Show location request overlay
    document.getElementById('locationRequest').style.display = 'flex';

    // Store destination for later use
    sessionStorage.setItem('pendingDirectionLat', lat);
    sessionStorage.setItem('pendingDirectionLng', lng);
    sessionStorage.setItem('pendingDirectionName', stationName);
    return;
  }

  // Remove existing routing control if it exists
  if (routingControl) {
    map.removeControl(routingControl);
  }

  // Create a path between user location and destination
  const userLatLng = [userLocation.lat, userLocation.lng];
  const destLatLng = [parseFloat(lat), parseFloat(lng)];

  // Calculate the distance
  const distance = calculateDistance(
    userLocation.lat, userLocation.lng,
    parseFloat(lat), parseFloat(lng)
  );
  const formattedDistance = formatDistance(distance);

  // Create a polyline between the two points with arrow decorations
  const routeLine = L.polyline([userLatLng, destLatLng], {
    color: '#00ffcc',
    weight: 4,
    opacity: 0.8,
    dashArray: '10, 10',
    lineCap: 'round'
  }).addTo(map);

  // Add arrow markers along the path
  const arrowHead = L.polyline([[0,0], [0,0]], {
    color: '#00ffcc',
    weight: 4,
    opacity: 0
  }).arrowheads({
    frequency: '100px',
    size: '12px',
    fill: true
  }).addTo(map);

  // Update the arrow path
  arrowHead.setLatLngs([userLatLng, destLatLng]);

  // Store the routing control (in this case, the polyline and arrowhead)
  routingControl = L.layerGroup([routeLine, arrowHead]);

  // Fit the map to show both points
  const bounds = L.latLngBounds([userLatLng, destLatLng]);
  map.fitBounds(bounds, { padding: [50, 50] });

  // Find the station marker and open its popup with directions info
  const station = markers.find(m => m.station && m.station.name === stationName);
  if (station) {
    // Create content with directions info including distance
    const content = `
      <div class="info-window">
        <h3>${stationName}</h3>
        <p><strong>Address:</strong> ${station.station.address}</p>
        <p><strong>Distance:</strong> ${formattedDistance} from your location</p>
        <a href="https://www.openstreetmap.org/directions?from=${userLocation.lat},${userLocation.lng}&to=${lat},${lng}"
           target="_blank" class="info-window-button">
          Get Detailed Directions
        </a>
      </div>
    `;

    // Update and open the popup
    station.setPopupContent(content);
    station.openPopup();

    // Update all station cards with distance information
    updateStationCardsWithDistance();
  }
}

// Update all station cards with distance information
function updateStationCardsWithDistance() {
  if (!userLocation) return;

  document.querySelectorAll('.station-card').forEach(card => {
    const lat = parseFloat(card.dataset.lat);
    const lng = parseFloat(card.dataset.lng);

    if (!isNaN(lat) && !isNaN(lng)) {
      const distance = calculateDistance(
        userLocation.lat, userLocation.lng,
        lat, lng
      );
      const formattedDistance = formatDistance(distance);

      // Check if distance element already exists
      let distanceElement = card.querySelector('.station-distance');

      if (!distanceElement) {
        // Create distance element if it doesn't exist
        distanceElement = document.createElement('p');
        distanceElement.className = 'station-distance';
        distanceElement.innerHTML = `<i class="fas fa-route"></i> <strong>Distance:</strong> <span>${formattedDistance}</span>`;

        // Insert after the timing element
        const timingElement = card.querySelector('p:nth-child(5)');
        if (timingElement) {
          timingElement.insertAdjacentElement('afterend', distanceElement);
        } else {
          // If timing element not found, insert before the actions
          const actionsElement = card.querySelector('.station-card-actions');
          if (actionsElement) {
            actionsElement.insertAdjacentElement('beforebegin', distanceElement);
          }
        }
      } else {
        // Update existing distance element
        const span = distanceElement.querySelector('span');
        if (span) span.textContent = formattedDistance;
      }
    }
  });
}

// Get user's location
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        // Add marker for user location
        const userMarker = L.marker([userLocation.lat, userLocation.lng], {
          title: 'Your Location',
          icon: L.divIcon({
            className: 'user-location-marker',
            html: '<div class="user-marker-inner"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(map);

        // Add to markers array for tracking
        markers.push(userMarker);

        // Bind popup to user marker
        userMarker.bindPopup('<strong>Your Location</strong>').openPopup();

        // Hide location request overlay
        document.getElementById('locationRequest').style.display = 'none';

        // Enable distance filter and nearest stations button
        document.getElementById('distanceFilter').disabled = false;
        document.getElementById('nearestStationsBtn').disabled = false;

        // Update all station cards with distance information
        updateStationCardsWithDistance();

        // Apply distance filter if it was already selected
        const distanceFilter = document.getElementById('distanceFilter');
        if (distanceFilter.value) {
          applyDistanceFilter();
        }

        // Check if we have pending directions request
        const pendingLat = sessionStorage.getItem('pendingDirectionLat');
        const pendingLng = sessionStorage.getItem('pendingDirectionLng');
        const pendingName = sessionStorage.getItem('pendingDirectionName');
        const openExternal = sessionStorage.getItem('pendingDirectionOpenExternal');

        if (pendingLat && pendingLng) {
          if (openExternal === 'true') {
            // Open external directions
            openExternalDirections(pendingLat, pendingLng);
          } else if (pendingName) {
            // Show directions on the map
            showDirectionsFromUser(pendingLat, pendingLng, pendingName);
          }

          // Clear pending request
          sessionStorage.removeItem('pendingDirectionLat');
          sessionStorage.removeItem('pendingDirectionLng');
          sessionStorage.removeItem('pendingDirectionName');
          sessionStorage.removeItem('pendingDirectionOpenExternal');
        }
      },
      (error) => {
        console.error('Error getting user location:', error);
        alert('Could not get your location. Please try again or enter your location manually.');
        document.getElementById('locationRequest').style.display = 'none';
      }
    );
  } else {
    alert('Geolocation is not supported by your browser.');
    document.getElementById('locationRequest').style.display = 'none';
  }
}

// Show no results message
function showNoResults() {
  const stationList = document.getElementById('stationList');
  if (stationList) {
    stationList.innerHTML = `
      <div class="no-results">
        <i class="fas fa-exclamation-circle"></i>
        <p>No charging stations found for this location.</p>
        <p>Try searching for a different district or state.</p>
      </div>
    `;
  }

  const resultsTitle = document.getElementById('resultsTitle');
  if (resultsTitle) {
    resultsTitle.textContent = "No Results Found";
  }

  const resultsStats = document.getElementById('resultsStats');
  if (resultsStats) {
    resultsStats.textContent = "";
  }

  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
}

// Show error message
function showError(message) {
  const stationList = document.getElementById('stationList');
  if (stationList) {
    stationList.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
      </div>
    `;
  }

  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
}

// Setup event listeners
function setupEventListeners() {
  // State filter change
  document.getElementById('stateFilter').addEventListener('change', (e) => {
    loadDistricts(e.target.value);
  });

  // Apply filters button
  document.getElementById('applyFilters').addEventListener('click', () => {
    const state = document.getElementById('stateFilter').value;
    const district = document.getElementById('districtFilter').value;
    const distance = document.getElementById('distanceFilter').value;

    // Update URL with new parameters without reloading the page
    const url = new URL(window.location);
    if (state) url.searchParams.set('state', state);
    else url.searchParams.delete('state');

    if (district) url.searchParams.set('district', district);
    else url.searchParams.delete('district');

    if (distance) url.searchParams.set('distance', distance);
    else url.searchParams.delete('distance');

    window.history.pushState({}, '', url);

    // Load stations with new filters
    loadStations(state, district);
  });

  // Allow location button
  document.getElementById('allowLocation').addEventListener('click', () => {
    getUserLocation();
  });

  // Deny location button
  document.getElementById('denyLocation').addEventListener('click', () => {
    document.getElementById('locationRequest').style.display = 'none';
  });

  // Distance filter change
  document.getElementById('distanceFilter').addEventListener('change', () => {
    applyDistanceFilter();
  });

  // Nearest stations button
  document.getElementById('nearestStationsBtn').addEventListener('click', () => {
    sortStationsByDistance();
  });

  // Pagination controls
  document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      displayStationsPage(currentPage);
    }
  });

  document.getElementById('nextPage').addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      displayStationsPage(currentPage);
    }
  });
}

// Open directions in external map
function openExternalDirections(lat, lng) {
  if (!userLocation) return;

  // Create URL for OpenStreetMap directions
  const url = `https://www.openstreetmap.org/directions?from=${userLocation.lat},${userLocation.lng}&to=${lat},${lng}`;

  // Open in new tab
  window.open(url, '_blank');
}

// Apply distance filter
function applyDistanceFilter() {
  if (!userLocation) {
    // If user location is not available, show location request
    document.getElementById('locationRequest').style.display = 'flex';
    return;
  }

  const distanceFilter = document.getElementById('distanceFilter');
  const maxDistance = parseInt(distanceFilter.value);

  if (!maxDistance) {
    // If no distance filter is selected, show all stations
    filteredStations = [...allStations];
  } else {
    // Filter stations by distance
    filteredStations = allStations.filter(station => {
      if (!station.latitude || !station.longitude) return false;

      const distance = calculateDistance(
        userLocation.lat, userLocation.lng,
        parseFloat(station.latitude), parseFloat(station.longitude)
      );

      return distance <= maxDistance;
    });
  }

  // Update results stats
  const resultsStats = document.getElementById('resultsStats');
  if (resultsStats) {
    resultsStats.textContent = `${filteredStations.length} stations found`;
  }

  // Reset pagination
  currentPage = 1;

  // Calculate total pages
  totalPages = Math.ceil(filteredStations.length / itemsPerPage);

  // Display first page of stations
  displayStationsPage(currentPage);
}

// Sort stations by distance from user
function sortStationsByDistance() {
  if (!userLocation) {
    // If user location is not available, show location request
    document.getElementById('locationRequest').style.display = 'flex';
    return;
  }

  // Sort stations by distance
  filteredStations.sort((a, b) => {
    if (!a.latitude || !a.longitude) return 1;
    if (!b.latitude || !b.longitude) return -1;

    const distanceA = calculateDistance(
      userLocation.lat, userLocation.lng,
      parseFloat(a.latitude), parseFloat(a.longitude)
    );

    const distanceB = calculateDistance(
      userLocation.lat, userLocation.lng,
      parseFloat(b.latitude), parseFloat(b.longitude)
    );

    return distanceA - distanceB;
  });

  // Reset pagination
  currentPage = 1;

  // Display first page of stations
  displayStationsPage(currentPage);
}

// Display a specific page of stations
function displayStationsPage(page) {
  const stationList = document.getElementById('stationList');
  stationList.innerHTML = '';

  // Calculate start and end indices
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredStations.length);

  // Get stations for current page
  const pageStations = filteredStations.slice(startIndex, endIndex);

  if (pageStations.length === 0) {
    stationList.innerHTML = `
      <div class="no-results">
        <i class="fas fa-exclamation-circle"></i>
        <p>No charging stations found for this location.</p>
        <p>Try searching for a different district or state.</p>
      </div>
    `;
  } else {
    // Create station cards for current page
    createStationCards(pageStations);
  }

  // Update pagination controls
  updatePaginationControls(page);
}

// Update pagination controls
function updatePaginationControls(page) {
  const prevButton = document.getElementById('prevPage');
  const nextButton = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');
  const paginationControls = document.getElementById('paginationControls');

  // Update page info
  pageInfo.textContent = `Page ${page} of ${totalPages}`;

  // Enable/disable previous button
  prevButton.disabled = page <= 1;

  // Enable/disable next button
  nextButton.disabled = page >= totalPages;

  // Show/hide pagination controls
  paginationControls.style.display = totalPages > 1 ? 'flex' : 'none';
}

// Make functions available globally
window.showDirectionsFromUser = showDirectionsFromUser;
window.openExternalDirections = openExternalDirections;
