import StatCard from "./stats-stuff/StatCard";

import universities from "./stats-stuff/2.jpg";
import athletes     from "./stats-stuff/2.jpg";
import events       from "./stats-stuff/2.jpg";

const stats = [
  { image_url: universities.src, main_stat: "4.000+",  label_stat: "Participants",      width: 470 },
  { image_url: athletes.src,     main_stat: "28+",     label_stat: "Universities",      width: 280 },
  { image_url: events.src,       main_stat: "168+",    label_stat: "Official Events",   width: 280 },
];

export default function StatSection() {
  return (
    <section
      style={{
        minHeight: "100vh",
        position: "relative",
        zIndex: 2,
        background: "linear-gradient(155deg, #06125C 0%, #0a1c8a 55%, #0D26C2 100%)",
        boxShadow: "0 -30px 60px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        color: "white",
      }}
    >
      {/* Row flex utama*/}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "14px",
          marginLeft: "160px",
          marginRight: "160px",
        }}
      >
        {stats.map((stat, i) => (
          <StatCard
            key={i}
            image_url={stat.image_url}
            width={stat.width}
            main_stat={stat.main_stat}
            label_stat={stat.label_stat}
          />
        ))}
      </div>
    </section>
  );
}