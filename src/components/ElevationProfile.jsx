import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { length as turfLength, lineString } from '@turf/turf'
import { palette } from '../lib/theme.js'

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

export default function ElevationProfile({ geometry, units = 'metric', theme = 'light' }) {
  if (!geometry) return null
  const data = buildProfile(geometry)
  if (data.length === 0) return null

  // Recharts is configured in JS, so it can't read the --tokens in style.css —
  // its colors come from the same palette the map layers use.
  const c = palette(theme)
  const isImperial = units === 'imperial'
  const xFormat = (v) => (isImperial ? `${(v * 0.621371).toFixed(1)}mi` : `${v}km`)
  const yFormat = (v) => (isImperial ? `${Math.round(v * 3.28084)}ft` : `${Math.round(v)}m`)

  return (
    <div className="elevation-profile">
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={c.chartGrid} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="km" tickFormatter={xFormat} fontSize={11} stroke={c.chartAxis} tickLine={false} />
          <YAxis
            dataKey="ele"
            tickFormatter={yFormat}
            fontSize={11}
            width={40}
            stroke={c.chartAxis}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => yFormat(v)}
            labelFormatter={(v) => xFormat(v)}
            cursor={{ stroke: c.chartAxis, strokeDasharray: '3 3' }}
            // Recharts writes its tooltip chrome as inline styles, so a CSS rule
            // can't reach it — the dark theme has to be handed in here.
            contentStyle={{
              background: c.tooltipBg,
              border: `1px solid ${c.tooltipBorder}`,
              borderRadius: 10,
              boxShadow: c.tooltipShadow,
              fontSize: 12,
            }}
            labelStyle={{ color: c.tooltipMuted, fontWeight: 600 }}
            itemStyle={{ color: c.tooltipText }}
          />
          <Area type="monotone" dataKey="ele" stroke={c.chartLine} strokeWidth={2} fill={c.chartFill} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
