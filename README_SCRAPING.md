# EV Charging Station Scraper

This directory contains scripts for scraping EV charging station data from cardekho.com.

## Files

- `Scraping.py` - The original scraping script (complex with many features)
- `Scraping_simplified.py` - A simplified version of the scraper that focuses on checking if districts have charging stations
- `check_district.py` - A minimal script that just checks if a district exists on cardekho.com
- `scraping_instructions.html` - Detailed instructions for using the scraper

## How to Use

1. Open `scraping_instructions.html` in a web browser for detailed instructions
2. Use `Scraping_simplified.py` for a more straightforward approach to scraping
3. Use `check_district.py` if you just want to check if districts exist on the website

## Requirements

- Python 3.6 or higher
- Required packages: selenium, requests, pandas
- ChromeDriver that matches your Chrome version

## Installation

```bash
pip install selenium requests pandas
```

Download ChromeDriver from https://chromedriver.chromium.org/downloads and place it in your PATH or in the same directory as the script.

## Notes

- The script is designed to handle common issues like non-existent districts and redirects
- It verifies that the district name appears in the page heading (h1 tag) before scraping
- It detects and skips redirects to other cities (like when Kaimur redirects to New Delhi)
- It includes error handling to make the scraping process more robust
- The script respects the website by using reasonable delays between requests

## Customization

You can customize the states and districts to scrape by modifying the `states_districts` dictionary in the script.

## Warning

Web scraping may be against the terms of service of some websites. Make sure you're allowed to scrape the website and do so responsibly.
