export default function StatSection() {
  return (
    <section
      style={{
        minHeight: "100vh",
        position: "relative",    // needed so z-index works
        zIndex: 2,
        background: "linear-gradient(155deg, #06125C 0%, #0a1c8a 55%, #0D26C2 100%)",
        boxShadow: "0 -30px 60px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white"
      }}
    >
      {/* your content */}
    </section>
  );
}