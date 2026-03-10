import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useTranslation } from "react-i18next";

const APARTMENT_META = [
  {
    id: "fruehling",
    color: "#2563eb",
  },
  {
    id: "hackerberg",
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

export default function CommuteCalculator({ title, className = "" }) {
  const { t } = useTranslation();
  const [siteAddress, setSiteAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sitePoint, setSitePoint] = useState(null);
  const [results, setResults] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const apartments = useMemo(
    () =>
      APARTMENT_META.map((apartment) => ({
        ...apartment,
        name: t(`commute.apartments.${apartment.id}.name`),
        address: t(`commute.apartments.${apartment.id}.address`),
      })),
    [t]
  );

  const heading = title || t("commute.title");

  const geocodeAddress = async (address) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(t("commute.errors.addressSearchFailed"));
    }

    const searchResults = await response.json();
    if (!searchResults.length) {
      throw new Error(t("commute.errors.addressNotFound"));
    }

    return {
      lat: Number(searchResults[0].lat),
      lng: Number(searchResults[0].lon),
      label: searchResults[0].display_name,
    };
  };

  const calculateRoute = async (from, to) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(t("commute.errors.routeFailed"));
    }

    const data = await response.json();
    if (!data.routes || !data.routes.length) {
      throw new Error(t("commute.errors.noRoute"));
    }

    const route = data.routes[0];
    return {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    };
  };

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
      setError(t("commute.errors.emptyAddress"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const site = await geocodeAddress(siteAddress.trim());
      setSitePoint(site);

      const computed = [];
      for (const apartment of apartments) {
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
      setError(err.message || t("commute.errors.generic"));
      setResults([]);
      setSitePoint(null);
      setSelectedRoute(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`bg-white rounded-2xl shadow-lg border border-blue-100 p-6 ${className}`}>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">{heading}</h2>
      <p className="text-gray-600 mb-5">
        {t("commute.intro")}
      </p>

      <form onSubmit={handleCalculate} className="flex flex-col md:flex-row gap-3 mb-5">
        <input
          type="text"
          value={siteAddress}
          onChange={(e) => setSiteAddress(e.target.value)}
          placeholder={t("commute.placeholder")}
          className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 py-3 rounded-xl transition"
        >
          {loading ? t("commute.calculating") : t("commute.submit")}
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
                  {t("commute.distanceDuration", {
                    distance: result.distanceKm.toFixed(1),
                    duration: Math.round(result.durationMin),
                  })}
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
                  <Popup>{t("commute.siteLabel")}</Popup>
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
            {t("commute.note")}
          </p>
        </>
      )}
    </section>
  );
}
