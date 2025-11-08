export function UpState({ connected }: { connected: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        right: 20,
        zIndex: 1,
        background: connected ? "#10b981" : "#ef4444",
        color: "white",
        padding: "8px 16px",
        borderRadius: "8px",
        fontWeight: "bold",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      }}
    >
      {connected ? "🟢 Conectado" : "🔴 Desconectado"}
    </div>
  );
}
