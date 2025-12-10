type Device = {
  hops: string;
  id: string;
  insideArea: boolean;
  isActive: boolean;
  lastUpdate: string;
  lastUpdateTime: number;
  latitude: number;
  longitude: number;
  seqno: string;
  timestamp: string;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffSecs < 60) {
    return `há ${diffSecs}s`;
  } else if (diffMins < 60) {
    return `há ${diffMins}min`;
  } else if (diffHours < 24) {
    return `há ${diffHours}h`;
  } else {
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

function getStatusInfo(device: Device) {
  if (!device.isActive) {
    return {
      label: "Inativo",
      color: "#ef4444",
      icon: "🔴"
    };
  }
  
  if (!device.insideArea) {
    return {
      label: "Fora da Área",
      color: "#f59e0b",
      icon: "⚠️"
    };
  }
  
  return {
    label: "Ativo",
    color: "#10b981",
    icon: "🟢"
  };
}

function DeviceItem({ device }: { device: Device }) {
  const status = getStatusInfo(device);
  
  return (
    <div
      style={{
        background: "white",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "12px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        border: `2px solid ${status.color}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ fontWeight: "bold", fontSize: "16px" }}>
          ID: {device.id}
        </div>
        <div
          style={{
            background: status.color,
            color: "white",
            padding: "4px 12px",
            borderRadius: "6px",
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          {status.icon} {status.label}
        </div>
      </div>
      
      <div style={{ fontSize: "14px", color: "#666", display: "grid", gap: "4px" }}>
        <div>📍 Lat: {device.latitude.toFixed(6)}, Lon: {device.longitude.toFixed(6)}</div>
        <div>🕐 Última atualização: {formatDate(device.lastUpdate)}</div>
      </div>
    </div>
  );
}

export default function DeviceList({ devices }: { devices: Device[] }) {
  const activeCount = devices.filter(d => d.isActive && d.insideArea).length;
  const inactiveCount = devices.filter(d => !d.isActive).length;
  const outsideCount = devices.filter(d => d.isActive && !d.insideArea).length;

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: 20,
        zIndex: 1,
        background: "rgba(255, 255, 255, 0.95)",
        borderRadius: "12px",
        padding: "20px",
        maxHeight: "calc(100vh - 40px)",
        width: "400px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        overflow: "auto",
      }}
    >
      <h2 style={{ margin: "0 0 16px 0", fontSize: "20px", fontWeight: "bold" }}>
        Gado ({devices.length})
      </h2>
      
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", fontSize: "12px" }}>
        <div style={{ background: "#10b981", color: "white", padding: "4px 8px", borderRadius: "4px" }}>
          🟢 Ativos: {activeCount}
        </div>
        <div style={{ background: "#f59e0b", color: "white", padding: "4px 8px", borderRadius: "4px" }}>
          ⚠️ Fora: {outsideCount}
        </div>
        <div style={{ background: "#ef4444", color: "white", padding: "4px 8px", borderRadius: "4px" }}>
          🔴 Inativos: {inactiveCount}
        </div>
      </div>

      {devices.length === 0 ? (
        <div style={{ textAlign: "center", color: "#999", padding: "20px" }}>
          Nenhum dispositivo encontrado
        </div>
      ) : (
        devices.map(device => (
          <DeviceItem key={device.id} device={device} />
        ))
      )}
    </div>
  );
}