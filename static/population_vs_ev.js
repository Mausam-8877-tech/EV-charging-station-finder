// Global variables
let chart = null;
let chartData = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  // Load states
  loadStates();

  // Set up event listeners
  setupEventListeners();

  // Hide loading indicator initially
  document.getElementById('loadingIndicator').style.display = 'none';

  // Set up district search functionality
  setupDistrictSearch();
});

// Load states from API
async function loadStates() {
  try {
    const response = await fetch('https://sajan2288.pythonanywhere.com/api/states');
    const states = await response.json();

    const stateFilter = document.getElementById('stateFilter');

    // Sort states alphabetically
    states.sort();

    // Add states to dropdown
    states.forEach(state => {
      const option = document.createElement('option');
      option.value = state;
      option.textContent = state;
      stateFilter.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading states:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // State filter change
  document.getElementById('stateFilter').addEventListener('change', (e) => {
    const state = e.target.value;
    const districtFilter = document.getElementById('districtFilter');

    if (state) {
      // Load districts for the selected state
      loadDistricts(state);
      districtFilter.disabled = false;
    } else {
      // Clear and disable district filter if no state is selected
      districtFilter.innerHTML = '<option value="">All Districts</option>';
      districtFilter.disabled = true;
    }
  });

  // Apply filters button
  document.getElementById('applyFilters').addEventListener('click', () => {
    const state = document.getElementById('stateFilter').value;
    const district = document.getElementById('districtFilter').value;

    if (!state) {
      alert('Please select a state');
      return;
    }

    // Load data and generate chart
    loadPopulationVsEVData(state, district);
  });
}

// Load districts for a selected state
async function loadDistricts(state) {
  try {
    const response = await fetch(`https://sajan2288.pythonanywhere.com/api/districts?state=${encodeURIComponent(state)}`);
    const districts = await response.json();

    const districtFilter = document.getElementById('districtFilter');

    // Clear existing options
    districtFilter.innerHTML = '<option value="">All Districts</option>';

    // Sort districts alphabetically
    districts.sort();

    // Add districts to dropdown
    districts.forEach(district => {
      const option = document.createElement('option');
      option.value = district;
      option.textContent = district;
      districtFilter.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading districts:', error);
  }
}

// Load population vs EV data
async function loadPopulationVsEVData(state, district = '') {
  // Show loading indicator
  document.getElementById('loadingIndicator').style.display = 'flex';
  document.getElementById('chartWrapper').style.display = 'none';
  document.getElementById('noDataMessage').style.display = 'none';
  document.getElementById('dataTableContainer').style.display = 'none';
  document.getElementById('districtSummaryCard').style.display = 'none';

  try {
    const response = await fetch(`https://sajan2288.pythonanywhere.com/api/population-vs-ev?state=${encodeURIComponent(state)}`);
    const data = await response.json();

    // Store data globally
    chartData = data;

    // Check if we have data
    if (data.length === 0) {
      // Show no data message
      document.getElementById('loadingIndicator').style.display = 'none';
      document.getElementById('noDataMessage').style.display = 'flex';
      document.getElementById('chartTitle').textContent = `No data available for ${state}`;
      return;
    }

    // If a specific district is selected, show the district summary card
    if (district) {
      const districtData = data.find(item => item.district.toLowerCase() === district.toLowerCase());

      if (districtData) {
        updateDistrictSummary(districtData);
        document.getElementById('districtSummaryCard').style.display = 'block';
      }
    }

    // Generate chart
    generateChart(data, state, district);

    // Generate data table
    generateDataTable(data);

    // Update chart title
    let titleText = `Population vs EV Stations in ${state}`;
    if (district) {
      titleText += ` (Highlighting ${district})`;
    }
    document.getElementById('chartTitle').textContent = titleText;

    // Update chart stats
    const totalPopulation = data.reduce((sum, item) => sum + item.population, 0);
    const totalStations = data.reduce((sum, item) => sum + item.ev_stations, 0);
    const formattedPopulation = totalPopulation.toLocaleString();
    const stationsPerMillion = totalPopulation > 0
      ? ((totalStations / totalPopulation) * 1000000).toFixed(2)
      : 'N/A';

    document.getElementById('chartStats').textContent =
      `Total Population: ${formattedPopulation} | Total EV Stations: ${totalStations} | Stations per Million: ${stationsPerMillion}`;

    // Hide loading indicator
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('chartWrapper').style.display = 'block';
    document.getElementById('dataTableContainer').style.display = 'block';
  } catch (error) {
    console.error('Error loading population vs EV data:', error);
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('noDataMessage').style.display = 'flex';
  }
}

// Update district summary card
function updateDistrictSummary(districtData) {
  document.getElementById('districtName').textContent = districtData.district;
  document.getElementById('districtPopulation').textContent = districtData.population.toLocaleString();
  document.getElementById('districtEVStations').textContent = districtData.ev_stations;

  const stationsPerMillion = districtData.population > 0
    ? ((districtData.ev_stations / districtData.population) * 1000000).toFixed(2)
    : 'N/A';

  document.getElementById('districtRatio').textContent = stationsPerMillion;
}

// Generate chart
function generateChart(data, state, selectedDistrict = '') {
  // Destroy existing chart if it exists
  if (chart) {
    chart.destroy();
  }

  // Get canvas context
  const ctx = document.getElementById('populationVsEVChart').getContext('2d');

  // Prepare data for chart
  const districts = data.map(item => item.district);
  const populations = data.map(item => item.population);
  const evStations = data.map(item => item.ev_stations);

  // Calculate stations per million people for each district
  const stationsPerMillion = data.map(item =>
    item.population > 0 ? (item.ev_stations / item.population) * 1000000 : 0
  );

  // Create background colors array with highlighting for selected district
  const populationBackgroundColors = districts.map(district =>
    district.toLowerCase() === selectedDistrict.toLowerCase()
      ? 'rgba(54, 162, 235, 0.8)'
      : 'rgba(54, 162, 235, 0.5)'
  );

  const evStationsBackgroundColors = districts.map(district =>
    district.toLowerCase() === selectedDistrict.toLowerCase()
      ? 'rgba(255, 99, 132, 0.8)'
      : 'rgba(255, 99, 132, 0.5)'
  );

  const stationsPerMillionBackgroundColors = districts.map(district =>
    district.toLowerCase() === selectedDistrict.toLowerCase()
      ? 'rgba(75, 192, 192, 0.8)'
      : 'rgba(75, 192, 192, 0.5)'
  );

  // Create chart
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: districts,
      datasets: [
        {
          label: 'Population (scaled down by 100,000)',
          data: populations.map(pop => pop / 100000),
          backgroundColor: populationBackgroundColors,
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: 'EV Stations',
          data: evStations,
          backgroundColor: evStationsBackgroundColors,
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
          yAxisID: 'y1'
        },
        {
          label: 'Stations per Million People',
          data: stationsPerMillion,
          backgroundColor: stationsPerMillionBackgroundColors,
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
          type: 'line',
          pointBackgroundColor: stationsPerMillionBackgroundColors,
          pointRadius: districts.map(district =>
            district.toLowerCase() === selectedDistrict.toLowerCase() ? 6 : 3
          ),
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 90,
            minRotation: 45
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Population (in 100,000s)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'EV Stations / Stations per Million'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: `Population vs EV Stations in ${state}`,
          font: {
            size: 16
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.raw;

              if (label === 'Population (scaled down by 100,000)') {
                return `Population: ${(value * 100000).toLocaleString()}`;
              } else {
                return `${label}: ${value.toLocaleString()}`;
              }
            }
          }
        }
      }
    }
  });
}

// Set up district search functionality
function setupDistrictSearch() {
  const searchInput = document.getElementById('districtSearchInput');
  const clearButton = document.getElementById('clearDistrictSearch');

  if (!searchInput || !clearButton) return;

  // Search input event
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase().trim();
    const tableBody = document.getElementById('dataTableBody');
    const tableRows = Array.from(document.querySelectorAll('#dataTableBody tr'));

    // Show/hide clear button
    clearButton.style.display = searchTerm ? 'block' : 'none';

    if (searchTerm) {
      // Create arrays for matching and non-matching rows
      const matchingRows = [];
      const nonMatchingRows = [];

      // Sort rows based on search term
      tableRows.forEach(row => {
        const districtName = row.querySelector('td:first-child').textContent.toLowerCase();

        if (districtName.includes(searchTerm)) {
          // Add search highlight to matching district name
          const districtCell = row.querySelector('td:first-child');
          const districtText = districtCell.textContent;
          const highlightedText = districtText.replace(
            new RegExp(searchTerm, 'gi'),
            match => `<span class="search-highlight">${match}</span>`
          );
          districtCell.innerHTML = highlightedText;

          // Highlight recommendation
          const recommendationCell = row.querySelector('td:last-child');
          recommendationCell.classList.add('highlighted-recommendation');

          // Add to matching rows
          matchingRows.push(row);
        } else {
          // Add to non-matching rows
          nonMatchingRows.push(row);
        }
      });

      // Remove all rows from table
      while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
      }

      // Add matching rows first, then non-matching rows
      matchingRows.forEach(row => {
        row.style.display = '';
        tableBody.appendChild(row);
      });

      nonMatchingRows.forEach(row => {
        row.style.display = 'none';
        tableBody.appendChild(row);
      });
    } else {
      // If search is cleared, restore original order and remove highlights
      tableRows.forEach(row => {
        // Remove search highlight
        const districtCell = row.querySelector('td:first-child');
        districtCell.textContent = districtCell.textContent;

        // Remove recommendation highlight
        const recommendationCell = row.querySelector('td:last-child');
        recommendationCell.classList.remove('highlighted-recommendation');

        row.style.display = '';
      });

      // Resort by population (original sort)
      const sortedRows = tableRows.sort((a, b) => {
        const popA = parseInt(a.querySelector('td:nth-child(2)').textContent.replace(/,/g, ''));
        const popB = parseInt(b.querySelector('td:nth-child(2)').textContent.replace(/,/g, ''));
        return popB - popA;
      });

      // Remove all rows from table
      while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
      }

      // Add rows back in sorted order
      sortedRows.forEach(row => {
        tableBody.appendChild(row);
      });
    }
  });

  // Clear search button
  clearButton.addEventListener('click', function() {
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
    searchInput.focus();
  });

  // Initially hide the clear button
  clearButton.style.display = 'none';
}

// Generate data table
function generateDataTable(data, selectedDistrict = '') {
  const tableBody = document.getElementById('dataTableBody');
  tableBody.innerHTML = '';

  // Sort data by population in descending order
  data.sort((a, b) => b.population - a.population);

  // Add rows to table
  data.forEach(item => {
    const row = document.createElement('tr');

    // Highlight the selected district
    if (selectedDistrict && item.district.toLowerCase() === selectedDistrict.toLowerCase()) {
      row.classList.add('highlighted-row');
    }

    // Calculate stations per million
    const stationsPerMillion = item.population > 0
      ? ((item.ev_stations / item.population) * 1000000).toFixed(2)
      : 'N/A';

    // Determine recommendation based on stations per million
    let recommendationHTML = '';
    if (stationsPerMillion !== 'N/A') {
      const stationsPerMillionValue = parseFloat(stationsPerMillion);

      if (stationsPerMillionValue < 1) {
        // Very low stations per million - strongly recommend new stations
        recommendationHTML = `
          <div class="recommendation-icon recommendation-positive">
            <i class="fas fa-check-circle"></i>
            <span class="recommendation-text">No EV station Available</span>
          </div>
        `;
      } else if (stationsPerMillionValue < 5) {
        // Medium stations per million - consider new stations
        recommendationHTML = `
          <div class="recommendation-icon recommendation-neutral">
            <i class="fas fa-exclamation-triangle"></i>
            <span class="recommendation-text">Implement few stations</span>
          </div>
        `;
      } else {
        // High stations per million - sufficient coverage
        recommendationHTML = `
          <div class="recommendation-icon recommendation-negative">
            <i class="fas fa-times-circle"></i>
            <span class="recommendation-text">You can plant new stations</span>
          </div>
        `;
      }
    } else {
      recommendationHTML = `
        <div class="recommendation-icon recommendation-neutral">
          <i class="fas fa-question-circle"></i>
          <span class="recommendation-text">Insufficient data</span>
        </div>
      `;
    }

    row.innerHTML = `
      <td>${item.district}</td>
      <td>${item.population.toLocaleString()}</td>
      <td>${item.ev_stations}</td>
      <td>${stationsPerMillion}</td>
      <td>${recommendationHTML}</td>
    `;

    tableBody.appendChild(row);
  });

  // Reset search if it was active
  const searchInput = document.getElementById('districtSearchInput');
  if (searchInput) {
    searchInput.value = '';
    const clearButton = document.getElementById('clearDistrictSearch');
    if (clearButton) {
      clearButton.style.display = 'none';
    }

    // Add a search suggestion message
    const tableContainer = document.getElementById('dataTableContainer');
    const existingMessage = document.getElementById('searchSuggestionMessage');

    if (existingMessage) {
      tableContainer.removeChild(existingMessage);
    }

    const searchMessage = document.createElement('div');
    searchMessage.id = 'searchSuggestionMessage';
    searchMessage.className = 'search-suggestion-message';
    searchMessage.innerHTML = `
      <i class="fas fa-search"></i>
      <p>Use the search box to filter districts and see station implementation recommendations</p>
    `;

    tableContainer.insertBefore(searchMessage, document.getElementById('dataTable'));
  }
}
