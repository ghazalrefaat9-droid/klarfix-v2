// Groups partners / applications by city (or postcode area) for the region tabs in the admin panel.
// Rule: city from the profile wins; without a city the first two postcode digits form the group ("PLZ 70xxx");
// without both the entry lands in "Ohne PLZ".

export const ALL_GROUP = 'all'
export const NO_PLZ_GROUP = 'ohne-plz'

export type RegionGroup = { key: string; label: string; count: number; postcodes: string[] }

export function extractPostcode(...sources: (string | null | undefined)[]) {
  for (const s of sources) {
    const m = /\b(\d{5})\b/.exec(s ?? '')
    if (m) return m[1]
  }
  return null
}

// "74523 Schwäbisch Hall" -> "Schwäbisch Hall"; collapses whitespace.
function cleanCity(city: string | null | undefined) {
  const c = (city ?? '').replace(/\b\d{5}\b/g, '').replace(/\s+/g, ' ').trim().replace(/^[,\s-]+|[,\s-]+$/g, '')
  return c || null
}

export function regionOf(postcode: string | null | undefined, city: string | null | undefined) {
  const name = cleanCity(city)
  if (name) return { key: `city:${name.toLocaleLowerCase('de-DE')}`, label: name }
  const plz = extractPostcode(postcode)
  if (plz) return { key: `plz:${plz.slice(0, 2)}`, label: `PLZ ${plz.slice(0, 2)}xxx` }
  return { key: NO_PLZ_GROUP, label: 'Ohne PLZ' }
}

export function groupByRegion<T>(items: T[], locate: (item: T) => { postcode: string | null; city: string | null }) {
  const groups = new Map<string, RegionGroup>()
  const keyOf = new Map<T, string>()
  for (const item of items) {
    const { postcode, city } = locate(item)
    const region = regionOf(postcode, city)
    keyOf.set(item, region.key)
    const group = groups.get(region.key) ?? { key: region.key, label: region.label, count: 0, postcodes: [] }
    group.count++
    const plz = extractPostcode(postcode)
    if (plz && !group.postcodes.includes(plz)) group.postcodes.push(plz)
    groups.set(region.key, group)
  }
  const list = [...groups.values()]
  for (const g of list) g.postcodes.sort()
  // Biggest regions first, alphabetical on ties, "Ohne PLZ" always last.
  list.sort((a, b) =>
    a.key === NO_PLZ_GROUP ? 1 : b.key === NO_PLZ_GROUP ? -1 : b.count - a.count || a.label.localeCompare(b.label, 'de'),
  )
  return { groups: list, keyOf: (item: T) => keyOf.get(item) ?? NO_PLZ_GROUP }
}
