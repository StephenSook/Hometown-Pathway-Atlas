/**
 * countyLookup — name → FIPS index built from `us-atlas/counties-10m`
 * TopoJSON, computed once at module load.
 *
 * Powers CountyNameSearch on the landing hero: lets judges who don't
 * know specific ZIPs find counties by name (e.g. "Cobb" → Cobb County, GA
 * → fips 13067 → drill-down via /api/region/by-fips). Hooks into the
 * same handleSelectCounty pathway that map-click drill-down uses.
 *
 * Cost: ~6KB ungz of structured data lives in JS heap after init.
 * countiesTopo itself is the heavyweight import (~250KB gz, lazy-loaded
 * with CountyMap chunk); since the list is reused there, no extra
 * bundle weight added.
 *
 * Filter strategy: case-insensitive substring match on either the
 * bare county name OR the "Name, ST" composite. Results capped at 8
 * for display; ranked first by exact-prefix match (so "Cobb" surfaces
 * Cobb County first, Hancock County second), then by population
 * proxy via density data (so big-pop matches surface ahead of
 * obscure same-name counties).
 */

import countiesTopo from 'us-atlas/counties-10m.json';
import countyDensity from '../data/county_density.json';

export interface CountyEntry {
  fips: string;
  name: string;
  state: string;
  /** Population proxy used for ranking — total athlete count from
   *  countyDensity (olympic + paralympic). Most counties = 0; major
   *  metros 50+. Same-name disambiguation tiebreaker. */
  weight: number;
}

const FIPS_TO_STATE: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY', '60': 'AS', '66': 'GU', '69': 'MP', '72': 'PR',
  '78': 'VI',
};

type DensityRow = readonly [number, number, number];
const densityMap = countyDensity as unknown as Record<string, DensityRow>;

function loadCounties(): CountyEntry[] {
  const geometries = (
    countiesTopo as unknown as {
      objects: {
        counties: { geometries: Array<{ id: string; properties: { name?: string } }> };
      };
    }
  ).objects.counties.geometries;
  return geometries.map((g) => {
    const fips = g.id;
    const density = densityMap[fips];
    const weight = density ? density[0] + density[1] : 0;
    return {
      fips,
      name: g.properties.name ?? 'Unknown',
      state: FIPS_TO_STATE[fips.slice(0, 2)] ?? '',
      weight,
    };
  });
}

const ALL_COUNTIES: CountyEntry[] = loadCounties();

/** Build a display label like "Cobb County, GA". TopoJSON names omit
 *  the "County" suffix; append it for editorial parity with the rest
 *  of the UI (RegionHeader, Tour CTA, etc.). Some Louisiana parishes +
 *  Alaska boroughs technically have non-"County" suffixes (Parish,
 *  Borough, Municipality), but TopoJSON normalizes most of them. */
export function formatCountyLabel(entry: CountyEntry): string {
  return `${entry.name} County, ${entry.state}`;
}

export function searchCounties(query: string, limit = 8): CountyEntry[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  const exactPrefix: CountyEntry[] = [];
  const prefix: CountyEntry[] = [];
  const substring: CountyEntry[] = [];
  for (const entry of ALL_COUNTIES) {
    const nameLower = entry.name.toLowerCase();
    const composite = `${nameLower}, ${entry.state.toLowerCase()}`;
    if (nameLower === trimmed) {
      exactPrefix.push(entry);
    } else if (nameLower.startsWith(trimmed) || composite.startsWith(trimmed)) {
      prefix.push(entry);
    } else if (nameLower.includes(trimmed) || composite.includes(trimmed)) {
      substring.push(entry);
    }
    if (exactPrefix.length + prefix.length + substring.length >= limit * 4) break;
  }
  // Tier-aware sort: within each tier, rank by athlete-count weight
  // (pop proxy) descending so Cobb County GA surfaces before any
  // obscure same-name match.
  const byWeight = (a: CountyEntry, b: CountyEntry) => b.weight - a.weight;
  exactPrefix.sort(byWeight);
  prefix.sort(byWeight);
  substring.sort(byWeight);
  return [...exactPrefix, ...prefix, ...substring].slice(0, limit);
}
