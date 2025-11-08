import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useState } from "react";
import { MapSquare } from "../MapSquare";
import { CowMarker } from "../Marker";

export function CattleMap() {
  const [markerPos, setMarkerPos] = useState({
    longitude: -34.950969,
    latitude: -8.055719,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMarkerPos((prev) => {
        const angle = Math.random() * 2 * Math.PI;

        // 10 metros em graus (aproximadamente)
        // 1 grau de latitude ≈ 111km
        // 10m = 0.00009 graus
        const distance = 0.00009;

        const deltaLat = distance * Math.cos(angle);
        const deltaLng =
          (distance * Math.sin(angle)) /
          Math.cos((prev.latitude * Math.PI) / 180);

        return {
          latitude: prev.latitude + deltaLat,
          longitude: prev.longitude + deltaLng,
        };
      });
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, []);

  return (
    <Map
      initialViewState={{
        longitude: -34.950969,
        latitude: -8.055719,
        zoom: 15,
        bearing: 0,
        pitch: 0,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
    >
      <MapSquare
        latitude={-8.055719}
        longitude={-34.950969}
        squareDistance={0.0003}
      />

      <CowMarker
        longitude={markerPos.longitude}
        latitude={markerPos.latitude}
      />

      <CowMarker
        longitude={markerPos.longitude + 0.0005}
        latitude={markerPos.latitude + 0.0005}
      />
    </Map>
  );
}

// longitude={-34.950969} latitude={-8.055719}
