"use client";

import React, { useRef, useEffect } from "react";
import { motion, useInView, useAnimation } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BlockRevealTextProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Color of the revealing block. Defaults to the website's dark text color.
   */
  blockColor?: string;
  /**
   * Initial delay before the animation starts (in seconds).
   */
  delay?: number;
}

export function BlockRevealText({
  children,
  className,
  blockColor = "#09090b", 
  delay = 0,
}: BlockRevealTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  // trigger as soon as it's partially in view
  const isInView = useInView(ref, { once: true, amount: "some" });
  const blockControls = useAnimation();
  const textControls = useAnimation();

  useEffect(() => {
    if (isInView) {
      const animate = async () => {
        // 1. Block scales in from the left to cover the area
        await blockControls.start({
          scaleX: 1,
          transition: { duration: 0.2, ease: "easeInOut", delay },
        });
        
        // 2. Text becomes visible while covered
        textControls.start({
          opacity: 1,
          transition: { duration: 0.01 },
        });

        // 3. Block scales out to the right revealing the text
        await blockControls.start({
          scaleX: 0,
          transformOrigin: "right",
          transition: { duration: 0.2, ease: "easeInOut" },
        });
      };
      
      animate();
    }
  }, [isInView, blockControls, textControls, delay]);

  return (
    <div
      ref={ref}
      className={cn("relative inline-flex overflow-hidden", className)}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={textControls}
      >
        {children}
      </motion.div>
      <motion.div
        initial={{ scaleX: 0, transformOrigin: "left" }}
        animate={blockControls}
        style={{ backgroundColor: blockColor }}
        className="absolute inset-0 z-10"
      />
    </div>
  );
}

export default BlockRevealText;
