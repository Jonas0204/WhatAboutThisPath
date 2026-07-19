export default function LocationPickerBanner({ onCancel }) {
  return (
    <div className="geolocation-banner">
      <span>Click the map to set your location</span>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}
