import Map from "react-map-gl/maplibre";
import { MapSquare } from "../MapSquare";
import { CowMarker } from "../Marker";
import "maplibre-gl/dist/maplibre-gl.css";

export type TMarker = {
  hops: string
  id: string
  insideArea: boolean
  isActive: boolean
  lastUpdate: string
  lastUpdateTime: number
  latitude: number
  longitude: number
  seqno: string
  timestamp: string
}

type TCattleMapProps = {
  markers:TMarker[];
};

export function CattleMap({ markers }: TCattleMapProps) {
  const hasFugitive = markers.some(marker => !marker.insideArea || !marker.isActive)

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
        squareDistance={0.001}
        isFugitive={hasFugitive}
      />

      {markers.map((marker) => (
        <CowMarker
          key={marker.id}
          longitude={marker.longitude}
          latitude={marker.latitude}
        />
      ))}
    </Map>
  );
}

// longitude={-34.950969} latitude={-8.055719}
