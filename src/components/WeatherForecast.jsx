import { useWeather } from '../hooks/useWeather.js'
import { weatherFromCode } from '../lib/weatherCodes.js'

function formatTemp(celsius, units) {
  if (units === 'imperial') return `${Math.round((celsius * 9) / 5 + 32)}°`
  return `${Math.round(celsius)}°`
}

function formatDayLabel(dateStr, index) {
  if (index === 0) return 'Today'
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, { weekday: 'short' })
}

function formatClock(isoString) {
  return new Date(isoString).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function WeatherForecast({ track, units }) {
  const { data, error } = useWeather(track?.startPoint)

  if (!track?.startPoint) return null
  if (error) return <p className="weather__error">Weather unavailable ({error.message}).</p>
  if (!data) return <p className="weather__loading">Loading forecast…</p>

  const { time, weathercode, temperature_2m_max, temperature_2m_min, precipitation_sum, sunrise, sunset } =
    data.daily

  const todaySunrise = new Date(sunrise[0])
  const todaySunset = new Date(sunset[0])
  const daylightHours = (todaySunset - todaySunrise) / 1000 / 60 / 60
  const tightOnDaylight = track.durationHours >= daylightHours * 0.8

  return (
    <div className="weather">
      <h3 className="weather__title">Forecast at trailhead</h3>
      <div className="weather__strip">
        {time.map((date, i) => {
          const weather = weatherFromCode(weathercode[i])
          return (
            <div key={date} className="weather__day">
              <span className="weather__day-label">{formatDayLabel(date, i)}</span>
              <span className="weather__emoji" title={weather.label}>
                {weather.emoji}
              </span>
              <span className="weather__temps">
                {formatTemp(temperature_2m_max[i], units)} / {formatTemp(temperature_2m_min[i], units)}
              </span>
              {precipitation_sum[i] > 0 && (
                <span className="weather__precip">{precipitation_sum[i].toFixed(0)} mm</span>
              )}
            </div>
          )
        })}
      </div>
      <p className="weather__daylight">
        ☀ {formatClock(sunrise[0])} – {formatClock(sunset[0])} ({daylightHours.toFixed(1)} h daylight today)
      </p>
      {tightOnDaylight && (
        <p className="weather__warning">
          ⚠ This hike's estimated duration is close to or exceeds today's daylight — start early or check a
          longer-daylight day.
        </p>
      )}
    </div>
  )
}
