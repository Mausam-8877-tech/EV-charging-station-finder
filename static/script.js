// Global variables
let markers = [];
let userLocation = null;
let selectedStation = null;
let map = null;
let directionsService = null;
let directionsRenderer = null;
let mapMarkers = [];

// Initialize the map (called by Google Maps API)
function initMap() {
  console.log("Google Maps initMap() called");

  try {
    // Check if map element exists
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error("Map element not found!");
      return;
    }

    // Create the map centered on Bihar, India
    map = new google.maps.Map(mapElement, {
      center: { lat: 26.0, lng: 87.5 },
      zoom: 8,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
          featureType: "administrative.locality",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "poi",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "poi.park",
          elementType: "geometry",
          stylers: [{ color: "#263c3f" }],
        },
        {
          featureType: "poi.park",
          elementType: "labels.text.fill",
          stylers: [{ color: "#6b9a76" }],
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#38414e" }],
        },
        {
          featureType: "road",
          elementType: "geometry.stroke",
          stylers: [{ color: "#212a37" }],
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#9ca5b3" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry",
          stylers: [{ color: "#746855" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry.stroke",
          stylers: [{ color: "#1f2835" }],
        },
        {
          featureType: "road.highway",
          elementType: "labels.text.fill",
          stylers: [{ color: "#f3d19c" }],
        },
        {
          featureType: "transit",
          elementType: "geometry",
          stylers: [{ color: "#2f3948" }],
        },
        {
          featureType: "transit.station",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#17263c" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#515c6d" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#17263c" }],
        },
      ]
    });

    console.log("Map created successfully");

    // Initialize directions service and renderer
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#00ffcc",
        strokeWeight: 5,
        strokeOpacity: 0.7
      }
    });

    console.log("Directions service initialized");

    // Add test markers for Bihar stations
    addTestMarkers();
  } catch (error) {
    console.error("Error initializing map:", error);
  }

  // Add event listeners for the location request buttons
  document.getElementById('allowLocation').addEventListener('click', () => {
    document.getElementById('locationRequest').style.display = 'none';
    getLocation();
  });

  document.getElementById('denyLocation').addEventListener('click', () => {
    document.getElementById('locationRequest').style.display = 'none';
    if (selectedStation) {
      showStationOnMap(selectedStation);
    }
  });
}

// Add test markers for Bihar stations
function addTestMarkers() {
  console.log("Adding test markers for Bihar stations");

  const biharStations = [
    {
      name: "IOCL - Jawaid Charging Station",
      lat: 26.1234,
      lng: 87.4567,
      address: "Jawaid Fuel Centre, Barbana Sh-77 Po-Meriganjps-Raniganj",
      services: "Bharat AC001AC TYPE 2",
      timing: "12:00 AM - 11:59 PM"
    },
    {
      name: "IOCL - Kalyani Charging Station",
      lat: 26.0547,
      lng: 87.3221,
      address: "Maa Kalyani Fuel Centre, Mauza-Raniganj On Nh-327E Bet Reshamlal Chowk & Raniganj",
      services: "Bharat AC001AC TYPE 2",
      timing: "12:00 AM - 11:59 PM"
    },
    {
      name: "HPCL - MS FIZA Charging Station",
      lat: 26.1237,
      lng: 87.4112,
      address: "SH76, Majkuri",
      services: "AC TYPE 2",
      timing: "12:00 AM - 11:59 PM"
    }
  ];

  // Add markers to the map
  biharStations.forEach((station, index) => {
    console.log(`Adding test marker ${index} at [${station.lat}, ${station.lng}]`);

    // Create marker position
    const position = { lat: station.lat, lng: station.lng };

    // Create marker
    const mapMarker = new google.maps.Marker({
      position: position,
      map: map,
      title: station.name,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      },
      animation: google.maps.Animation.DROP
    });

    // Add marker to tracking array
    mapMarkers.push(mapMarker);

    // Create info window content
    const contentString = `
      <div class="station-info">
        <h3>${station.name}</h3>
        <p><strong>Address:</strong> ${station.address}</p>
        <p><strong>Services:</strong> ${station.services}</p>
        <p><strong>Timing:</strong> ${station.timing}</p>
        <div class="station-info-actions">
          <button class="station-info-button" onclick="getDirectionsToStation('${station.name}')">
            <i class="fas fa-directions"></i> Get Directions
          </button>
        </div>
      </div>
    `;

    // Create info window
    const infoWindow = new google.maps.InfoWindow({
      content: contentString
    });

    // Add click event to marker
    mapMarker.addListener('click', () => {
      // Close any open info windows
      mapMarkers.forEach(m => {
        if (m.infoWindow) {
          m.infoWindow.close();
        }
      });

      // Open this info window
      infoWindow.open(map, mapMarker);

      // Store reference to the info window
      mapMarker.infoWindow = infoWindow;
    });

    // Store the station data with the marker
    mapMarker.station = station;

    // Add to markers array for later use
    markers.push(station);
  });

  // Create a bounds object to fit all markers
  const bounds = new google.maps.LatLngBounds();

  // Extend bounds to include all markers
  mapMarkers.forEach(marker => {
    bounds.extend(marker.getPosition());
  });

  // Fit the map to the bounds
  map.fitBounds(bounds);

  // Add some padding by zooming out slightly
  google.maps.event.addListenerOnce(map, 'bounds_changed', function() {
    if (map.getZoom() > 10) {
      map.setZoom(10);
    }
  });

  console.log("Test markers added successfully");
}

// Request user's location
function requestLocation() {
  // Show the location request overlay
  document.getElementById('locationRequest').style.display = 'flex';
}

// Get user's location
function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      // Success callback
      (position) => {
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log("User location:", userLocation);

        // Add a marker for the user's location
        addUserLocationMarker();

        // If a station is already selected, show directions
        if (selectedStation) {
          showDirections(userLocation, selectedStation);
        }
      },
      // Error callback
      (error) => {
        console.error("Error getting location:", error);
        alert("Could not get your location. Please check your browser settings and try again.");

        // If a station is already selected, just show it on the map
        if (selectedStation) {
          showStationOnMap(selectedStation);
        }
      },
      // Options
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  } else {
    alert("Geolocation is not supported by this browser.");

    // If a station is already selected, just show it on the map
    if (selectedStation) {
      showStationOnMap(selectedStation);
    }
  }
}

// Clear all markers from the map
function clearMarkers() {
  // Remove all markers from the map
  mapMarkers.forEach(marker => {
    marker.setMap(null);
  });

  // Clear the markers array
  mapMarkers = [];
  console.log("All markers cleared from map");
}

// Add a marker for the user's location
function addUserLocationMarker() {
  if (!userLocation || !map) return;

  // Clear any existing user location marker
  clearMarkers();

  // Create a marker for the user's location
  const marker = new google.maps.Marker({
    position: userLocation,
    map: map,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#4285F4',
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      scale: 8
    },
    title: 'Your Location',
    zIndex: 1000
  });

  // Add the marker to our tracking array
  mapMarkers.push(marker);

  // Create an info window
  const infoWindow = new google.maps.InfoWindow({
    content: '<strong>Your Location</strong>'
  });

  // Open the info window
  infoWindow.open(map, marker);

  // Add click listener to marker
  marker.addListener('click', () => {
    infoWindow.open(map, marker);
  });

  // Center the map on the user's location
  map.setCenter(userLocation);
  map.setZoom(12);

  console.log("User location marker added to map");
}

// Show a station on the map
function showStationOnMap(station) {
  if (!map || !station || !station.lat || !station.lng) {
    console.error("Cannot show station on map:", station);
    return;
  }

  console.log("Showing station on map:", station);

  // Clear existing markers
  clearMarkers();

  // Create a marker for the station
  const marker = new google.maps.Marker({
    position: { lat: station.lat, lng: station.lng },
    map: map,
    icon: {
      url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
      scaledSize: new google.maps.Size(32, 32)
    },
    title: station.name,
    animation: google.maps.Animation.DROP
  });

  // Add the marker to our tracking array
  mapMarkers.push(marker);

  // Create info window content
  const contentString = `
    <div class="station-info">
      <h3>${station.name}</h3>
      <p><strong>Address:</strong> ${station.address}</p>
      <p><strong>Services:</strong> ${station.services}</p>
      <p><strong>Timing:</strong> ${station.timing}</p>
      <div class="station-info-actions">
        <button class="station-info-button" onclick="getDirectionsToStation()">
          <i class="fas fa-directions"></i> Get Directions
        </button>
      </div>
    </div>
  `;

  // Create an info window
  const infoWindow = new google.maps.InfoWindow({
    content: contentString
  });

  // Open the info window
  infoWindow.open(map, marker);

  // Add click listener to marker
  marker.addListener('click', () => {
    infoWindow.open(map, marker);
  });

  // Center the map on the station
  map.setCenter({ lat: station.lat, lng: station.lng });
  map.setZoom(15);

  console.log("Station marker added to map");
}

// Show directions from user location to station
function showDirections(from, to) {
  if (!map || !directionsService || !directionsRenderer || !to || !to.lat || !to.lng) {
    console.error("Cannot show directions:", { map, directionsService, directionsRenderer, to });
    return;
  }

  console.log("Showing directions from", from, "to", to);

  // If we don't have the user's location, we can't show directions
  if (!from) {
    alert("Your location is needed to show directions. Please allow location access.");
    requestLocation();
    return;
  }

  // Clear existing markers but add them back after directions are shown
  const stationPosition = { lat: to.lat, lng: to.lng };
  clearMarkers();

  // Create request for directions
  const request = {
    origin: from,
    destination: stationPosition,
    travelMode: google.maps.TravelMode.DRIVING
  };

  // Get directions
  directionsService.route(request, (result, status) => {
    if (status === google.maps.DirectionsStatus.OK) {
      // Display the route on the map
      directionsRenderer.setDirections(result);

      // Add markers for origin and destination
      // User location marker
      const userMarker = new google.maps.Marker({
        position: from,
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          scale: 8
        },
        title: 'Your Location'
      });

      // Station marker
      const stationMarker = new google.maps.Marker({
        position: stationPosition,
        map: map,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
          scaledSize: new google.maps.Size(32, 32)
        },
        title: to.name
      });

      // Add markers to tracking array
      mapMarkers.push(userMarker);
      mapMarkers.push(stationMarker);

      // Get route information
      const route = result.routes[0].legs[0];
      console.log("Route information:", route);

      // Create info window with route information
      const infoContent = `
        <div class="directions-info">
          <h3>Directions to ${to.name}</h3>
          <p><strong>Distance:</strong> ${route.distance.text}</p>
          <p><strong>Duration:</strong> ${route.duration.text}</p>
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({
        content: infoContent
      });

      // Open info window on the station marker
      infoWindow.open(map, stationMarker);

      // Add click listener to station marker
      stationMarker.addListener('click', () => {
        infoWindow.open(map, stationMarker);
      });

      console.log("Directions displayed successfully");
    } else {
      console.error("Directions request failed:", status);
      alert("Could not calculate directions. Please try again.");

      // Show the station on the map instead
      showStationOnMap(to);
    }
  });
}



document.addEventListener("DOMContentLoaded", () => {
  // Initialize the map
  initMap();

  // DOM elements
  const searchInput = document.getElementById("searchInput");
  const searchClear = document.getElementById("searchClear");
  const suggestionsContainer = document.getElementById("suggestionsContainer");
  const selectedLocation = document.getElementById("selectedLocation");
  const searchBtn = document.getElementById("searchBtn");
  const resultsSection = document.getElementById("resultsSection");
  const resultsTitle = document.getElementById("resultsTitle");
  const resultsStats = document.getElementById("resultsStats");
  const stationList = document.getElementById("stationList");
  const stateDropdown = document.getElementById("stateDropdown");
  const districtDropdown = document.getElementById("districtDropdown");

  // State variables
  let debounceTimer;
  let selectedState = "";
  let selectedDistrict = "";

  // Initialize by loading all states
  loadStates();

  // Event listeners
  searchInput.addEventListener("input", handleSearchInput);
  searchClear.addEventListener("click", clearSearch);
  searchBtn.addEventListener("click", redirectToStationsPage);
  stateDropdown.addEventListener("change", handleStateChange);
  districtDropdown.addEventListener("change", handleDistrictChange);
  document.addEventListener("click", (e) => {
    // Close suggestions when clicking outside
    if (!suggestionsContainer.contains(e.target) && e.target !== searchInput) {
      suggestionsContainer.style.display = "none";
    }
  });

  // Load all states into the state dropdown
  async function loadStates() {
    try {
      const response = await fetch("https://sajan2288.pythonanywhere.com/api/states");
      const states = await response.json();

      // Clear existing options except the first one
      stateDropdown.innerHTML = '<option value="">Select State</option>';

      // Add states to dropdown
      states.forEach(state => {
        const option = document.createElement("option");
        option.value = state;
        option.textContent = state;
        stateDropdown.appendChild(option);
      });
    } catch (error) {
      console.error("Error loading states:", error);
    }
  }

  // Handle state dropdown change
  function handleStateChange() {
    const state = stateDropdown.value;

    // Reset district dropdown
    districtDropdown.innerHTML = '<option value="">Select District</option>';

    if (state) {
      // Enable district dropdown and load districts for selected state
      districtDropdown.disabled = false;
      selectedState = state;
      loadDistricts(state);

      // Update search input and selected location
      searchInput.value = state;
      updateSelectedLocation();
    } else {
      // Disable district dropdown if no state is selected
      districtDropdown.disabled = true;
      selectedState = "";
      selectedDistrict = "";
      updateSelectedLocation();
    }
  }

  // Load districts for a selected state
  async function loadDistricts(state) {
    try {
      const response = await fetch(`https://sajan2288.pythonanywhere.com/api/districts?state=${encodeURIComponent(state)}`);
      const districts = await response.json();

      // Add districts to dropdown
      districts.forEach(district => {
        const option = document.createElement("option");
        option.value = district;
        option.textContent = district;
        districtDropdown.appendChild(option);
      });
    } catch (error) {
      console.error("Error loading districts:", error);
    }
  }

  // Handle district dropdown change
  function handleDistrictChange() {
    const district = districtDropdown.value;

    if (district) {
      selectedDistrict = district;
      // Update search input and selected location
      searchInput.value = district;
      updateSelectedLocation();

      // Automatically trigger search when district is selected
      console.log(`District selected: ${district}, triggering search...`);

      // Add a small delay to ensure the UI is updated before searching
      setTimeout(() => {
        findStations();
      }, 100);
    } else {
      selectedDistrict = "";
      updateSelectedLocation();
    }
  }

  // Update the selected location display
  function updateSelectedLocation() {
    if (selectedState || selectedDistrict) {
      let locationText = "";
      let locationTitle = "";

      if (selectedDistrict && selectedState) {
        locationText = `${selectedDistrict}, ${selectedState}`;
        locationTitle = "Selected Location";
      } else if (selectedState) {
        locationText = selectedState;
        locationTitle = "Selected State";
      } else if (selectedDistrict) {
        locationText = selectedDistrict;
        locationTitle = "Selected District";
      }

      selectedLocation.innerHTML = `
        <div class="selected-location-title">${locationTitle}</div>
        <div class="selected-location-content">
          <div class="selected-location-text">${locationText}</div>
          <div class="selected-location-remove" id="removeLocation">×</div>
        </div>
      `;

      // Add event listener to the remove button
      document.getElementById("removeLocation").addEventListener("click", clearSearch);
      selectedLocation.style.display = "block";
      searchClear.style.display = "block";
    } else {
      selectedLocation.style.display = "none";
      searchClear.style.display = "none";
    }
  }

  // Handle search input with debounce
  function handleSearchInput() {
    const query = searchInput.value.trim();

    // Show/hide clear button
    searchClear.style.display = query ? "block" : "none";

    // Clear previous timer
    clearTimeout(debounceTimer);

    if (query.length > 0) {
      // Set new timer
      debounceTimer = setTimeout(() => {
        fetchSuggestions(query);
      }, 300);
    } else {
      suggestionsContainer.style.display = "none";
    }
  }

  // Clear search input and reset state
  function clearSearch() {
    searchInput.value = "";
    searchClear.style.display = "none";
    suggestionsContainer.style.display = "none";
    selectedLocation.style.display = "none";
    selectedState = "";
    selectedDistrict = "";

    // Reset dropdowns
    stateDropdown.value = "";
    districtDropdown.value = "";
    districtDropdown.disabled = true;

    searchInput.focus();
  }

  // Fetch suggestions from API
  async function fetchSuggestions(query) {
    try {
      const response = await fetch(`https://sajan2288.pythonanywhere.com/api/suggestions?query=${encodeURIComponent(query)}`);
      const data = await response.json();

      if ((data.states && data.states.length > 0) || (data.districts && data.districts.length > 0)) {
        displaySuggestions(data);
      } else {
        suggestionsContainer.style.display = "none";
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  }

  // Display suggestions in the dropdown
  function displaySuggestions(data) {
    suggestionsContainer.innerHTML = "";

    // Add states section if there are matching states
    if (data.states && data.states.length > 0) {
      const statesGroup = document.createElement("div");
      statesGroup.className = "suggestion-group";

      const statesTitle = document.createElement("div");
      statesTitle.className = "suggestion-group-title";
      statesTitle.textContent = "States";
      statesGroup.appendChild(statesTitle);

      data.states.forEach(state => {
        const item = document.createElement("div");
        item.className = "suggestion-item";
        item.innerHTML = `<i class="fas fa-map"></i> ${state}`;
        item.addEventListener("click", () => {
          selectState(state);
        });
        statesGroup.appendChild(item);
      });

      suggestionsContainer.appendChild(statesGroup);
    }

    // Add districts section if there are matching districts
    if (data.districts && data.districts.length > 0) {
      const districtsGroup = document.createElement("div");
      districtsGroup.className = "suggestion-group";

      const districtsTitle = document.createElement("div");
      districtsTitle.className = "suggestion-group-title";
      districtsTitle.textContent = "Districts";
      districtsGroup.appendChild(districtsTitle);

      data.districts.forEach(item => {
        const districtItem = document.createElement("div");
        districtItem.className = "suggestion-item";
        districtItem.innerHTML = `
          <i class="fas fa-location-dot"></i>
          ${item.district}
          <span class="suggestion-state">${item.state}</span>
        `;
        districtItem.addEventListener("click", () => {
          selectDistrict(item.state, item.district);
        });
        districtsGroup.appendChild(districtItem);
      });

      suggestionsContainer.appendChild(districtsGroup);
    }

    // Show suggestions container
    suggestionsContainer.style.display = "block";
  }

  // Select a state from suggestions
  function selectState(state) {
    selectedState = state;
    selectedDistrict = "";
    searchInput.value = state;
    suggestionsContainer.style.display = "none";
    searchClear.style.display = "block";

    // Update state dropdown
    stateDropdown.value = state;

    // Reset and enable district dropdown
    districtDropdown.innerHTML = '<option value="">Select District</option>';
    districtDropdown.disabled = false;

    // Update selected location UI
    updateSelectedLocation();

    // Fetch districts for this state
    fetchDistrictsForState(state);
    loadDistricts(state);
  }

  // Select a district from suggestions
  function selectDistrict(state, district) {
    selectedState = state;
    selectedDistrict = district;
    searchInput.value = district;
    suggestionsContainer.style.display = "none";
    searchClear.style.display = "block";

    // Update state dropdown
    stateDropdown.value = state;

    // Enable and update district dropdown
    districtDropdown.disabled = false;

    // We need to load the districts first, then set the selected one
    loadDistricts(state).then(() => {
      // Set timeout to ensure districts are loaded
      setTimeout(() => {
        districtDropdown.value = district;

        // Update selected location UI
        updateSelectedLocation();

        // Automatically trigger search when district is selected
        findStations();
      }, 300);
    });
  }

  // Fetch districts for a specific state
  async function fetchDistrictsForState(state) {
    try {
      const response = await fetch(`https://sajan2288.pythonanywhere.com/api/districts?state=${encodeURIComponent(state)}`);
      const districts = await response.json();

      if (districts && districts.length > 0) {
        displayDistrictSuggestions(state, districts);
      }
    } catch (error) {
      console.error("Error fetching districts:", error);
    }
  }

  // Display district suggestions for a selected state
  function displayDistrictSuggestions(state, districts) {
    suggestionsContainer.innerHTML = "";

    const districtsGroup = document.createElement("div");
    districtsGroup.className = "suggestion-group";

    const districtsTitle = document.createElement("div");
    districtsTitle.className = "suggestion-group-title";
    districtsTitle.textContent = `Districts in ${state}`;
    districtsGroup.appendChild(districtsTitle);

    districts.forEach(district => {
      const item = document.createElement("div");
      item.className = "suggestion-item";
      item.innerHTML = `<i class="fas fa-location-dot"></i> ${district}`;
      item.addEventListener("click", () => {
        selectDistrict(state, district);
      });
      districtsGroup.appendChild(item);
    });

    suggestionsContainer.appendChild(districtsGroup);
    suggestionsContainer.style.display = "block";
  }

  // Function to add markers to the map
  function addMarkersToMap(stations) {
    console.log("addMarkersToMap called with stations:", stations);

    // Clear existing markers
    clearMarkers();

    // Check if we have valid stations with coordinates
    const validStations = stations.filter(station => {
      console.log("Checking station:", station);
      console.log("Latitude:", station.latitude, "type:", typeof station.latitude);
      console.log("Longitude:", station.longitude, "type:", typeof station.longitude);

      return station.latitude && station.longitude &&
        !isNaN(parseFloat(station.latitude)) &&
        !isNaN(parseFloat(station.longitude));
    });

    if (validStations.length === 0) {
      console.log("No valid coordinates found in stations data");
      return;
    }

    console.log(`Found ${validStations.length} stations with valid coordinates:`, validStations);

    // Create marker objects from station data
    markers = validStations.map(station => {
      const marker = {
        name: station.name || station["Station Name"],
        lat: parseFloat(station.latitude),
        lng: parseFloat(station.longitude),
        address: station.address || station.Address,
        services: station.services || station.Services,
        timing: station.timing || station["Final Timing"]
      };
      console.log("Created marker:", marker);
      return marker;
    });

    // If we have markers, add them to the map
    if (markers.length > 0 && map) {
      console.log("Adding markers to map. Map object exists:", !!map);

      // Create bounds to fit all markers
      const bounds = new google.maps.LatLngBounds();

      // Add markers to the map
      markers.forEach((marker, index) => {
        console.log(`Adding marker ${index} at [${marker.lat}, ${marker.lng}]`);

        try {
          // Create marker position
          const position = { lat: marker.lat, lng: marker.lng };

          // Create marker
          const mapMarker = new google.maps.Marker({
            position: position,
            map: map,
            title: marker.name,
            icon: {
              url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
              scaledSize: new google.maps.Size(32, 32)
            },
            animation: google.maps.Animation.DROP
          });

          // Add marker to tracking array
          mapMarkers.push(mapMarker);

          console.log(`Marker ${index} added to map`);

          // Create info window content
          const contentString = `
            <div class="station-info">
              <h3>${marker.name}</h3>
              <p><strong>Address:</strong> ${marker.address}</p>
              <p><strong>Services:</strong> ${marker.services}</p>
              <p><strong>Timing:</strong> ${marker.timing}</p>
              <div class="station-info-actions">
                <button class="station-info-button" onclick="window.showStationDetails('${marker.name}')">
                  <i class="fas fa-info-circle"></i> Details
                </button>
              </div>
            </div>
          `;

          // Create info window
          const infoWindow = new google.maps.InfoWindow({
            content: contentString
          });

          // Add click event to marker
          mapMarker.addListener('click', () => {
            // Close any open info windows
            mapMarkers.forEach(m => {
              if (m.infoWindow) {
                m.infoWindow.close();
              }
            });

            // Open this info window
            infoWindow.open(map, mapMarker);

            // Store reference to the info window
            mapMarker.infoWindow = infoWindow;

            // Highlight the corresponding card
            highlightCard(marker.name);
          });

          // Extend bounds to include this marker
          bounds.extend(position);
          console.log(`Bounds extended to include marker ${index}`);
        } catch (error) {
          console.error(`Error adding marker ${index}:`, error);
        }
      });

      // Fit the map to the bounds with some padding
      try {
        console.log("Fitting map to bounds");
        map.fitBounds(bounds);

        // Add some padding by zooming out slightly
        google.maps.event.addListenerOnce(map, 'bounds_changed', function() {
          if (map.getZoom() > 15) {
            map.setZoom(15);
          }
        });

        console.log("Map fitted to bounds");
      } catch (error) {
        console.error("Error fitting map to bounds:", error);
      }
    } else {
      console.log("No markers to add to map or map not initialized", {
        markersLength: markers.length,
        mapExists: !!map
      });
    }
  }

  // Clear all markers from the map
  function clearMarkers() {
    // Clear the markers array
    markers = [];

    // Remove all Google Maps markers from the map
    if (mapMarkers && mapMarkers.length > 0) {
      mapMarkers.forEach(marker => {
        if (marker) {
          marker.setMap(null);
        }
      });
      // Clear the mapMarkers array
      mapMarkers = [];
    }

    console.log("All markers cleared");
  }

// Make showStationDetails available globally
window.showStationDetails = function(stationName) {
  console.log("showStationDetails called with stationName:", stationName);

  // Find the station in the markers array
  const station = markers.find(m => m.name === stationName);
  console.log("Found station:", station);

  if (station) {
    // Store the selected station
    selectedStation = station;

    // Highlight the card
    highlightCard(station.name);

    // If we already have the user's location, show directions
    if (userLocation) {
      showDirections(userLocation, station);
    } else {
      // Otherwise, just show the station on the map
      showStationOnMap(station);
    }
  } else {
    console.error("Station not found with name:", stationName);
  }
};

// Make getDirectionsToStation available globally
window.getDirectionsToStation = function(stationName) {
  console.log("getDirectionsToStation called with stationName:", stationName);

  // Find the station by name
  let station = null;
  if (stationName) {
    station = markers.find(m => m.name === stationName);
  } else if (selectedStation) {
    station = selectedStation;
  }

  if (!station) {
    console.error("No station found for directions");
    return;
  }

  // Store the selected station
  selectedStation = station;

  console.log("Getting directions to station:", selectedStation);

  if (userLocation) {
    // If we already have the user's location, show directions
    showDirections(userLocation, selectedStation);
  } else {
    // Otherwise, request the user's location
    requestLocation();
  }
};

  // Highlight the card in the station list
  function highlightCard(stationName) {
    if (!stationName) return;

    // Remove highlight from all cards
    const cards = stationList.querySelectorAll('.station-card');
    cards.forEach(card => card.classList.remove('highlighted'));

    // Find and highlight the matching card
    cards.forEach(card => {
      const cardTitle = card.querySelector('h3').textContent;
      if (cardTitle === stationName) {
        card.classList.add('highlighted');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  // Redirect to stations page with selected state and district
  function redirectToStationsPage() {
    console.log("redirectToStationsPage() called");

    // Validate input
    if (!selectedDistrict && !selectedState) {
      if (searchInput.value.trim()) {
        // Try to use the search input as district
        selectedDistrict = searchInput.value.trim();
        console.log("Using search input as district:", selectedDistrict);
      } else {
        console.log("No location selected or entered");
        alert("Please select a state, district, or enter a location name.");
        return;
      }
    }

    // Build URL with query parameters
    let url = "stations.html";
    const params = new URLSearchParams();

    if (selectedState) {
      params.append("state", selectedState);
    }

    if (selectedDistrict) {
      params.append("district", selectedDistrict);
    }

    // Add parameters to URL if any exist
    if (params.toString()) {
      url += "?" + params.toString();
    }

    // Redirect to stations page
    console.log("Redirecting to:", url);
    window.location.href = url;
  }

  // Find stations based on selected location (kept for backward compatibility)
  async function findStations() {
    console.log("findStations() called");
    stationList.innerHTML = "";
    resultsSection.style.display = "none";

    // Validate input
    if (!selectedDistrict) {
      if (searchInput.value.trim()) {
        // Try to use the search input as district
        selectedDistrict = searchInput.value.trim();
        console.log("Using search input as district:", selectedDistrict);
      } else {
        console.log("No district selected or entered");
        alert("Please select a district or enter a location name.");
        return;
      }
    }

    try {
      // Build API URL with parameters
      let apiUrl = `https://sajan2288.pythonanywhere.com/api/stations?city=${encodeURIComponent(selectedDistrict)}`;
      if (selectedState) {
        apiUrl += `&state=${encodeURIComponent(selectedState)}`;
      }

      console.log("Fetching stations from:", apiUrl);
      console.log("Selected district:", selectedDistrict);
      console.log("Selected state:", selectedState);

      // First, check if the API is working
      const testResponse = await fetch("/test");
      const testData = await testResponse.json();
      console.log("Test API response:", testData);

      // Now fetch the stations
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("API response:", data);
      console.log("Number of stations returned:", data.length);

      if (!data || data.length === 0) {
        stationList.innerHTML = `
          <div class="no-results">
            <i class="fas fa-exclamation-circle"></i>
            <p>No charging stations found for this location.</p>
            <p>Try searching for a different district or state.</p>
          </div>
        `;
        resultsTitle.textContent = "No Results Found";
        resultsStats.textContent = "";

        // Clear map markers
        clearMarkers();
      } else {
        // Update results title and stats
        resultsTitle.textContent = selectedState
          ? `Charging Stations in ${selectedDistrict}, ${selectedState}`
          : `Charging Stations in ${selectedDistrict}`;
        resultsStats.textContent = `${data.length} stations found`;

        // Add markers to map
        console.log("Before adding markers to map, data:", JSON.stringify(data));
        addMarkersToMap(data);
        console.log("After adding markers to map, markers:", markers);

        // Create station cards
        data.forEach(station => {
          const card = document.createElement("div");
          card.className = "station-card";
          card.dataset.stationName = station.name;

          // Get station name from either format
          const stationName = station["Station Name"] || station.name;
          const address = station.Address || station.address;
          // Make sure contact is a string and handle NaN values
          const contact = (station.Contact && station.Contact !== "NaN") ? station.Contact :
                         (station.contact && station.contact !== "NaN") ? station.contact : "N/A";
          const services = station.Services || station.services || "N/A";
          const timing = station["Final Timing"] || station.timing || "N/A";

          // Check if we have coordinates
          const hasCoordinates = station.latitude && station.longitude &&
                               !isNaN(parseFloat(station.latitude)) &&
                               !isNaN(parseFloat(station.longitude));

          card.innerHTML = `
            <h3>${stationName}</h3>
            <p><strong>Address:</strong> ${address}</p>
            <p><strong>Contact:</strong> ${contact}</p>
            <p><strong>Services:</strong> ${services}</p>
            <p><strong>Timing:</strong> ${timing}</p>
            <div class="station-card-actions">
              ${contact !== "N/A" ?
                `<button class="station-card-button">
                  <i class="fas fa-phone"></i> Call
                </button>` : ''}
              ${hasCoordinates ?
                `<button class="station-card-button primary view-on-map" data-lat="${station.latitude}" data-lng="${station.longitude}">
                  <i class="fas fa-map-marker-alt"></i> View on Map
                </button>` : ''}
            </div>
          `;
          stationList.appendChild(card);

          // Add event listener to "View on Map" button
          if (hasCoordinates) {
            const mapBtn = card.querySelector('.view-on-map');
            mapBtn.addEventListener('click', () => {
              const lat = parseFloat(mapBtn.dataset.lat);
              const lng = parseFloat(mapBtn.dataset.lng);

              // Find the corresponding marker
              const marker = markers.find(m =>
                m.lat === lat &&
                m.lng === lng
              );

              if (marker) {
                // Highlight the card
                highlightCard(marker.name);

                // Store the selected station
                selectedStation = marker;

                // If we already have user location, show directions
                if (userLocation) {
                  showDirections(userLocation, selectedStation);
                } else {
                  // Request user location permission
                  requestLocation();
                }
              }
            });
          }
        });
      }

      // Show results section
      resultsSection.style.display = "block";

      // Scroll to results
      resultsSection.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
      console.error("Error fetching stations:", error);
      stationList.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Something went wrong. Please try again later.</p>
        </div>
      `;
      resultsSection.style.display = "block";

      // Clear map markers
      clearMarkers();
    }
  }
});
