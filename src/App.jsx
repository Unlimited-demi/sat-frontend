"use client"

import { useState, useRef } from "react"
import axios from "axios"
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import SuburbanLogo from "./assets/SuburbanLogo.png"

// --- Leaflet Icon Fix ---
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
})

// --- Configuration ---
const API_BASE_URL = "https://sat-backend-55lg.onrender.com"

// --- SVG Icons ---
const PipelineIcon = () => (
  <svg
    className="w-5 h-5 mr-2"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
)

const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
)

// --- Map Interaction Component ---
function MapClickHandler({ setParams }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      setParams((prevParams) => ({
        ...prevParams,
        lat: Number.parseFloat(lat.toFixed(4)),
        lon: Number.parseFloat(lng.toFixed(4)),
      }))
    },
  })
  return null
}

// --- Main App Component ---
function App() {
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)

  const [params, setParams] = useState({
    lat: 6.5244,
    lon: 3.3792,
    startDate: sevenDaysAgo.toISOString().split("T")[0],
    endDate: today.toISOString().split("T")[0],
    scriptType: "true_color",
  })

  const [displayedImage, setDisplayedImage] = useState(null)
  const [temporalResults, setTemporalResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("Select an area and define a processing job.")
  const markerRef = useRef(null)

  const handleParamChange = (e) => {
    setParams({ ...params, [e.target.name]: e.target.value })
  }

  const handleFetchImage = async (e) => {
    e.preventDefault()

    setIsLoading(true)
    setError("")
    setDisplayedImage(null)
    setTemporalResults([])
    setInfo("Submitting job to Sentinel pipeline...")

    try {
      if (params.scriptType === "temporal_list") {
        const response = await axios.post(`${API_BASE_URL}/api/sentinel-hub/process`, params)
        if (response.data.results && response.data.results.length > 0) {
          setTemporalResults(response.data.results)
          setInfo(`Successfully fetched ${response.data.results.length} images.`)
        } else {
          setInfo("No images found for the selected criteria.")
        }
      } else {
        const response = await axios.post(`${API_BASE_URL}/api/sentinel-hub/process`, params, { responseType: "blob" })
        const imageUrl = URL.createObjectURL(response.data)
        setDisplayedImage(imageUrl)
        setInfo("Successfully processed and loaded image.")
      }
    } catch (err) {
      const errorDetail = err.response?.data?.detail || "An unknown error occurred. Check the backend logs."
      setError(`Pipeline failed: ${errorDetail}`)
      setInfo("")
      console.error("Fetch image error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // --- UI Rendering ---
  const ViewerContent = () => {
    if (isLoading) return <LoadingSpinner />
    if (error)
      return (
        <div className="text-red-400 text-center p-4">
          <p className="font-bold mb-2">Pipeline Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )

    if (temporalResults.length > 0) {
      return (
        <div className="w-full h-full overflow-y-auto p-2 space-y-4">
          {temporalResults.map((result, index) => (
            <div key={index} className="bg-gray-900 rounded-lg p-2">
              <img
                src={result.image || "/placeholder.svg"}
                alt={`Scene from ${result.date}`}
                className="w-full h-auto object-contain rounded-md"
              />
              <p className="text-xs text-center text-gray-400 mt-1">{new Date(result.date).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )
    }

    if (displayedImage) {
      return (
        <img
          src={displayedImage || "/placeholder.svg"}
          alt="Processed satellite view"
          className="w-full h-full object-contain"
        />
      )
    }

    return <p className="text-gray-400 px-4 text-center">{info}</p>
  }

  return (
    <div
      className="text-white h-screen font-sans overflow-hidden flex flex-col relative"
      style={{ background: "linear-gradient(180deg, #14101F 26.5%, #C1052B 100%)" }}
    >
      {/* Decorative white block at bottom right */}
      <div
        className="absolute"
        style={{
          width: "1175px",
          height: "398.87px",
          right: "0px",
          bottom: "-29.87px",
          background: "#FFFFFF",
          opacity: 0.1, // make it blend a bit with background
          borderRadius: "12px",
          pointerEvents: "none",
        }}
      ></div>

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-3 flex-shrink-0 relative z-10">
        <img src={SuburbanLogo} alt="Suburban Logo" className="h-8 w-auto" />

        <div className="hidden md:flex items-center space-x-8">
          <a href="#" className="text-white hover:text-gray-300 transition-colors">
            Why Suburban
          </a>
          <a href="#" className="text-white hover:text-gray-300 transition-colors">
            Solutions
          </a>
          <a href="#" className="text-white hover:text-gray-300 transition-colors">
            Pricing
          </a>
          <a href="#" className="text-white hover:text-gray-300 transition-colors">
            Resources
          </a>
        </div>

        <div className="flex items-center space-x-3">
          <button className="border border-white text-white px-6 py-2 rounded-full font-medium transition-colors text-sm hover:bg-white/10">
            Book a demo
          </button>
          <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-medium transition-colors text-sm">
            Try for free
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 px-6 pb-4 flex flex-col overflow-hidden relative z-10">
        <header className="text-center mb-6 flex-shrink-0">
          <h1 className="text-4xl font-bold text-white mb-2">Satellite Data Pipeline</h1>
          <p className="text-gray-300 text-sm">Define and run on-demand processing jobs in the cloud</p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto flex-1 overflow-hidden w-full">
          {/* Left Panel */}
          <div className="lg:col-span-1 bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg w-full">
            <form onSubmit={handleFetchImage}>
              <h3 className="text-base font-semibold mb-3 text-white">1. Select Area of Interest</h3>
              <div className="h-48 w-full mb-3 rounded-lg overflow-hidden">
                <MapContainer
                  center={[params.lat, params.lon]}
                  zoom={10}
                  scrollWheelZoom={true}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[params.lat, params.lon]} ref={markerRef} />
                  <MapClickHandler setParams={setParams} />
                </MapContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label htmlFor="lat" className="block text-xs font-medium text-gray-300 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="lat"
                    id="lat"
                    value={params.lat}
                    onChange={handleParamChange}
                    className="bg-gray-800 text-white w-full p-2 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="lon" className="block text-xs font-medium text-gray-300 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="lon"
                    id="lon"
                    value={params.lon}
                    onChange={handleParamChange}
                    className="bg-gray-800 text-white w-full p-2 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <h3 className="text-base font-semibold mb-3 text-white">2. Time Range and Processing</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label htmlFor="startDate" className="block text-xs font-medium text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    id="startDate"
                    value={params.startDate}
                    onChange={handleParamChange}
                    className="bg-gray-800 text-white w-full p-2 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-xs font-medium text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    id="endDate"
                    value={params.endDate}
                    onChange={handleParamChange}
                    className="bg-gray-800 text-white w-full p-2 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none text-sm"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="scriptType" className="block text-xs font-medium text-gray-300 mb-1">
                  Processing Type
                </label>
                <select
                  id="scriptType"
                  name="scriptType"
                  value={params.scriptType}
                  onChange={handleParamChange}
                  className="bg-gray-800 text-white w-full p-2 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none text-sm"
                >
                  <option value="true_color">Single Image (True Color)</option>
                  <option value="ndvi">Single Image (NDVI)</option>
                  <option value="temporal_list">Image List (Temporal)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white font-bold py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                <PipelineIcon />
                {isLoading ? "Processing..." : "Run Pipeline"}
              </button>
            </form>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-2 bg-gray-900/60 backdrop-blur-sm p-4 rounded-lg overflow-hidden w-full">
            <div
              className="w-full bg-gray-800/50 rounded-lg flex items-center justify-center overflow-hidden"
              style={{ height: "100%" }}
            >
              <ViewerContent />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
