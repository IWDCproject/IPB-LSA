// Purely presentational — no state, no logic.
// Renders the hero banner: left mascot + title block + right mascot.

export function ScheduleHero() {
  return (
    <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 mt-10 mb-16">

      {/* Left side: male mascot + title */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 md:gap-10 w-full md:w-auto">
        <div className="hidden sm:block shrink-0">
          <img
            src="/maskot/Cowok%20Suka.png"
            alt=""
            className="w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 object-contain drop-shadow-2xl"
          />
        </div>

        <div className="text-center sm:text-left flex-1">
          <h1 className="text-5xl md:text-[65px] lg:text-[80px] font-display font-black uppercase tracking-wide leading-[1.05] text-white drop-shadow-lg">
            MATCH & EVENT <br className="hidden md:block" />
            <span className="text-yellow-400">SCHEDULES</span>
          </h1>
          <p className="text-blue-100 text-sm md:text-base mt-4 font-bold tracking-wide uppercase">
            Pantau jadwal dari seluruh kompetisi olahraga dan seni
          </p>
        </div>
      </div>

      {/* Right side: female mascot (mirrored) */}
      <div className="hidden md:block relative z-10 shrink-0">
        <img
          src="/maskot/Cewek%20Semangat.png"
          alt=""
          className="w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 object-contain drop-shadow-2xl scale-x-[-1]"
        />
      </div>

    </div>
  );
}