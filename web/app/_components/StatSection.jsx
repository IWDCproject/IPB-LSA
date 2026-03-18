import StatCard from "./stats-stuff/StatCard";
import Button from "@/components/Button";
import UniversityMarquee from "@/components/UniversityMarquee";

import universities from "./stats-stuff/2.jpg";
import athletes     from "./stats-stuff/2.jpg";
import events       from "./stats-stuff/2.jpg";

const stats = [
  { image_url: universities.src, main_stat: "4.000+", label_stat: "Participants",    width: 470 },
  { image_url: athletes.src,     main_stat: "28+",    label_stat: "Universities",    width: 280 },
  { image_url: events.src,       main_stat: "168+",   label_stat: "Official Events", width: 280 },
];

export default function StatSection() {
  return (
    <section
      style={{
        padding: "150px 0 0 0",
        minHeight: "100vh",
        position: "relative",
        zIndex: 2,
        background: "linear-gradient(to bottom, #06125C 5%, #0D26C2 100%)",
        boxShadow: "0 -30px 60px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* Outer col: row flex utama + marquee */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "100px",
          width: "100%",
        }}
      >
        {/* Row flex utama */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start", 
            gap: "14px",
            marginLeft: "160px",
            marginRight: "160px",
            
          }}
        >
          {/* Stat cards */}
          {stats.map((stat, i) => (
            <StatCard
              key={i}
              image_url={stat.image_url}
              width={stat.width}
              main_stat={stat.main_stat}
              label_stat={stat.label_stat}
            />
          ))}

          {/* Text + button col */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "24px",
              flex: 1,
              paddingLeft: "40px",
            }}
          >
            <div
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "clamp(2.8rem, 4vw, 4rem)",
                lineHeight: 1,
                textAlign: "right",
                color: "#ffffff",
                filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.25))",
              }}
            >
              <div>Are you ready to</div>
              <div>Prove Yourself?</div>
            </div>
            <Button href="/events" variant="primary" size="md">
              See Events
            </Button>
          </div>
        </div>

        {/* University marquee */}
        <UniversityMarquee />
      </div>
    </section>
  );
}