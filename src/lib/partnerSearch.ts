// Smart partner search for the admin lists: one field searches company/name, city and postcode.
// - case- and umlaut-insensitive: "Schwäbisch" = "schwabisch" = "schwaebisch", "ß" = "ss"
// - several words are searched separately and must all match ("hall 745")
// - number words match postcodes by prefix ("74", "705", "74523"), so phone numbers or house numbers don't produce hits

export type SearchFields = { names: (string | null | undefined)[]; city: string | null | undefined; postcode: string | null | undefined }

export function normalizeSearch(value: string | null | undefined) {
  return (value ?? '')
    .toLocaleLowerCase('de-DE')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Applied to text and query alike, so "ae"/"ä" spellings meet in the middle.
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
}

export function tokenize(query: string) {
  return query
    .split(/[\s,;]+/)
    .map((t) => normalizeSearch(t).replace(/[^\p{L}\p{N}-]/gu, ''))
    .filter(Boolean)
}

const isNumber = (token: string) => /^\d+$/.test(token)

export function matchesSearch(fields: SearchFields, tokens: string[]) {
  if (tokens.length === 0) return true
  const postcode = (fields.postcode ?? '').replace(/\D/g, '')
  const text = [...fields.names, fields.city].map(normalizeSearch).join(' ')
  return tokens.every((t) => (isNumber(t) ? postcode.startsWith(t) : text.includes(t)))
}

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]
}

// "Meintest du …?" for empty results: regions where the query does match (ignoring the selected tab),
// otherwise city names that are close to a typed word (typos like "Stutgart").
export function suggestRegions<T>(
  items: T[],
  tokens: string[],
  fieldsOf: (item: T) => SearchFields,
  regionOf: (item: T) => { key: string; label: string },
  excludeKey?: string,
) {
  const found = new Map<string, string>()
  for (const item of items) {
    const region = regionOf(item)
    if (region.key !== excludeKey && matchesSearch(fieldsOf(item), tokens)) found.set(region.key, region.label)
  }
  if (found.size === 0) {
    const words = tokens.filter((t) => !isNumber(t) && t.length >= 3)
    for (const item of items) {
      const region = regionOf(item)
      const cityWords = normalizeSearch(fieldsOf(item).city).split(/[\s-]+/).filter(Boolean)
      const close = words.some((w) => cityWords.some((c) => distance(w, c) <= (w.length > 5 ? 2 : 1)))
      if (close && region.key !== excludeKey) found.set(region.key, region.label)
    }
  }
  return [...found].map(([key, label]) => ({ key, label })).slice(0, 3)
}

export const firstPostcodeToken = (tokens: string[]) => tokens.find((t) => isNumber(t)) ?? null
