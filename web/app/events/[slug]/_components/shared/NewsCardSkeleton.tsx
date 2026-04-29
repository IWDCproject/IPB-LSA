"use client";

function Bone({
  width,
  height,
  delay = "0s",
  radius = "rounded",
}: {
  width:   string;
  height:  number;
  delay?:  string;
  radius?: string;
}) {
  return (
    <div
      className={`bg-gray-200 relative overflow-hidden shrink-0 ${radius}`}
      style={{ width, height }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent animate-news-shimmer"
        style={{ animationDelay: delay }}
      />
    </div>
  );
}

export function NewsCardSkeleton({ isMobile = false }: { isMobile?: boolean }) {
  const thumbH  = isMobile ? 190 : 200;
  const bodyPad = isMobile ? "px-3.5 pt-3 pb-3.5" : "px-[22px] pt-5 pb-[22px]";

  return (
    <div className="flex flex-col h-full rounded-lg overflow-hidden shadow-[0_0_0_2px_#FFFFFF]">
      {/* Inner white rounded box */}
      <div className="bg-white rounded-[6px] overflow-hidden flex-1 flex flex-col">

        {/* Thumbnail placeholder */}
        <div
          className="bg-gray-200 shrink-0 relative overflow-hidden"
          style={{ height: thumbH }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-news-shimmer" />
        </div>

        {/* Body */}
        <div className={`${bodyPad} flex-1 flex flex-col`}>

          {/* Date row */}
          <Bone width="30%" height={12} delay="0s" />

          {/* Title */}
          <div className="mt-2 mb-3 flex flex-col gap-[7px]">
            <Bone width="90%" height={20} delay="0.05s" />
            <Bone width="55%" height={20} delay="0.1s"  />
          </div>

          {/* Excerpt */}
          <div className="mb-4 flex flex-col gap-2">
            <Bone width="100%" height={13} delay="0.12s" />
            <Bone width="75%"  height={13} delay="0.17s" />
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 w-full mt-auto" />

          {/* Read more */}
          <div className="pt-4">
            <Bone width="28%" height={14} delay="0.2s" />
          </div>
        </div>
      </div>
    </div>
  );
}