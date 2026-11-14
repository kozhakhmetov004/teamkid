/**
 * Starting points for "Plan my weekend" (city centers; no geocoding needed).
 * San Francisco is the default: the demo uses ZIP 94110 (Mission District).
 */
export interface City {
	id: string;
	name: string;
	lat: number;
	lon: number;
}

export const CITIES: City[] = [
	{ id: 'sf', name: 'San Francisco, CA', lat: 37.76, lon: -122.42 },
	{ id: 'la', name: 'Los Angeles, CA', lat: 34.05, lon: -118.24 },
	{ id: 'sea', name: 'Seattle, WA', lat: 47.61, lon: -122.33 },
	{ id: 'den', name: 'Denver, CO', lat: 39.74, lon: -104.99 },
	{ id: 'aus', name: 'Austin, TX', lat: 30.27, lon: -97.74 },
	{ id: 'chi', name: 'Chicago, IL', lat: 41.88, lon: -87.63 },
	{ id: 'mia', name: 'Miami, FL', lat: 25.76, lon: -80.19 },
	{ id: 'dc', name: 'Washington, DC', lat: 38.91, lon: -77.04 },
	{ id: 'bos', name: 'Boston, MA', lat: 42.36, lon: -71.06 },
	{ id: 'nyc', name: 'New York, NY', lat: 40.71, lon: -74.01 }
];
export const DEFAULT_CITY = 'sf';
