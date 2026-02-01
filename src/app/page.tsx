"use client";
import Platforms from "@/components/Platfroms";
import ThemeToggle from "@/components/ThemeToggle";
import gsap from "gsap";
import { useEffect, useRef } from "react";
export default function HomePage() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power4.out" },
      });

      tl.from(".hill", {
        y: 300,
        opacity: 0,
        duration: 1.3,
      })
        .from(
          ".hero-title",
          {
            y: 80,
            opacity: 0,
            duration: 0.8,
          },
          "-=0.6"
        )
        .from(
          ".hero-subtitle",
          {
            y: 40,
            opacity: 0,
            duration: 0.6,
          },
          "-=0.4"
        )
        .from(
          ".cta",
          {
            y: 30,
            opacity: 0,
            duration: 0.5,
          },
          "-=0.2"
        );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={root} className="app-bg relative min-h-screen overflow-hidden">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      {/* Iron Hill */}
      <div className="hill hill-surface absolute bottom-0 left-1/2 -translate-x-1/2 w-[150%] h-[65%] rounded-t-full shadow-[0_-40px_120px_rgba(0,0,0,0.8)]" />

      {/* Hero Content */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="hero-title text-4xl font-bold text-[color:var(--text-primary)] md:text-6xl">
          Universal Media Downloader
        </h1>

        <p className="hero-subtitle mt-4 max-w-xl text-[color:var(--text-muted)]">
          Download video and audio from multiple platforms with speed, quality,
          and simplicity.
        </p>

        <div className="mt-8">
          <Platforms />
        </div>
      </section>
    </main>
  );
}
