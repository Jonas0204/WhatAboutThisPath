import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DOMParser } from '@xmldom/xmldom'
import { gpx } from '@tmcw/togeojson'
import { computeTrackStats } from '../src/lib/trackStats.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const outDir = join(rootDir, 'public', 'data')
const tracksOutDir = join(outDir, 'tracks')

mkdirSync(tracksOutDir, { recursive: true })

// Two separate guidebook GPX collections. Files across them can overlap the same
// hike (checked geographically — bounding-box overlap + shared start point) even
// though neither collection has internal duplicates.
const trackSources = [
  { dir: 'Faeroeer-GPS-Tracks-1' },
  {
    dir: 'it-faeroeer-2023-gesamt_gpx',
    // it-faeroeer-2023-tramps_3.gpx: 99% bbox overlap + ~20m start-point match with
    // 04-wanderung-slaettaratindur-cs — same summit hike, just recorded one-way.
    // divers/sights: POI waypoint collections, not hiking tracks — see poi below.
    exclude: ['it-faeroeer-2023-tramps_3.gpx', 'it-faeroeer-2023-divers.gpx', 'it-faeroeer-2023-sights.gpx'],
    // Book 1's filenames are already descriptive ("04 Wanderung Slættaratindur CS").
    // Book 2's are generic ("it-faeroeer-2023-tramps_1") — pull a cleaner name from
    // the GPX's own <trk><name> instead (e.g. "IT Färöer – Wanderung 1/Wanderung 1"
    // -> "Wanderung 1").
    displayNameFromGpx: true,
  },
]

const poiSources = [
  'it-faeroeer-2023-gesamt_gpx/it-faeroeer-2023-divers.gpx',
  'it-faeroeer-2023-gesamt_gpx/it-faeroeer-2023-sights.gpx',
]

function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics for the id
    .toLowerCase()
    .replace(/\.gpx$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function displayNameFromFile(name) {
  return name.replace(/\.gpx$/i, '')
}

function displayNameFromTrackName(geojson, fallback) {
  const trackName = geojson.features.find((f) => f.geometry?.type === 'LineString')?.properties?.name
  if (!trackName) return fallback
  return trackName
    .replace(/^IT\s*Färöer\s*[–-]\s*/, '')
    .split('/')[0]
    .trim()
}

function readXml(path) {
  const xml = readFileSync(path, 'utf-8')
  // Strip a leading UTF-8 BOM if present (some GPX exports include one).
  return xml.charCodeAt(0) === 0xfeff ? xml.slice(1) : xml
}

const index = []
let totalFiles = 0

for (const source of trackSources) {
  const dirPath = join(rootDir, source.dir)
  const files = readdirSync(dirPath)
    .filter((f) => f.toLowerCase().endsWith('.gpx'))
    .filter((f) => !source.exclude?.includes(f))

  for (const file of files) {
    const doc = new DOMParser().parseFromString(readXml(join(dirPath, file)), 'text/xml')
    const geojson = gpx(doc)

    const id = slugify(file)
    const displayName = source.displayNameFromGpx
      ? displayNameFromTrackName(geojson, displayNameFromFile(file))
      : displayNameFromFile(file)
    const stats = computeTrackStats(geojson)

    writeFileSync(join(tracksOutDir, `${id}.geojson`), JSON.stringify(geojson))

    index.push({
      id,
      displayName,
      sourceFile: file,
      bounds: stats.bounds,
      startPoint: stats.startPoint,
      distanceKm: Number(stats.distanceKm.toFixed(2)),
      ascentM: Math.round(stats.ascentM),
      descentM: Math.round(stats.descentM),
      minEle: stats.minEle,
      maxEle: stats.maxEle,
      waypointCount: stats.waypointCount,
    })
    totalFiles += 1
  }
}

index.sort((a, b) => a.sourceFile.localeCompare(b.sourceFile))
writeFileSync(join(outDir, 'tracks-index.json'), JSON.stringify(index, null, 2))

console.log(`Converted ${totalFiles} GPX files -> ${tracksOutDir}`)
console.log(`Wrote index of ${index.length} tracks -> ${join(outDir, 'tracks-index.json')}`)

// Points of interest (sights, practical tips) — waypoint-only GPX files, no track
// line, so they don't fit the track data model above. Flattened into one list.
const pois = []
for (const relPath of poiSources) {
  const doc = new DOMParser().parseFromString(readXml(join(rootDir, relPath)), 'text/xml')
  const geojson = gpx(doc)
  for (const feature of geojson.features) {
    if (feature.geometry?.type !== 'Point') continue
    const [lon, lat] = feature.geometry.coordinates
    pois.push({
      id: `${slugify(relPath)}-${pois.length}`,
      name: feature.properties?.name ?? 'Unnamed',
      lat,
      lon,
      source: relPath.split('/').pop(),
    })
  }
}
writeFileSync(join(outDir, 'poi.json'), JSON.stringify(pois, null, 2))
console.log(`Wrote ${pois.length} points of interest -> ${join(outDir, 'poi.json')}`)
