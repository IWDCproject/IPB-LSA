import Image from "next/image";
import Link from "next/link";

export default function EventCard({ event, className = "" }) {
  const { slug, name, card_image_url, user_created } = event;
  const orgName = user_created?.organisation_name ?? null;

  return (
    <Link
    href={`/events/${slug}`}
    className={`relative block overflow-hidden rounded-[0.2rem] h-full group ${className}`}
    >
    {card_image_url ? (
        <Image
        src={card_image_url}
        alt={name}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 768px) 50vw, 25vw"
        />
    ) : (
        <div className="absolute inset-0 bg-zinc-800" />
    )}

    {/* Dark gradient from bottom */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

    {/* Progressive blur from bottom */}
    <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(2px)",  WebkitBackdropFilter: "blur(2px)",  maskImage: "linear-gradient(to top, black 0%, transparent 100%)" }} />
        <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(4px)",  WebkitBackdropFilter: "blur(4px)",  maskImage: "linear-gradient(to top, black 0%, transparent 75%)"  }} />
        <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(8px)",  WebkitBackdropFilter: "blur(8px)",  maskImage: "linear-gradient(to top, black 0%, transparent 50%)"  }} />
        <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", maskImage: "linear-gradient(to top, black 0%, transparent 25%)"  }} />
    </div>

    {/* Text — pinned to bottom */}
    <div className="absolute bottom-0 left-0 right-0 p-4">
        {orgName && (
        <p className="text-white/85 text-[12px] tracking-wider font-semibold mb-1 truncate">by {orgName}</p>
        )}
        <p className="text-white font-display text-[24px] leading-[100%] uppercase tracking-[0.2px] line-clamp-2" style={{textWrap: "balance"}}> 
        {name}
        </p>
    </div>
    </Link>
  );
}