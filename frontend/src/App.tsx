import { CattleMap } from "@/components/Map";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { UpState } from "./components/UpState";

function App() {
  const [markersPos, setMarkersPos] = useState([]);

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io("http://localhost:3001");

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("markers-update", (markers) => {
      setMarkersPos(markers);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
      }}
    >
      <UpState connected={connected} />
      <CattleMap markers={markersPos} />
    </div>
  );
}

export default App;
