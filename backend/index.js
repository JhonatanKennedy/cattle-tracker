const express = require("express");
const http = require("http");
const net = require("net");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const AREA_CONFIG = {
  latitude: -8.055719,
  longitude: -34.950969,
  squareDistance: 0.001,
};

const INACTIVE_TIMEOUT = 60000;

let markers = [];
let allMarkersRegistry = new Map();

const coojaServer = net.createServer((socket) => {
  console.log("Cooja conectado na porta 5000");

  let buffer = "";

  socket.on("data", (data) => {
    buffer += data.toString();

    let startIdx, endIdx;
    while (
      (startIdx = buffer.indexOf("===DATA_START===")) !== -1 &&
      (endIdx = buffer.indexOf("===DATA_END===")) !== -1
    ) {
      const message = buffer.substring(
        startIdx + "===DATA_START===".length,
        endIdx
      );
      buffer = buffer.substring(endIdx + "===DATA_END===".length);

      processMessage(message);
    }
  });

  socket.on("end", () => {
    console.log("Cooja desconectado da porta 5000");
  });

  socket.on("error", (err) => {
    console.error("Erro na conexão com Cooja:", err);
  });
});

function isInsideArea(lat, lon) {
  const { latitude, longitude, squareDistance } = AREA_CONFIG;
  const halfDist = squareDistance / 2;
  
  const lngAdjust = halfDist / Math.cos((latitude * Math.PI) / 180);
  
  return (
    lat >= latitude - halfDist &&
    lat <= latitude + halfDist &&
    lon >= longitude - lngAdjust &&
    lon <= longitude + lngAdjust
  );
}

function processMessage(message) {
  const lines = message.trim().split("\n");
  const data = {};

  lines.forEach((line) => {
    const [key, value] = line.split(": ");
    if (key && value) {
      data[key.trim()] = value.trim();
    }
  });

  if (data.SENDER && data.GPS_LAT && data.GPS_LON) {
    const senderId = data.SENDER;
    const latitude = parseFloat(data.GPS_LAT);
    const longitude = parseFloat(data.GPS_LON);

    if (!isNaN(latitude) && !isNaN(longitude)) {
      updateMarker(senderId, latitude, longitude, data);

      console.log(`\n Boi ${senderId}:`);
      console.log(`Latitude:  ${latitude.toFixed(6)}°`);
      console.log(`Longitude: ${longitude.toFixed(6)}°`);
      console.log(`Sequência: ${data.SEQNO || "N/A"}`);
      console.log(`Hops:      ${data.HOPS || "N/A"}`);
      console.log(`Timestamp: ${data.TIMESTAMP || "N/A"}`);
    }
  }
}

function updateMarker(senderId, latitude, longitude, additionalData) {
  const existingIndex = markers.findIndex((m) => m.id === senderId);
  const now = new Date();
  
  const insideArea = isInsideArea(latitude, longitude);

  const markerData = {
    id: senderId,
    latitude: latitude,
    longitude: longitude,
    seqno: additionalData.SEQNO || null,
    hops: additionalData.HOPS || null,
    timestamp: additionalData.TIMESTAMP || null,
    lastUpdate: now.toISOString(),
    lastUpdateTime: now.getTime(),
    isActive: true,
    insideArea: insideArea,
  };

  if (!allMarkersRegistry.has(senderId)) {
    allMarkersRegistry.set(senderId, {
      firstSeen: now.toISOString(),
      totalUpdates: 0,
    });
    console.log(`\n NOVO MARKER REGISTRADO: ${senderId}`);
  }

  const registry = allMarkersRegistry.get(senderId);
  registry.totalUpdates++;
  registry.lastSeen = now.toISOString();
  registry.isActive = true;

  if (!insideArea) {
    console.log(`\nALERTA: Boi ${senderId} FORA DA ÁREA DELIMITADA!`);
    console.log(`   Posição: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    
    io.emit("area-alert", {
      id: senderId,
      latitude: latitude,
      longitude: longitude,
      timestamp: now.toISOString(),
    });
  }

  if (existingIndex !== -1) {
    markers[existingIndex] = markerData;
  } else {
    markers.push(markerData);
  }

  io.emit("markers-update", markers);
}

setInterval(() => {
  const now = Date.now();
  let hasInactive = false;

  markers.forEach((marker) => {
    const timeSinceLastUpdate = now - marker.lastUpdateTime;

    if (timeSinceLastUpdate > INACTIVE_TIMEOUT && marker.isActive) {
      marker.isActive = false;
      hasInactive = true;

      const registry = allMarkersRegistry.get(marker.id);
      if (registry) {
        registry.isActive = false;
        registry.inactiveSince = new Date().toISOString();
      }

      console.log(`\n ALERTA: Boi ${marker.id} ESTÁ INATIVO!`);
      console.log(`   Última atualização: ${marker.lastUpdate}`);
      console.log(`   Tempo sem resposta: ${Math.round(timeSinceLastUpdate / 1000)}s`);

      io.emit("marker-inactive", {
        id: marker.id,
        lastUpdate: marker.lastUpdate,
        inactiveFor: timeSinceLastUpdate,
      });
    }
  });

  if (hasInactive) {
    io.emit("markers-update", markers);
  }
}, 10000);

coojaServer.listen(5000, () => {
  console.log("Servidor TCP aguardando dados do Cooja na porta 5000");
});

io.on("connection", (socket) => {
  console.log("Cliente web conectado:", socket.id);

  socket.emit("markers-update", markers);

  socket.emit("area-config", AREA_CONFIG);

  socket.emit("markers-registry", Array.from(allMarkersRegistry.entries()).map(([id, data]) => ({
    id,
    ...data,
  })));

  socket.on("disconnect", () => {
    console.log("Cliente web desconectado:", socket.id);
  });


  socket.on("get-registry", () => {
    socket.emit("markers-registry", Array.from(allMarkersRegistry.entries()).map(([id, data]) => ({
      id,
      ...data,
    })));
  });

  socket.on("update-area-config", (config) => {
    if (config.squareDistance !== undefined) AREA_CONFIG.squareDistance = config.squareDistance;
    if (config.latitude !== undefined) AREA_CONFIG.latitude = config.latitude;
    if (config.longitude !== undefined) AREA_CONFIG.longitude = config.longitude;
    
    io.emit("area-config", AREA_CONFIG);
    console.log(`\n Área atualizada: centro (${AREA_CONFIG.latitude}, ${AREA_CONFIG.longitude}), distância ${AREA_CONFIG.squareDistance}`);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Servidor HTTP/WebSocket rodando na porta ${PORT}`);
  console.log(`Aguardando dados do Cooja na porta 5000`);
});

process.on("uncaughtException", (err) => {
  console.error("Erro não tratado:", err);
});

process.on("SIGINT", () => {
  console.log("\nEncerrando servidor...");
  console.log(`\n Resumo da sessão:`);
  console.log(`   Total de markers registrados: ${allMarkersRegistry.size}`);
  allMarkersRegistry.forEach((data, id) => {
    console.log(`   - Boi ${id}: ${data.totalUpdates} atualizações`);
  });
  coojaServer.close();
  server.close();
  process.exit(0);
});