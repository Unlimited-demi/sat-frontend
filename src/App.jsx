import React, { useState, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- Leaflet Icon Fix ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// --- Configuration ---
const API_BASE_URL = "https://sat-backend-55lg.onrender.com";

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
);

const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
);

// --- Map Interaction Component ---
function MapClickHandler({ setParams }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setParams(prevParams => ({
        ...prevParams,
        lat: parseFloat(lat.toFixed(4)),
        lon: parseFloat(lng.toFixed(4)),
      }));
    },
  });
  return null;
}

// --- Main App Component ---
function App() {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const [params, setParams] = useState({
    lat: 6.5244,
    lon: 3.3792,
    startDate: sevenDaysAgo.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
    scriptType: 'true_color',
  });

  const [displayedImage, setDisplayedImage] = useState(null);
  const [temporalResults, setTemporalResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('Select an area and define a processing job.');
  const markerRef = useRef(null);

  const handleParamChange = e => {
    setParams({ ...params, [e.target.name]: e.target.value });
  };

  const handleFetchImage = async e => {
    e.preventDefault();

    setIsLoading(true);
    setError('');
    setDisplayedImage(null);
    setTemporalResults([]);
    setInfo(`Submitting job to Sentinel pipeline...`);

    try {
      if (params.scriptType === 'temporal_list') {
        const response = await axios.post(`${API_BASE_URL}/api/sentinel-hub/process`, params);
        if (response.data.results && response.data.results.length > 0) {
          setTemporalResults(response.data.results);
          setInfo(`Successfully fetched ${response.data.results.length} images.`);
        } else {
          setInfo('No images found for the selected criteria.');
        }
      } else {
        const response = await axios.post(
          `${API_BASE_URL}/api/sentinel-hub/process`,
          params,
          { responseType: 'blob' }
        );
        const imageUrl = URL.createObjectURL(response.data);
        setDisplayedImage(imageUrl);
        setInfo(`Successfully processed and loaded image.`);
      }
    } catch (err) {
      const errorDetail =
        err.response?.data?.detail || 'An unknown error occurred. Check the backend logs.';
      setError(`Pipeline failed: ${errorDetail}`);
      setInfo('');
      console.error('Fetch image error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- UI Rendering ---
  const ViewerContent = () => {
    if (isLoading) return <LoadingSpinner />;
    if (error)
      return (
        <div className="text-red-400 text-center p-4">
          <p className="font-bold mb-2">Pipeline Error</p>
          <p className="text-sm">{error}</p>
        </div>
      );

    if (temporalResults.length > 0) {
      return (
        <div className="w-full h-full overflow-y-auto p-2 space-y-4">
          {temporalResults.map((result, index) => (
            <div key={index} className="bg-gray-900 rounded-lg p-2">
              <img
                src={result.image}
                alt={`Scene from ${result.date}`}
                className="w-full h-auto object-contain rounded-md"
              />
              <p className="text-xs text-center text-gray-400 mt-1">
                {new Date(result.date).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      );
    }

    if (displayedImage) {
      return (
        <img
          src={displayedImage}
          alt="Processed satellite view"
          className="w-full h-full object-contain"
        />
      );
    }

    return <p className="text-gray-500 px-4 text-center">{info}</p>;
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            Satellite Data Pipeline
          </h1>
          <p className="text-gray-400 mt-2">Define and run on-demand processing jobs in the cloud.</p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-2xl h-fit">
            <form onSubmit={handleFetchImage}>
              <h3 className="text-lg font-semibold mb-2 text-gray-200">1. Select Area of Interest</h3>
              <div className="h-64 w-full mb-4 rounded-lg overflow-hidden z-0">
                <MapContainer
                  center={[params.lat, params.lon]}
                  zoom={10}
                  scrollWheelZoom={true}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[params.lat, params.lon]} ref={markerRef} />
                  <MapClickHandler setParams={setParams} />
                </MapContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="lat" className="block text-sm font-medium text-gray-300 mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="lat"
                    id="lat"
                    value={params.lat}
                    onChange={handleParamChange}
                    className="bg-gray-700 w-full p-2.5 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="lon" className="block text-sm font-medium text-gray-300 mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="lon"
                    id="lon"
                    value={params.lon}
                    onChange={handleParamChange}
                    className="bg-gray-700 w-full p-2.5 rounded-lg"
                  />
                </div>
              </div>

              <h3 className="text-lg font-semibold mt-6 mb-2 text-gray-200">
                2. Time Range & Processing
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    id="startDate"
                    value={params.startDate}
                    onChange={handleParamChange}
                    className="bg-gray-700 w-full p-2.5 rounded-lg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="endDate"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    End Date
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    id="endDate"
                    value={params.endDate}
                    onChange={handleParamChange}
                    className="bg-gray-700 w-full p-2.5 rounded-lg"
                  />
                </div>
              </div>
              <div className="mb-6">
                <label
                  htmlFor="scriptType"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Processing Type
                </label>
                <select
                  id="scriptType"
                  name="scriptType"
                  value={params.scriptType}
                  onChange={handleParamChange}
                  className="bg-gray-700 w-full p-2.5 rounded-lg"
                >
                  <option value="true_color">Single Image (True Color)</option>
                  <option value="ndvi">Single Image (NDVI)</option>
                  <option value="temporal_list">Image List (Temporal)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105"
              >
                <PipelineIcon />
                {isLoading ? 'Processing...' : 'Run Pipeline'}
              </button>
            </form>
          </div>

          <div
            className="lg:col-span-3 bg-gray-800 p-6 rounded-lg shadow-2xl flex flex-col items-center justify-center"
            style={{ height: '720px' }}
          >
            <div className="w-full h-full flex items-center justify-center bg-black rounded-md overflow-hidden">
              <ViewerContent />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
