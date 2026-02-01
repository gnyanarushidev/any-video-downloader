"use client";

import gsap from "gsap";
import { usePathname } from "next/navigation";
import { PropsWithChildren, useEffect, useRef } from "react";

const LIGHT_COLORS = [
  "rgba(147, 197, 253, 0.9)", // light blue
  "rgba(240, 230, 140, 0.9)", // khaki
  "rgba(255, 218, 185, 0.9)", // peach
  "rgba(200, 255, 200, 0.9)", // light green
  "rgba(255, 240, 245, 0.9)", // lavender blush
  "rgba(240, 255, 240, 0.9)", // honeydew
  "rgba(255, 250, 205, 0.9)", // lemon chiffon
  "rgba(230, 230, 250, 0.9)", // lavender
];

function getRandomColor(): string {
  return LIGHT_COLORS[Math.floor(Math.random() * LIGHT_COLORS.length)];
}

export default function PageTransition({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    const overlay = overlayRef.current;
    if (!node || !overlay) return;

    const randomColor = getRandomColor();

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Create a diagonal reveal effect with clipPath
      tl.fromTo(
        overlay,
        {
          opacity: 1,
          clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)",
          backgroundColor: randomColor,
        },
        {
          opacity: 1,
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
          duration: 0.7,
          ease: "power2.inOut",
        }
      );

      // Fade out the overlay
      tl.to(
        overlay,
        {
          opacity: 0,
          duration: 0.4,
          ease: "power3.out",
        },
        "-=0.2"
      );

      // Fade in the container
      tl.fromTo(
        node,
        {
          opacity: 0,
        },
        {
          opacity: 1,
          duration: 0.6,
          ease: "power3.out",
        },
        "-=0.5"
      );
    }, node);

    return () => ctx.revert();
  }, [pathname]);

  return (
    <div
      ref={containerRef}
      className="min-h-screen will-change-transform relative">
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 pointer-events-none"
      />
      {children}
    </div>
  );
}
