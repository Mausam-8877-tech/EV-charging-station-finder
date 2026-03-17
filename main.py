from flask import Flask, request, jsonify, Response
import pandas as pd
from flask_cors import CORS
import os

app = Flask(__name__, static_folder='static')
CORS(app)

# Load all state CSV files at startup
print("Loading state CSV files from ev_statewise_data directory...")
try:
    # Get all CSV files in the directory
    import glob
    csv_files = glob.glob("ev_statewise_data/*.csv")

    # Filter out any file named all_stations_with_coordinates.csv
    csv_files = [f for f in csv_files if "all_stations_with_coordinates.csv" not in f]

    print(f"Found {len(csv_files)} state CSV files: {csv_files}")

    # Initialize an empty DataFrame
    df = pd.DataFrame()

    # Read each CSV file and append to the DataFrame
    for csv_file in csv_files:
        print(f"Loading CSV file: {csv_file}")
        try:
            # Read the CSV file with explicit data types for latitude and longitude
            state_df = pd.read_csv(csv_file, dtype={
                'Latitude': 'float64',
                'Longitude': 'float64'
            })

            # Convert empty strings to NaN for latitude and longitude
            state_df['Latitude'] = pd.to_numeric(state_df['Latitude'], errors='coerce')
            state_df['Longitude'] = pd.to_numeric(state_df['Longitude'], errors='coerce')

            # Append to the main DataFrame
            if df.empty:
                df = state_df
            else:
                df = pd.concat([df, state_df])

            print(f"Added {len(state_df)} records from {csv_file}")
        except Exception as e:
            print(f"Error loading CSV file {csv_file}: {e}")

    print(f"All CSV files loaded successfully. Combined shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")
    print(f"First few rows:\n{df.head()}")
    print(f"Unique states: {df['State'].unique()}")
    print(f"Unique districts: {len(df['District'].unique())} districts")

    # Print latitude and longitude values for debugging
    # for index, row in df.iterrows():
    #     print(f"Station: {row['Station Name']}, Lat: {row['Latitude']}, Lng: {row['Longitude']}")
except Exception as e:
    print(f"Error loading CSV files: {e}")
    # Provide a fallback empty DataFrame with the expected columns
    df = pd.DataFrame(columns=['State', 'District', 'Station Name', 'Address', 'Contact',
                              'Services', 'Final Timing', 'Map URL', 'Latitude', 'Longitude'])

# Load population data
try:
    print("Loading population data...")
    population_df = pd.read_csv("population/india-districts-census-2011.csv")
    print(f"Population data loaded successfully. Shape: {population_df.shape}")
    print(f"Population data columns: {population_df.columns.tolist()}")
    print(f"First few rows of population data:\n{population_df.head()}")

    # Standardize state and district names in population data
    population_df['State name'] = population_df['State name'].str.title()
    population_df['District name'] = population_df['District name'].str.title()
except Exception as e:
    print(f"Error loading population data: {e}")
    population_df = pd.DataFrame(columns=['District code', 'State name', 'District name', 'Population'])

# Extract unique state and district combinations
state_district_data = df[['State', 'District']].drop_duplicates().sort_values(['State', 'District'])

# Create a dictionary of states and their districts
states_districts = {}
for _, row in state_district_data.iterrows():
    state = row['State']
    district = row['District']
    if state not in states_districts:
        states_districts[state] = []
    states_districts[state].append(district)


# Serve Leaflet map
@app.route('/test')
def test():
    """Test route to check if the API is working"""
    return jsonify({
        "message": "API is working",
        "states": list(states_districts.keys()),
        "districts": states_districts.get("Bihar", []),
        "stations": len(df),
        "sample_data": df.iloc[0].to_dict() if not df.empty else {}
    })

# Serve static files
@app.route('/<path:path>')
def serve_static(path):
    try:
        # Determine MIME type based on file extension
        mime_types = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        }

        # Get file extension
        _, ext = os.path.splitext(path)
        mime_type = mime_types.get(ext.lower(), 'application/octet-stream')

        # Check if file is binary or text
        binary_exts = ['.png', '.jpg', '.jpeg', '.gif', '.ico']
        is_binary = ext.lower() in binary_exts

        # Open file in appropriate mode
        mode = 'rb' if is_binary else 'r'
        encoding = None if is_binary else 'utf-8'

        with open(path, mode, encoding=encoding) as file:
            content = file.read()

        return Response(content, mimetype=mime_type)
    except Exception as e:
        print(f"Error serving file {path}: {e}")
        return f"File not found: {path}", 404

@app.route('/api/suggestions', methods=['GET'])
def get_suggestions():
    """API endpoint to get state and district suggestions based on user input"""
    query = request.args.get('query', '').strip().lower()

    if not query:
        # Return all states if no query
        return jsonify({
            'states': list(states_districts.keys()),
            'districts': []
        })

    # Search for matching states
    matching_states = [state for state in states_districts.keys()
                      if query in state.lower()]

    # Search for matching districts
    matching_districts = []
    for state, districts in states_districts.items():
        for district in districts:
            if query in district.lower():
                matching_districts.append({
                    'state': state,
                    'district': district
                })

    return jsonify({
        'states': matching_states,
        'districts': matching_districts
    })

@app.route('/api/states', methods=['GET'])
def get_states():
    """API endpoint to get all states"""
    return jsonify(list(states_districts.keys()))

@app.route('/api/districts', methods=['GET'])
def get_districts():
    """API endpoint to get districts for a specific state"""
    state = request.args.get('state', '').strip()

    if not state or state not in states_districts:
        return jsonify([])

    return jsonify(states_districts[state])

@app.route('/api/stations', methods=['GET'])
def get_stations_by_district():
    """API endpoint to get stations by district and optionally by state"""
    district = request.args.get('city', '').strip()
    state = request.args.get('state', '').strip()

    if not district:
        return jsonify({'error': 'District parameter is required'}), 400

    # Print debug information
    print(f"Searching for district: '{district}', state: '{state}'")
    print(f"Available districts: {df['District'].unique()}")
    print(f"Available states: {df['State'].unique()}")

    # For debugging, print all rows in the DataFrame
    print("All data in DataFrame:")
    for index, row in df.iterrows():
        print(f"Row {index}: State={row['State']}, District={row['District']}, Station={row['Station Name']}")

    # Case-insensitive search for district
    district_matches = df[df['District'].str.lower() == district.lower()]
    if len(district_matches) > 0:
        district = district_matches['District'].iloc[0]
        print(f"Found matching district: {district}")
    else:
        print(f"No matching district found for '{district}'")
        # Try a partial match
        district_matches = df[df['District'].str.lower().str.contains(district.lower())]
        if len(district_matches) > 0:
            district = district_matches['District'].iloc[0]
            print(f"Found partial match for district: {district}")

    # Filter the DataFrame by District and optionally by State
    if state:
        print(f"Filtering by state '{state}' and district '{district}'")
        filtered = df[(df['District'].str.lower() == district.lower()) &
                      (df['State'].str.lower() == state.lower())]
    else:
        print(f"Filtering by district '{district}' only")
        filtered = df[df['District'].str.lower() == district.lower()]

    # Print how many stations were found
    print(f"Found {len(filtered)} stations matching the criteria")
    if len(filtered) > 0:
        print("Matching stations:")
        for index, row in filtered.iterrows():
            print(f"  - {row['Station Name']} in {row['District']}, {row['State']}")

    if filtered.empty:
        return jsonify([])

    # Build list of stations
    stations = []
    for _, row in filtered.iterrows():
        station = {
            'name': row['Station Name'],
            'address': row['Address'],
            'contact': str(row['Contact']) if pd.notna(row['Contact']) else "N/A",
            'services': str(row['Services']) if pd.notna(row['Services']) else "N/A",
            'timing': str(row['Final Timing']) if pd.notna(row['Final Timing']) else "N/A",
            'state': row['State'],
            'district': row['District'],
            'latitude': float(row['Latitude']) if pd.notna(row['Latitude']) else None,
            'longitude': float(row['Longitude']) if pd.notna(row['Longitude']) else None
        }
        stations.append(station)
        # print(f"API returning station: {station['name']}, Lat: {station['latitude']}, Lng: {station['longitude']}")

    return jsonify(stations)

@app.route('/api/population-vs-ev', methods=['GET'])
def get_population_vs_ev():
    """API endpoint to get population and EV station data for a selected state and district"""
    state = request.args.get('state', '').strip()

    if not state:
        return jsonify({'error': 'State parameter is required'}), 400

    # Get all districts for the selected state from both datasets
    ev_districts = set(df[df['State'].str.lower() == state.lower()]['District'].str.lower().unique())

    # Convert state name to match population data format
    state_name_for_pop = state.title()

    # Get population data for the selected state
    pop_data = population_df[population_df['State name'].str.lower() == state_name_for_pop.lower()]

    # If no population data found for the state, return empty result
    if pop_data.empty:
        return jsonify([])

    # Get all districts from population data for this state
    pop_districts = set(pop_data['District name'].str.lower().unique())

    # Find common districts between EV and population data
    # We'll use fuzzy matching to handle slight differences in district names
    district_mapping = {}
    result_data = []

    # For each district in population data
    for pop_district in pop_districts:
        # Get population for this district
        district_pop = pop_data[pop_data['District name'].str.lower() == pop_district]['Population'].iloc[0]

        # Count EV stations for this district
        # Try exact match first
        ev_count = len(df[(df['State'].str.lower() == state.lower()) &
                          (df['District'].str.lower() == pop_district)])

        # If no exact match, try to find a similar district name in EV data
        if ev_count == 0:
            for ev_district in ev_districts:
                # Simple similarity check - if one contains the other
                if pop_district in ev_district or ev_district in pop_district:
                    ev_count = len(df[(df['State'].str.lower() == state.lower()) &
                                     (df['District'].str.lower() == ev_district)])
                    district_mapping[pop_district] = ev_district
                    break

        # Add to result if we have both population and EV data
        if district_pop > 0 or ev_count > 0:
            result_data.append({
                'district': pop_district.title(),
                'population': int(district_pop),
                'ev_stations': ev_count
            })

    # Sort by population in descending order
    result_data = sorted(result_data, key=lambda x: x['population'], reverse=True)

    return jsonify(result_data)

if __name__ == '__main__':
    app.run()
