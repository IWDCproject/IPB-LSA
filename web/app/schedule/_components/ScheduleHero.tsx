import React from "react";

/*
  @keyframes ini idealnya dipindah ke global CSS (misalnya globals.css atau
  tailwind.config.js > theme.extend.keyframes) supaya nggak di-inject ulang ke DOM
  tiap kali komponen ini mount/remount.
*/
const fadeUp = (delay: string): React.CSSProperties => ({
  opacity: 0,
  animation: `hero-in 500ms ease forwards`,
  animationDelay: delay,
});

export function ScheduleHero() {
  return (
    <>
      <style>{`
        @keyframes hero-in {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes hero-in-left {
          from { opacity: 0; transform: translate(-24px, calc(-50% + 18px)); }
          to   { opacity: 1; transform: translate(0,     -50%);              }
        }
        @keyframes hero-in-right {
          from { opacity: 0; transform: translate(24px, calc(-50% + 18px)); }
          to   { opacity: 1; transform: translate(0,    -50%);              }
        }
      `}</style>

      <div className="relative flex items-center justify-center mt-10 mb-16">

        <div
          className="absolute left-0 hidden sm:block z-10"
          style={{ top: "50%", opacity: 0, animation: "hero-in-left 500ms ease 100ms forwards" }}
        >
          <img
            src="/maskot/Cowok%20Suka.png"
            alt=""
            className="w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 object-contain drop-shadow-2xl"
          />
        </div>

        <div className="text-center z-10 px-4">
          <h1
            className="font-bebas drop-shadow-md uppercase leading-none text-white"
            style={{
              fontSize: "clamp(3rem, 4.5vw, 4rem)",
              filter: "drop-shadow(4px 6px 8px rgba(0,0,0,0.2))",
              ...fadeUp("0ms"),
            }}
          >
            MATCH & EVENT SCHEDULES
          </h1>
          <p
            className="font-jakarta"
            style={{
              margin: "0px 0 10px",
              fontSize: "clamp(12px, 1.4vw, 14px)",
              color: "rgba(255,255,255,0.7)",
              filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.2))",
              fontWeight: 600,
              ...fadeUp("120ms"),
            }}
          >
            Pantau jadwal dari seluruh kompetisi olahraga dan seni
          </p>
        </div>

        <div
          className="absolute right-0 hidden md:block z-10"
          style={{ top: "50%", opacity: 0, animation: "hero-in-right 500ms ease 100ms forwards" }}
        >
          <img
            src="/maskot/Cewek%20Semangat.png"
            alt=""
            className="w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 object-contain drop-shadow-2xl scale-x-[-1]"
          />
        </div>

      </div>
    </>
  );
}