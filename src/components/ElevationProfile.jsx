import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { length as turfLength, lineString } from '@turf/turf'

function buildProfile(geometry) {
  const line = geometry.features.find((f) => f.geometry?.type === 'LineString')
  if (!line) return []

  const coords = line.geometry.coordinates
  let cumulativeKm = 0
  const points = [{ km: 0, ele: coords[0][2] ?? 0 }]

  for (let i = 1; i < coords.length; i++) {
    const segment = lineString([coords[i - 1], coords[i]])
    cumulativeKm += turfLength(segment, { units: 'kilometers' })
    points.push({ km: Number(cumulativeKm.toFixed(2)), ele: coords[i][2] ?? 0 })
  }

  return points
}

export default function ElevationProfile({ geometry, units = 'metric' }) {
  if (!geometry) return null
  const data = buildProfile(geometry)
  if (data.length === 0) return null

  const isImperial = units === 'imperial'
  const xFormat = (v) => (isImperial ? `${(v * 0.621371).toFixed(1)}mi` : `${v}km`)
  const yFormat = (v) => (isImperial ? `${Math.round(v * 3.28084)}ft` : `${Math.round(v)}m`)

  return (
    <div className="elevation-profile">
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="km" tickFormatter={xFormat} fontSize={11} />
          <YAxis dataKey="ele" tickFormatter={yFormat} fontSize={11} width={40} />
          <Tooltip formatter={(v) => yFormat(v)} labelFormatter={(v) => xFormat(v)} />
          <Area type="monotone" dataKey="ele" stroke="#e0574c" fill="#e0574c33" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
