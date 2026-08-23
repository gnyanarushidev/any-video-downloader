import { NextRequest } from "next/server";
import { YtDlp } from "ytdlp-nodejs";

function detectPlatform(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "").toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("facebook.com") || host.includes("fb.watch")) return "facebook";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("twitter.com") || host.includes("x.com")) return "twitter";
    if (host.includes("linkedin.com")) return "linkedin";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MAX_DOWNLOAD_MB = 250;
const DEFAULT_MAX_DURATION_SECONDS = 60 * 30;

function readLimitEnv(name: string, fallback: number) {
  const raw = process.env[name];
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseApproxBytes(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url");
    const kind = request.nextUrl.searchParams.get("kind") as "video" | "audio" || "video";
    const formatId = request.nextUrl.searchParams.get("formatId");

    console.log("[Download] Starting download:", { url, kind, formatId });

    if (!url) {
      return new Response("URL parameter required", { status: 400 });
    }

    const opts: { binaryPath?: string; ffmpegPath?: string } = {};
    if (process.env.YTDLP_BINARY_PATH) opts.binaryPath = process.env.YTDLP_BINARY_PATH;
    if (process.env.FFMPEG_PATH) opts.ffmpegPath = process.env.FFMPEG_PATH;

    const ytdlp = new YtDlp(opts);

    const maxDownloadBytes = readLimitEnv("MAX_DOWNLOAD_MB", DEFAULT_MAX_DOWNLOAD_MB) * 1024 * 1024;
    const maxDurationSeconds = readLimitEnv("MAX_DURATION_SECONDS", DEFAULT_MAX_DURATION_SECONDS);

    // Fetch metadata first for filename and size
    console.log("[Download] Fetching metadata...");
    const info = await ytdlp.getInfoAsync(url, { flatPlaylist: false });
    console.log("[Download] Metadata fetched:", { title: (info as any).title, formatCount: (info as any).formats?.length });

    const formats: any[] = Array.isArray((info as any).formats) ? (info as any).formats : [];
    const selectedFormat = formatId
      ? formats.find((f) => f?.format_id === formatId)
      : undefined;
    const fallbackVideo = pickBestMuxedFormat(formats);
    const fallbackAudio = pickBestAudioFormat(formats);

    console.log("[Download] Format selection:", { selectedFormat: selectedFormat?.format_id, fallbackVideo: fallbackVideo?.format_id, fallbackAudio: fallbackAudio?.format_id });
    const title: string = (info as any).title ?? "download";
    const durationSeconds = typeof (info as any).duration === "number" ? (info as any).duration : undefined;
    if (durationSeconds && durationSeconds > maxDurationSeconds) {
      return new Response(
        `Download rejected: media duration exceeds limit (${maxDurationSeconds}s).`,
        { status: 413 }
      );
    }

    // Get file as buffer using ytdlp-nodejs
    let formatRequest = formatId;
    
    // If no formatId specified, select best format based on platform
    if (!formatRequest) {
      const platform = detectPlatform(url);
      if (platform === "youtube") {
        // YouTube requires specific format selection, use best video+audio muxed
        formatRequest = "bestvideo+bestaudio";
      } else if (kind === "audio") {
        formatRequest = "bestaudio";
      } else {
        formatRequest = "best";
      }
    }

    console.log("[Download] Using format request:", formatRequest, { kind });

    const selectedFileSize = parseApproxBytes(selectedFormat?.filesize) ?? parseApproxBytes(selectedFormat?.filesize_approx);
    const fallbackFileSize = kind === "audio"
      ? parseApproxBytes(fallbackAudio?.filesize) ?? parseApproxBytes(fallbackAudio?.filesize_approx)
      : parseApproxBytes(fallbackVideo?.filesize) ?? parseApproxBytes(fallbackVideo?.filesize_approx);
    const infoSize = parseApproxBytes((info as any).filesize) ?? parseApproxBytes((info as any).filesize_approx);
    const estimatedSize = selectedFileSize ?? fallbackFileSize ?? infoSize;
    if (estimatedSize && estimatedSize > maxDownloadBytes) {
      const maxMb = Math.floor(maxDownloadBytes / (1024 * 1024));
      return new Response(
        `Download rejected: estimated file size is above ${maxMb}MB host limit.`,
        { status: 413 }
      );
    }

    const ext = selectedFormat?.ext ?? fallbackAudio?.ext ?? fallbackVideo?.ext ?? (kind === "audio" ? "m4a" : "mp4");

    let stream: ReadableStream | null = null;
    try {
      console.log("[Download] Calling getFileAsync...");
      const file = await ytdlp.getFileAsync(url, { format: formatRequest });
      console.log("[Download] File retrieved successfully, type:", typeof file, "is Buffer:", Buffer.isBuffer(file));

      // Handle both Buffer and object with stream
      if (Buffer.isBuffer(file)) {
        stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(file));
            controller.close();
          },
        });
      } else if (file && typeof file === "object" && typeof (file as any).stream === "function") {
        stream = (file as any).stream();
      }

      if (!stream) {
        throw new Error("Could not extract stream from file response");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Download] getFileAsync failed:", { message: msg });

      if (msg.toLowerCase().includes("ffmpeg")) {
        return new Response(
          "Download failed: ffmpeg is required for this format. Install ffmpeg or choose a different quality.",
          { status: 503 },
        );
      }
      return new Response(`Download failed: ${msg}`, { status: 500 });
    }

    if (!stream) {
      return new Response("File download failed: unavailable stream", { status: 500 });
    }

    const filename = `${title}.${ext}`;
    console.log("[Download] Sending file:", { filename, ext, estimatedSize });

    return new Response(stream, {
      headers: {
        "Content-Type": getContentType(ext, kind),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        ...(estimatedSize ? { "Content-Length": String(estimatedSize) } : {}),
      },
    });
  } catch (error) {
    console.error("[Download] Outer error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(`Download failed: ${msg}`, { status: 500 });
  }
}

function getContentType(ext: string, kind: "video" | "audio") {
  if (kind === "audio") {
    if (ext === "m4a" || ext === "mp4") return "audio/mp4";
    if (ext === "webm") return "audio/webm";
    if (ext === "aac") return "audio/aac";
    return "audio/mpeg";
  }
  if (ext === "webm") return "video/webm";
  if (ext === "mkv") return "video/x-matroska";
  return "video/mp4";
}

function pickBestMuxedFormat(formats: any[]) {
  const muxed = formats.filter(
    (f) => f && f.vcodec && f.acodec && f.vcodec !== "none" && f.acodec !== "none",
  );
  const mp4Muxed = muxed.filter((f) => f.ext === "mp4");
  const pool = mp4Muxed.length ? mp4Muxed : muxed;
  return pool.sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0];
}

function pickBestAudioFormat(formats: any[]) {
  const audioOnly = formats.filter(
    (f) => f && f.vcodec === "none" && f.acodec && f.acodec !== "none",
  );
  const m4a = audioOnly.filter((f) => f.ext === "m4a" || f.ext === "mp4");
  const pool = m4a.length ? m4a : audioOnly;
  return pool.sort((a, b) => (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0))[0];
}
