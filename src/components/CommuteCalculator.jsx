import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";

const APARTMENTS = [
  {
    id: "fruehling",
    name: "Fruehlingstrasse - Neubau",
    address: "Fruehlingstrasse 8, 82152 Krailling, Deutschland",
    color: "#2563eb",
  },
  {
    id: "hackerberg",
    name: "Hackerberg - Penthouse",
    address: "Hackerberg 4, 82152 Krailling, Deutschland",
    color: "#16a34a",
  },
];

function FitToRoutes({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);

  return null;
}

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Adresssuche fehlgeschlagen");
  }

  const results = await response.json();
  if (!results.length) {
    throw new Error("Adresse nicht gefunden. Bitte genauer eingeben.");
  }

  return {
    lat: Number(results[0].lat),
    lng: Number(results[0].lon),
    label: results[0].display_name,
  };
}

async function calculateRoute(from, to) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Routenberechnung fehlgeschlagen");
  }

  const data = await response.json();
  if (!data.routes || !data.routes.length) {
    throw new Error("Keine Route gefunden");
  }

  const route = data.routes[0];
  return {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  };
}

export default function CommuteCalculator({ title = "Entfernung zur Baustelle", className = "" }) {
  const [siteAddress, setSiteAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sitePoint, setSitePoint] = useState(null);
  const [results, setResults] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const mapPoints = useMemo(() => {
    const points = [];
    if (sitePoint) points.push(sitePoint);
    for (const result of results) {
      if (result.apartmentPoint) points.push(result.apartmentPoint);
    }
    return points;
  }, [sitePoint, results]);

  const visibleResults = selectedRoute
    ? results.filter((r) => r.apartment.id === selectedRoute)
    : results;

  const handleCalculate = async (e) => {
    e.preventDefault();
    if (!siteAddress.trim()) {
      setError("Bitte geben Sie eine Baustellenadresse ein.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const site = await geocodeAddress(siteAddress.trim());
      setSitePoint(site);

      const computed = [];
      for (const apartment of APARTMENTS) {
        const apartmentPoint = await geocodeAddress(apartment.address);
        const route = await calculateRoute(site, apartmentPoint);

        computed.push({
          apartment,
          apartmentPoint,
          ...route,
        });
      }

      computed.sort((a, b) => a.durationMin - b.durationMin);
      setResults(computed);
      setSelectedRoute(computed[0]?.apartment.id || null);
    } catch (err) {
      setError(err.message || "Die Berechnung konnte nicht durchgefuehrt werden.");
      setResults([]);
      setSitePoint(null);
      setSelectedRoute(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`bg-white rounded-2xl shadow-lg border border-blue-100 p-6 ${className}`}>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-600 mb-5">
        Geben Sie die Adresse Ihrer Baustelle ein. Wir berechnen automatisch Fahrzeit und Entfernung zu beiden Wohnungen.
      </p>

      <form onSubmit={handleCalculate} className="flex flex-col md:flex-row gap-3 mb-5">
        <input
          type="text"
          value={siteAddress}
          onChange={(e) => setSiteAddress(e.target.value)}
          placeholder="z.B. Landsberger Strasse 312, 80687 Muenchen"
          className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 py-3 rounded-xl transition"
        >
          {loading ? "Berechne..." : "Route berechnen"}
        </button>
      </form>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {results.map((result) => (
              <button
                key={result.apartment.id}
                type="button"
                onClick={() => setSelectedRoute(result.apartment.id)}
                className={`text-left rounded-xl border-2 p-4 transition ${
                  selectedRoute === result.apartment.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <p className="font-bold text-gray-800 mb-1">{result.apartment.name}</p>
                <p className="text-sm text-gray-500 mb-3">{result.apartment.address}</p>
                <p className="text-sm text-gray-700">
                  <strong>{result.distanceKm.toFixed(1)} km</strong> - ca. <strong>{Math.round(result.durationMin)} Min.</strong>
                </p>
              </button>
            ))}
          </div>

          <div className="h-[420px] rounded-xl overflow-hidden border border-gray-200">
            <MapContainer center={[48.11, 11.42]} zoom={11} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {sitePoint && (
                <CircleMarker center={[sitePoint.lat, sitePoint.lng]} radius={10} pathOptions={{ color: "#111827", fillColor: "#111827", fillOpacity: 1 }}>
                  <Popup>Baustelle</Popup>
                </CircleMarker>
              )}

              {visibleResults.map((result) => (
                <CircleMarker
                  key={`marker-${result.apartment.id}`}
                  center={[result.apartmentPoint.lat, result.apartmentPoint.lng]}
                  radius={9}
                  pathOptions={{ color: result.apartment.color, fillColor: result.apartment.color, fillOpacity: 1 }}
                >
                  <Popup>{result.apartment.name}</Popup>
                </CircleMarker>
              ))}

              {visibleResults.map((result) => (
                <Polyline
                  key={`line-${result.apartment.id}`}
                  positions={result.geometry}
                  pathOptions={{ color: result.apartment.color, weight: 5, opacity: 0.85 }}
                />
              ))}

              <FitToRoutes points={mapPoints} />
            </MapContainer>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Hinweis: Fahrzeiten basieren auf aktueller Routenschaetzung (Auto) und koennen je nach Verkehr variieren.
          </p>
        </>
      )}
    </section>
  );
}
