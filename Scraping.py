import time
import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
from urllib.parse import quote
import os
import re

# Configure Selenium WebDriver for visible browser interaction
options = Options()
options.headless = False  # Ensure browser is visible
options.add_argument('--start-maximized')  # Start maximized
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--disable-notifications')  # Disable notifications
options.add_argument('--disable-popup-blocking')  # Disable popup blocking

# Initialize the Chrome driver
driver = webdriver.Chrome(options=options)
driver.maximize_window()  # Maximize window to ensure all elements are visible
print("✅ Browser opened and maximized")

# Base URL
base_url = "https://www.cardekho.com/electric-charging-station/{}"

# Create a folder to store CSVs
os.makedirs("ev_statewise_data", exist_ok=True)

# Dictionary to collect state-wise data
state_data_dict = {}

# States and districts - using a small subset for testing
states_districts = {
   "Meghalaya": [
        "East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "North Garo Hills",
        "Ri-Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills",
        "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"
    ]






}


# Start scraping
print("\n🚀 Starting the scraping process...")
print("📱 Browser will remain open and visible throughout the process")
print("📍 Will extract map URLs, latitude and longitude for each station")
print("� Data will be saved in real-time after processing each district")

# Function to extract coordinates from Map URL
def extract_coordinates_from_url(url):
    if not url or not isinstance(url, str):
        return None, None

    # Try different patterns to extract coordinates
    patterns = [
        r'@(-?\d+\.\d+),(-?\d+\.\d+)',  # @lat,lng format
        r'/dir/(?:[^/]+)/(-?\d+\.\d+),(-?\d+\.\d+)',  # /dir/source/lat,lng format
        r'(?:destination=|place/)(-?\d+\.\d+),(-?\d+\.\d+)',  # destination= or place/ format
        r'[-+]?\d+\.\d+,[-+]?\d+\.\d+'  # Any lat,lng pair
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            if len(match.groups()) == 2:
                return match.group(1), match.group(2)
            else:
                # If we matched a simple lat,lng pair without groups
                coords = match.group(0).split(',')
                if len(coords) == 2:
                    return coords[0], coords[1]

    return None, None

# Function to save data in real-time
def save_data_realtime(data, state, district=None):
    if not data:
        return 0, 0

    # Convert to DataFrame
    df = pd.DataFrame(data)

    # Try to extract coordinates from Map URL for rows with missing coordinates
    print(f"\n🔍 Attempting to extract missing coordinates from Map URLs...")
    coords_extracted = 0

    for index, row in df.iterrows():
        # If we don't have coordinates but have a Map URL
        if (not row['Latitude'] or row['Latitude'] == '') and row['Map URL']:
            lat, lng = extract_coordinates_from_url(row['Map URL'])
            if lat and lng:
                df.at[index, 'Latitude'] = lat
                df.at[index, 'Longitude'] = lng
                coords_extracted += 1
                print(f"✅ Extracted coordinates for {row['Station Name']}: {lat}, {lng}")

    if coords_extracted > 0:
        print(f"✅ Successfully extracted coordinates for {coords_extracted} stations from Map URLs")

    # Count stations with valid coordinates
    stations_with_coords = df[(df['Latitude'] != '') & (df['Latitude'].notna())].shape[0]
    total_stations = len(df)

    # Create directory if it doesn't exist
    os.makedirs("ev_statewise_data", exist_ok=True)

    # Save to state CSV file
    state_file_path = f"ev_statewise_data/{state.replace(' ', '_')}.csv"

    # Check if file exists to determine if we need to write headers
    file_exists = os.path.isfile(state_file_path)

    # If district is specified, we're saving district data
    if district:
        print(f"💾 Saving data for {district}, {state} in real-time...")

        # Save/append to state CSV
        if file_exists:
            # Append without headers
            df.to_csv(state_file_path, mode='a', header=False, index=False)
        else:
            # Create new file with headers
            df.to_csv(state_file_path, index=False)

        print(f"✅ Updated {state_file_path} with {len(df)} stations from {district}")
    else:
        # We're saving complete state data
        df.to_csv(state_file_path, index=False)
        print(f"✅ Saved complete data for {state} to {state_file_path}")

    # Also save to a combined CSV with all stations
    all_stations_path = "ev_statewise_data/all_stations_with_coordinates.csv"
    all_file_exists = os.path.isfile(all_stations_path)

    if all_file_exists:
        # Append without headers
        df.to_csv(all_stations_path, mode='a', header=False, index=False)
    else:
        # Create new file with headers
        df.to_csv(all_stations_path, index=False)

    print(f"✅ Updated combined file with {len(df)} stations")

    return total_stations, stations_with_coords

try:
    # Process each state separately
    for state, districts in states_districts.items():
        state_data = []  # This will collect data for all districts in this state
        print(f"\n🔍 Processing state: {state}")

        # Create a list to collect district-specific data for real-time saving
        district_data = []

        for district in districts:
            print(f"🔄 Scraping data for {district}, {state}")
            district_encoded = quote(district)
            url = base_url.format(district_encoded)
            print(f"📌 Opening URL: {url}")
            driver.get(url)

            # Give the page time to load and be visible to the user
            print("⏳ Waiting for page to load...")
            time.sleep(5)  # Increased wait time for better visibility

            try:
                # First check if the h1 heading contains the district name
                try:
                    h1_element = driver.find_element(By.XPATH, "//h1[contains(@class, 'displayInlineBlock')]")
                    h1_text = h1_element.text.lower()
                    print(f"📌 Found page heading: {h1_element.text}")

                    # Check if district name is in the h1 text
                    if district.lower() not in h1_text:
                        print(f"⚠️ District name '{district}' not found in page heading: '{h1_element.text}'")
                        print(f"⚠️ This page might be for a different location. Skipping {district}, {state}.")
                        continue

                    # Also check if it redirected to a different city
                    if "new delhi" in h1_text and district.lower() != "new delhi":
                        print(f"⚠️ Page redirected to New Delhi instead of {district}. Skipping.")
                        continue
                except Exception as e:
                    print(f"⚠️ Could not find or check h1 heading: {e}")
                    print(f"⚠️ Skipping {district}, {state} to be safe.")
                    continue

                # Now check for station cards
                station_cards = driver.find_elements(By.CLASS_NAME, "cardBox")
                if not station_cards:
                    print(f"⚠ No data found for {district}, {state}.")
                    continue
            except Exception as e:
                print(f"⚠ Error loading data for {district}, {state}. Error: {e}")
                continue

            # Load all station cards
            prev_count = 0
            while True:
                try:
                    load_more = driver.find_element(By.CLASS_NAME, "loadMore")
                    driver.execute_script("arguments[0].click();", load_more)
                    print("➡  Clicked Load More...")
                    time.sleep(3)
                except:
                    print(f"⚠ No more 'Load More' button for {district}, {state}.")
                    break

                station_cards = driver.find_elements(By.CLASS_NAME, "cardBox")
                if len(station_cards) == prev_count:
                    print(f"🔴 No more new data for {district}, {state}.")
                    break
                prev_count = len(station_cards)

            print(f"✅ Found {len(station_cards)} stations for {district}, {state}")

            # Clear district data for this new district
            district_data = []

            for card in station_cards:
                try:
                    name = card.find_element(By.CLASS_NAME, "name").text.strip()
                except:
                    name = ""

                try:
                    address = card.find_element(By.CLASS_NAME, "addressList").text.strip()
                except:
                    address = ""

                try:
                    contact = card.find_element(By.CLASS_NAME, "contactNo").text.strip()
                except:
                    contact = ""

                try:
                    services = card.find_element(By.CLASS_NAME, "servicesList").text.strip()
                except:
                    services = ""

                try:
                    timings_div = card.find_element(By.CLASS_NAME, "timings")
                    raw_text = timings_div.text.strip()
                    spans = timings_div.find_elements(By.TAG_NAME, "span")
                    if "24 Hours" in raw_text:
                        final_timing = "24 Hours"
                    elif len(spans) >= 3 and spans[2].text.strip():
                        final_timing = spans[2].text.strip()
                    else:
                        final_timing = "Closed Now"
                except:
                    final_timing = "Closed Now"

                # Initialize map_url, latitude, and longitude variables
                map_url = ""
                latitude = ""
                longitude = ""

                try:
                    print(f"\n🔍 Processing station: {name}")

                    # Find the "Get Direction" button
                    print("🔘 Looking for 'Get Direction' button...")
                    get_direction_button = card.find_element(By.XPATH, './/div[@class="btnBox hover" and .//span[text()="Get Direction"]]')

                    # Store main window handle
                    main_window = driver.current_window_handle
                    print("📋 Stored main window reference")

                    # Highlight the button before clicking (make it visually stand out)
                    driver.execute_script("arguments[0].style.border='3px solid red'", get_direction_button)
                    time.sleep(1)  # Brief pause to see the highlighted button

                    # Scroll to button and click it
                    print("🖱 Scrolling to and clicking 'Get Direction' button...")
                    driver.execute_script("arguments[0].scrollIntoView({block: 'center', behavior: 'smooth'});", get_direction_button)
                    time.sleep(1)  # Wait for smooth scroll to complete
                    ActionChains(driver).move_to_element(get_direction_button).click().perform()

                    # Wait for new tab to open
                    print("⏳ Waiting for map to open in new tab...")
                    time.sleep(5)

                    # Get all windows
                    windows = driver.window_handles

                    # If a new tab is opened
                    if len(windows) > 1:
                        print("✅ New tab detected")
                        # Switch to new tab (last one)
                        driver.switch_to.window(windows[-1])
                        print("🔄 Switched to map tab")

                        # Get map URL
                        map_url = driver.current_url
                        print(f"🌐 Map URL: {map_url}")

                        if "google.com/maps" in map_url:
                            # Try to extract coordinates from different URL formats

                            # First try the @lat,lng format (common in Google Maps URLs)
                            match = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', map_url)

                            # If not found, try the /dir/source/lat,lng format
                            if not match:
                                match = re.search(r'/dir/(?:[^/]+)/(-?\d+\.\d+),(-?\d+\.\d+)', map_url)

                            # If still not found, try to find any coordinates in the URL
                            if not match:
                                match = re.search(r'(?:destination=|place/)(-?\d+\.\d+),(-?\d+\.\d+)', map_url)

                            if match:
                                latitude = match.group(1)
                                longitude = match.group(2)
                                print(f"📍 Coordinates extracted - Lat: {latitude}, Long: {longitude}")
                            else:
                                print("⚠ Could not extract coordinates from URL")
                                print(f"🔍 URL for manual inspection: {map_url}")

                                # Try to find any numbers that look like coordinates
                                all_coords = re.findall(r'[-+]?\d+\.\d+', map_url)
                                if len(all_coords) >= 2:
                                    print(f"🔍 Found potential coordinates: {all_coords}")
                                    # Take the first two numbers that could be valid coordinates
                                    valid_coords = []
                                    for coord in all_coords:
                                        num = float(coord)
                                        if -90 <= num <= 90 or -180 <= num <= 180:
                                            valid_coords.append(coord)
                                            if len(valid_coords) == 2:
                                                break

                                    if len(valid_coords) == 2:
                                        latitude = valid_coords[0]
                                        longitude = valid_coords[1]
                                        print(f"📍 Using potential coordinates - Lat: {latitude}, Long: {longitude}")
                        else:
                            print("⚠ Not a Google Maps URL")

                        # Give user time to see the map
                        time.sleep(2)

                        # Close the current tab
                        print("🔒 Closing map tab")
                        driver.close()

                        # Switch back to main window
                        driver.switch_to.window(main_window)
                        print("🔄 Switched back to main window")
                    else:
                        print("⚠ No new tab was opened")
                except Exception as e:
                    print(f"❌ Error getting map data: {e}")
                    # Make sure we're back on the main window
                    if len(driver.window_handles) > 1 and driver.current_window_handle != main_window:
                        print("🔄 Switching back to main window after error")
                        driver.switch_to.window(main_window)

                station_data = {
                    "State": state,
                    "District": district,
                    "Station Name": name,
                    "Address": address,
                    "Contact": contact,
                    "Services": services,
                    "Final Timing": final_timing,
                    "Map URL": map_url,
                    "Latitude": latitude,
                    "Longitude": longitude
                }

                # Add to district data for real-time saving
                district_data.append(station_data)

                # Also add to state data for complete state file
                state_data.append(station_data)

            # Save district data in real-time after processing each district
            if district_data:
                save_data_realtime(district_data, state, district)

            time.sleep(1)

        # Save complete state data after processing all districts
        if state_data:
            total_stations, stations_with_coords = save_data_realtime(state_data, state)

            print(f"\n📊 Summary for {state}:")
            print(f"   - Total stations: {total_stations}")
            print(f"   - Stations with coordinates: {stations_with_coords}")
            if total_stations > 0:
                print(f"   - Success rate: {stations_with_coords/total_stations*100:.1f}%")

    print("\n✅ Scraping completed successfully!")

except Exception as e:
    print(f"\n❌ An error occurred during scraping: {e}")

finally:
    # Always quit the driver to ensure browser is closed
    print("\n🔒 Closing browser...")
    driver.quit()
    print("👋 Script execution finished.")