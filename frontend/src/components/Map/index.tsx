import Map from "react-map-gl/maplibre";
import { MapSquare } from "../MapSquare";
import { CowMarker } from "../Marker";
import "maplibre-gl/dist/maplibre-gl.css";

type TCattleMapProps = {
  markers: {
    id: number;
    latitude: number;
    longitude: number;
  }[];
};

export function CattleMap({ markers }: TCattleMapProps) {
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
