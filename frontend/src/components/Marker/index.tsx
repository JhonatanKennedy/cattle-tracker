import { Marker } from "react-map-gl/maplibre";
import CowPNG from "@/assets/cow.png";

type TCowMarker = {
  longitude: number;
  latitude: number;
};

export function CowMarker({ latitude, longitude }: TCowMarker) {
  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom">
      <img src={CowPNG} height="25px" width="30px" />
    </Marker>
  );
}
