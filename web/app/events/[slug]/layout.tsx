// web/app/events/[slug]/layout.tsx
import UniversityMarquee from "@/components/UniversityMarquee";
import Footer from "@/components/Footer";
import { KEYFRAMES } from "./_components/shared/Animations";

export default function EventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <div
        className="relative min-h-[calc(100vh-64px)] flex flex-col overflow-x-hidden"
        style={{ background: "linear-gradient(to bottom, #0D26C2 30%, #06125C)" }}
      >
        {/* Batik pattern overlay */}
        <div className="absolute top-0 left-0 right-0 h-full z-0 opacity-0 animate-edc-fade-in">
          <div
            className="absolute left-0 right-0 max-h-[1200px] opacity-40 pointer-events-none bg-repeat-x"
            style={{
              top: -100, height: "100%",
              backgroundImage: "url(/Batik_Pattern_dark.svg)",
              backgroundSize: "1400px auto",
              backgroundPosition: "top center",
              transform: "scaleY(-1)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, black 250px)",
              maskImage:        "linear-gradient(to bottom, transparent 0px, black 250px)",
            }}
          />
        </div>

        {/* Main content shell */}
        <div className="relative z-10 flex-1 flex flex-col">
          <div className="flex-[1_0_auto] min-h-[calc(100vh-64px)]">
            {children}
            
            <div className="opacity-0 animate-edc-marquee-up">
              <UniversityMarquee />
            </div>
          </div>

          <div className="h-[120px]" />
          <Footer />
        </div>
      </div>
    </>
  );
}
