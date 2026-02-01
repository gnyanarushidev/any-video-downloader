"use client";

import MediaPreview from "@/components/MediaPreview";
import { useMediaPreview } from "@/lib/hooks/useMediaPreview";
import { detectPlatform } from "@/lib/utils/platform";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

export default function FacebookPage() {
  const [activeTab, setActiveTab] = useState<"video" | "audio" | "photo">(
    "video",
  );
  const [inputValue, setInputValue] = useState("");

  const {
    metadata,
    loading,
    error,
    fetchPreview,
    togglePlaylistItem,
    selectAllItems,
    deselectAllItems,
    setErrorMessage,
    clearPreview,
  } = useMediaPreview();

  const indicatorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Animate tab indicator
  useEffect(() => {
    if (!indicatorRef.current) return;

    gsap.to(indicatorRef.current, {
      x: activeTab === "video" ? "0%" : activeTab === "audio" ? "100%" : "200%",
      duration: 0.5,
      ease: "power4.out",
    });
  }, [activeTab]);

  // Animate content change
  useEffect(() => {
    if (!contentRef.current) return;

    gsap.fromTo(
      contentRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" },
    );
  }, [activeTab]);

  // Auto-fetch preview when URL is pasted
  useEffect(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!inputValue) return;

    debounceTimerRef.current = window.setTimeout(() => {
      const detected = detectPlatform(inputValue);
      if (detected !== "facebook" && detected !== "unknown") {
        clearPreview();
        setErrorMessage(
          `This looks like a ${detected} link. Please paste a Facebook URL here or use the ${detected} downloader.`,
        );
        return;
      }
      fetchPreview(inputValue, "facebook", activeTab);
    }, 800);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [inputValue, activeTab, fetchPreview]);

  return (
    <main className="page-gradient min-h-screen px-4 pt-24">
      {/* Title */}
      <h1
        className="mb-10 text-center text-3xl font-bold"
        style={{ color: "var(--card-text)" }}>
        Facebook Downloader
      </h1>

      {/* Tabs */}
      <div
        className="relative mx-auto flex w-full max-w-md rounded-xl p-1"
        style={{
          backgroundColor: "var(--card-bg)",
          border: "1px solid var(--tab-bg)",
        }}>
        {/* Sliding Indicator */}
        <div
          ref={indicatorRef}
          className="absolute left-0 top-0 h-full w-1/3 rounded-lg transition-all"
          style={{ backgroundColor: "var(--tab-indicator)" }}
        />

        <button
          onClick={() => setActiveTab("video")}
          className={`relative z-10 flex-1 rounded-lg py-3 font-semibold transition`}
          style={{
            color:
              activeTab === "video"
                ? "var(--page-bg-gradient-to)"
                : "var(--card-text)",
          }}>
          Video
        </button>

        <button
          onClick={() => setActiveTab("audio")}
          className={`relative z-10 flex-1 rounded-lg py-3 font-semibold transition`}
          style={{
            color:
              activeTab === "audio"
                ? "var(--page-bg-gradient-to)"
                : "var(--card-text)",
          }}>
          Audio
        </button>

        <button
          onClick={() => setActiveTab("photo")}
          className={`relative z-10 flex-1 rounded-lg py-3 font-semibold transition`}
          style={{
            color:
              activeTab === "photo"
                ? "var(--page-bg-gradient-to)"
                : "var(--card-text)",
          }}>
          Photo
        </button>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="card-bg mx-auto mt-12 max-w-4xl rounded-2xl p-8 shadow-xl mb-8">
        <h2
          className="mb-4 text-xl font-semibold"
          style={{ color: "var(--card-text)" }}>
          {activeTab === "photo"
            ? "Download Facebook Photo"
            : activeTab === "audio"
              ? "Download Facebook Audio"
              : "Download Facebook Video"}
        </h2>
        <p className="card-muted mb-6">
          {activeTab === "photo"
            ? "Paste a Facebook image URL and download it instantly."
            : activeTab === "audio"
              ? "Extract high-quality audio from Facebook videos instantly."
              : "Paste a Facebook video URL and download it in your preferred quality."}
        </p>

        {/* URL Input */}
        <input
          type="url"
          placeholder={
            activeTab === "photo"
              ? "Paste Facebook image URL here..."
              : "Paste Facebook video URL here..."
          }
          className="w-full px-4 py-3 rounded-lg border transition-colors"
          style={{
            backgroundColor: "var(--page-bg-gradient-from)",
            color: "var(--card-text)",
            borderColor: "var(--tab-bg)",
          }}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
      </div>

      {/* Preview Box - Full Width */}
      <div className="w-full max-w-full px-2">
        <MediaPreview
          metadata={metadata}
          loading={loading}
          error={error}
          onPlaylistItemToggle={togglePlaylistItem}
          onSelectAll={selectAllItems}
          onDeselectAll={deselectAllItems}
          zipKind={activeTab === "photo" ? undefined : activeTab}
        />
      </div>
    </main>
  );
}
