export default function GeolocationBanner({ permissionState, error, onRequest }) {
  if (permissionState === 'granted') return null

  return (
    <div className="geolocation-banner">
      {permissionState === 'denied' ? (
        <span>Location denied — enable it in your browser&apos;s site settings to see your position.</span>
      ) : (
        <button onClick={onRequest}>Show my location</button>
      )}
      {error && error.code !== error?.PERMISSION_DENIED && (
        <span className="geolocation-banner__error">{error.message}</span>
      )}
    </div>
  )
}
