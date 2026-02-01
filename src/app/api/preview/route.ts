import { AudioFormatOption } from "@/types/media";
import { NextRequest, NextResponse } from "next/server";
import { YtDlp } from "ytdlp-nodejs";
export const runtime = "nodejs";

type Platform = "youtube" | "facebook" | "instagram" | "twitter" | "linkedin" | "unknown";

function detectPlatform(url: string): Platform {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");
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

function secondsToTimestamp(seconds?: number): string | undefined {
  if (seconds == null || isNaN(seconds)) return undefined;
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export async function POST(request: NextRequest) {
  try {
    const { url, type } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Safely create YtDlp instance, allowing PATH discovery or env overrides
    let ytdlp: YtDlp | null = null;
    try {
      const opts: { binaryPath?: string; ffmpegPath?: string } = {};
      if (process.env.YTDLP_BINARY_PATH) opts.binaryPath = process.env.YTDLP_BINARY_PATH;
      if (process.env.FFMPEG_PATH) opts.ffmpegPath = process.env.FFMPEG_PATH;
      ytdlp = new YtDlp(opts);
    } catch (e) {
      return NextResponse.json(
        {
          error:
            "yt-dlp binary not found. Install yt-dlp or set YTDLP_BINARY_PATH in .env.local.",
          details: e instanceof Error ? e.message : String(e),
          help: {
            windows: [
              "winget install yt-dlp.yt-dlp",
              "scoop install yt-dlp",
              "py -m pip install -U yt-dlp",
            ],
            env: "YTDLP_BINARY_PATH=C:/path/to/yt-dlp.exe",
          },
        },
        { status: 503 }
      );
    }

    // Fetch metadata via yt-dlp
    let info: any;
    try {
      info = await ytdlp.getInfoAsync(url, { flatPlaylist: true });
    } catch (e) {
      // Provide clearer failure when binary is missing
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("ytdlp") || msg.toLowerCase().includes("yt-dlp")) {
        return NextResponse.json(
          {
            error:
              "Failed to run yt-dlp. Ensure it is installed and accessible (PATH or YTDLP_BINARY_PATH).",
            details: msg,
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const platform = detectPlatform(url);

    // Playlist handling
    if ((info as any)._type === "playlist") {
      const playlist = info as any;
      const title: string = playlist.title ?? "Playlist";
      const author: string | undefined = playlist.uploader ?? playlist.channel ?? undefined;
      const entries: any[] = Array.isArray(playlist.entries) ? playlist.entries : [];

      const items = entries.map((e) => {
        const thumb = e.thumbnail || (Array.isArray(e.thumbnails) ? e.thumbnails[0]?.url : undefined);
        const duration = secondsToTimestamp(e.duration);
        const id = e.id ?? e.url ?? cryptoRandomId();
        const urlItem = e.url ?? e.webpage_url ?? url;
        return {
          id,
          title: e.title ?? "Untitled",
          thumbnail: thumb,
          duration,
          url: urlItem,
          selected: false,
        };
      });

      return NextResponse.json({
        type: "playlist",
        title,
        author,
        platform,
        totalItems: items.length,
        items,
      });
    }

    // Single video handling
    const video = info as any;
    const title: string = video.title ?? "Untitled";
    const author: string | undefined = video.uploader ?? video.channel ?? undefined;
    const description: string | undefined = video.description ?? undefined;
    const duration: string | undefined = secondsToTimestamp(video.duration);
    const thumb: string | undefined = video.thumbnail || (Array.isArray(video.thumbnails) ? video.thumbnails[0]?.url : undefined);
    const audioFormats: AudioFormatOption[] | undefined =
      type === "audio" && Array.isArray(video.formats)
        ? extractAudioFormats(video.formats)
        : undefined;

    return NextResponse.json({
      type: (type as any) || "video",
      title,
      author,
      description,
      duration,
      thumbnail: thumb,
      platform,
      sourceUrl: url,
      audioFormats,
    });
  } catch (error) {
    console.error("Error fetching preview:", error);
    return NextResponse.json(
      { error: "Failed to fetch preview" },
      { status: 500 }
    );
  }
}

function cryptoRandomId() {
  // Lightweight random ID to ensure unique playlist item ids
  return Math.random().toString(36).slice(2, 10);
}

function extractAudioFormats(formats: any[]): AudioFormatOption[] {
  const seen = new Set<string>();
  const audioFormats = formats
    .filter((f) =>
      f && f.format_id && f.vcodec === "none" && f.acodec && f.acodec !== "none",
    )
    .map((f) => {
      const bitrate = typeof f.abr === "number" ? f.abr : typeof f.tbr === "number" ? Math.round(f.tbr) : undefined;
      const size = f.filesize ?? f.filesize_approx;
      const labelParts = [
        bitrate ? `${bitrate} kbps` : undefined,
        f.ext ? f.ext.toUpperCase() : undefined,
        size ? `${(size / (1024 * 1024)).toFixed(1)} MB` : undefined,
      ].filter(Boolean);

      return {
        formatId: f.format_id,
        ext: f.ext,
        abr: bitrate,
        formatNote: f.format_note,
        filesize: size,
        label: labelParts.join(" • ") || f.format_id,
      } satisfies AudioFormatOption;
    })
    .filter((f) => {
      if (seen.has(f.formatId)) return false;
      seen.add(f.formatId);
      return true;
    })
    .sort((a, b) => (b.abr ?? 0) - (a.abr ?? 0));

  // Return top 3 quality tiers: Best, Better, Good
  const top3 = audioFormats.slice(0, 3);
  const qualityNames = ["Best", "Better", "Good"];
  
  return top3.map((fmt, idx) => ({
    ...fmt,
    label: `${qualityNames[idx]} - ${fmt.label}`,
  }));
}
