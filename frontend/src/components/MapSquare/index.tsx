import type { Feature, Polygon } from "geojson";
import { Layer, Source } from "react-map-gl/maplibre";

type TMapSquare = {
  latitude: number;
  longitude: number;
  squareDistance: number;
  isFugitive: boolean
};

export function MapSquare({ latitude, longitude, squareDistance,isFugitive }: TMapSquare) {
  const halfDist = squareDistance / 2;

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
          [longitude - lngAdjust, latitude + halfDist], // fecha o poligono
        ],
      ],
    },
  };

  const borderColor = isFugitive ? "#dc2626" : "#2563eb"
  const fillColor = isFugitive ? "#ef4444" : "#3b82f6"

  return (
    <Source id="square" type="geojson" data={square}>
      <Layer
        id="square-fill"
        type="fill"
        paint={{
          "fill-color": fillColor,
          "fill-opacity": 0.3,
        }}
      />
      <Layer
        id="square-outline"
        type="line"
        paint={{
          "line-color": borderColor,
          "line-width": 2,
        }}
      />
    </Source>
  );
}
