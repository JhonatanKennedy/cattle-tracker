const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

let markers = [
  {
    id: 1,
    latitude: -8.055725,
    longitude: -34.950969,
  },
  {
    id: 2,
    latitude: -8.05571,
    longitude: -34.950969,
  },
  {
    id: 3,
    latitude: -8.055719,
    longitude: -34.950969,
  },
];

function moveMarker(marker) {
  const angle = Math.random() * 2 * Math.PI;
  const distance = 0.00009;

  const deltaLat = distance * Math.cos(angle);
  const deltaLng =
    (distance * Math.sin(angle)) / Math.cos((marker.latitude * Math.PI) / 180);

  return {
    id: marker.id,
    latitude: marker.latitude + deltaLat,
    longitude: marker.longitude + deltaLng,
  };
}

function updateAllMarkers() {
  markers = markers.map((marker) => moveMarker(marker));
  return markers;
}

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  socket.emit("markers-update", markers);

  const interval = setInterval(() => {
    const updatedMarkers = updateAllMarkers();
    io.emit("markers-update", updatedMarkers);
  }, 10000);

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
    clearInterval(interval);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
