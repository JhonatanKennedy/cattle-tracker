import type { Feature, Polygon } from "geojson";
import { Layer, Source } from "react-map-gl/maplibre";

type TMapSquare = {
  latitude: number;
  longitude: number;
  squareDistance: number;
};

export function MapSquare({ latitude, longitude, squareDistance }: TMapSquare) {
  const halfDist = squareDistance / 2;

  // Ajuste para longitude considerando latitude
  const lngAdjust = halfDist / Math.cos((latitude * Math.PI) / 180);

  const square: Feature<Polygon> = {
    type: "Feature",
    properties: [],
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [longitude - lngAdjust, latitude + halfDist], // top-left
          [longitude + lngAdjust, latitude + halfDist], // top-right
          [longitude + lngAdjust, latitude - halfDist], // bottom-right
          [longitude - lngAdjust, latitude - halfDist], // bottom-left
          [longitude - lngAdjust, latitude + halfDist], // fecha o polígono
        ],
      ],
    },
  };

  return (
    <Source id="square" type="geojson" data={square}>
      <Layer
        id="square-fill"
        type="fill"
        paint={{
          "fill-color": "#3b82f6",
          "fill-opacity": 0.3,
        }}
      />
      <Layer
        id="square-outline"
        type="line"
        paint={{
          "line-color": "#2563eb",
          "line-width": 2,
        }}
      />
    </Source>
  );
}
