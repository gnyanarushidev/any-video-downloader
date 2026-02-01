"use client";

import MediaPreview from "@/components/MediaPreview";
import { useMediaPreview } from "@/lib/hooks/useMediaPreview";
import { detectPlatform } from "@/lib/utils/platform";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

export default function YouTubePage() {
    // Batch download state
    const [batchDownloading, setBatchDownloading] = useState(false);
    const [batchProgress, setBatchProgress] = useState(0);
    const [batchMessage, setBatchMessage] = useState<string | null>(null);
    const [batchSeverity, setBatchSeverity] = useState<'success' | 'error' | 'info'>('info');

    // Handle file upload and batch download
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setBatchDownloading(true);
      setBatchProgress(0);
      setBatchMessage(null);
      try {
        const text = await file.text();
        const links = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (links.length === 0) throw new Error("No links found in file.");
        let completed = 0;
        for (const link of links) {
          try {
            const res = await fetch(`/api/download?url=${encodeURIComponent(link)}&kind=video`);
            if (!res.ok) throw new Error(`Failed: ${link}`);
            const blob = await res.blob();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `video_${completed + 1}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
          } catch (err) {
            // Optionally, collect errors for reporting
          }
          completed++;
          setBatchProgress(Math.round((completed / links.length) * 100));
        }
        setBatchMessage("Batch download complete.");
        setBatchSeverity("success");
      } catch (err) {
        setBatchMessage(err instanceof Error ? err.message : String(err));
        setBatchSeverity("error");
      } finally {
        setBatchDownloading(false);
        setBatchProgress(0);
        e.target.value = "";
      }
    };
  const [activeTab, setActiveTab] = useState<"video" | "audio">("video");
  const [downloadType, setDownloadType] = useState<"single" | "playlist">("single");
  const [inputValue, setInputValue] = useState("");

  const {
    metadata,
    loading,
    error,
    fetchPreview,
    togglePlaylistItem,
    selectAllItems,
    deselectAllItems,
    clearPreview,
    setErrorMessage,
  } = useMediaPreview();

  const indicatorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  function isYouTubePlaylistUrl(url: string): boolean {
    try {
      const u = new URL(url);
      const host = u.hostname.replace("www.", "");
      const hasListParam = u.searchParams.has("list");
      const path = u.pathname.toLowerCase();
      return (
        hasListParam ||
        path.includes("/playlist") ||
        (host.includes("youtube.com") &&
          path.includes("/watch") &&
          hasListParam)
      );
    } catch {
      return false;
    }
  }

  // Animate tab indicator
  useEffect(() => {
    if (!indicatorRef.current) return;

    gsap.to(indicatorRef.current, {
      x: activeTab === "video" ? 0 : "100%",
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
      if (downloadType === "single" && isYouTubePlaylistUrl(inputValue)) {
        clearPreview();
        setErrorMessage(
          "Detected a playlist URL. Please switch to 'Playlist' mode to preview.",
        );
        return;
      }
      const detected = detectPlatform(inputValue);
      if (detected !== "youtube" && detected !== "unknown") {
        clearPreview();
        setErrorMessage(
          `This looks like a ${detected} link. Please paste a YouTube URL here or use the ${detected} downloader.`,
        );
        return;
      }
      fetchPreview(inputValue, "youtube", activeTab);
    }, 800);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [inputValue, activeTab, fetchPreview, downloadType]);

  return (
    <main className="page-gradient min-h-screen px-4 pt-24">
      {/* Title */}
      <h1
        className="mb-10 text-center text-3xl font-bold"
        style={{ color: "var(--card-text)" }}>
        YouTube Downloader
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
          className="absolute left-0 top-0 h-full w-1/2 rounded-lg transition-all"
          style={{ backgroundColor: "var(--tab-indicator)" }}
        />

        <button
          onClick={() => {
            setActiveTab("video");
            setInputValue("");
            clearPreview();
          }}
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
          onClick={() => {
            setActiveTab("audio");
            setInputValue("");
            clearPreview();
          }}
          className={`relative z-10 flex-1 rounded-lg py-3 font-semibold transition`}
          style={{
            color:
              activeTab === "audio"
                ? "var(--page-bg-gradient-to)"
                : "var(--card-text)",
          }}>
          Audio
        </button>
      </div>

      {/* Batch Download UI */}
      <div className="mx-auto mt-8 max-w-4xl mb-4 flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <span
            className="rounded-lg border px-4 py-2 font-medium select-none"
            style={{
              borderColor: "var(--tab-indicator)",
              color: "var(--tab-indicator)",
              background: batchDownloading ? "#222" : "transparent",
              opacity: batchDownloading ? 0.7 : 1,
              cursor: batchDownloading ? "not-allowed" : "pointer",
            }}
          >
            Upload Links File
          </span>
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            disabled={batchDownloading}
            style={{
              display: 'inline-block',
              width: 140,
              cursor: batchDownloading ? 'not-allowed' : 'pointer',
              background: 'transparent',
              color: 'var(--tab-indicator)',
              border: 'none',
              fontSize: 14,
            }}
          />
        </label>
        {batchDownloading && (
          <div className="flex flex-col min-w-[200px]">
            <span style={{ color: "var(--card-text)", fontSize: 14 }}>
              Downloading batch... {batchProgress}%
            </span>
            <div className="w-full h-2 bg-gray-700 rounded mt-1">
              <div
                className="h-2 rounded"
                style={{
                  width: `${batchProgress}%`,
                  background: "var(--tab-indicator)",
                  transition: "width 0.3s",
                }}
              />
            </div>
          </div>
        )}
        {batchMessage && (
          <span
            style={{
              color: batchSeverity === 'success' ? 'limegreen' : batchSeverity === 'error' ? 'red' : 'orange',
              fontWeight: 500,
              marginLeft: 12,
            }}
          >
            {batchMessage}
          </span>
        )}
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="card-bg mx-auto mt-12 max-w-4xl rounded-2xl p-8 shadow-xl mb-8">
        <h2
          className="mb-4 text-xl font-semibold"
          style={{ color: "var(--card-text)" }}>
          {activeTab === "video"
            ? "Download YouTube Video"
            : "Download YouTube Audio"}
        </h2>
        <p className="card-muted mb-6">
          {activeTab === "video"
            ? "Paste a YouTube video URL and download it in your preferred quality."
            : "Extract high-quality audio from YouTube videos instantly."}
        </p>

        {/* Download Type Selection */}
        <div className="mb-4 flex gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="downloadType"
              value="single"
              checked={downloadType === "single"}
              onChange={() => {
                setDownloadType("single");
                setInputValue("");
                clearPreview();
              }}
              className="w-4 h-4 cursor-pointer"
            />
            <span style={{ color: "var(--card-text)" }}>
              {activeTab === "video" ? "Single Video" : "Single Audio"}
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="downloadType"
              value="playlist"
              checked={downloadType === "playlist"}
              onChange={() => {
                setDownloadType("playlist");
                setInputValue("");
                clearPreview();
              }}
              className="w-4 h-4 cursor-pointer"
            />
            <span style={{ color: "var(--card-text)" }}>Playlist</span>
          </label>
        </div>

        {/* URL Input */}
        <input
          type="url"
          placeholder={
            downloadType === "single"
              ? "Paste YouTube video URL here..."
              : "Paste YouTube playlist URL here..."
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
          zipKind={activeTab}
        />
      </div>
    </main>
  );
}
