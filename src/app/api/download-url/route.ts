import { Platform } from "@/lib/utils/platform";
import { NextRequest, NextResponse } from "next/server";
import { YtDlp } from "ytdlp-nodejs";

export const runtime = "nodejs";

function pickBestVideoFormat(formats: any[]): any | undefined {
  // Prefer formats with both audio and video, then highest resolution/bitrate
  const av = formats.filter((f) => f.vcodec !== "none" && f.acodec !== "none");
  if (av.length) {
    return av.sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.tbr ?? 0) - (a.tbr ?? 0))[0];
  }
  // Fallback to video-only
  const v = formats.filter((f) => f.vcodec !== "none");
  if (v.length) {
    return v.sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.tbr ?? 0) - (a.tbr ?? 0))[0];
  }
  // Last resort: any
  return formats[0];
}

function pickBestAudioFormat(formats: any[]): any | undefined {
  const a = formats.filter((f) => f.vcodec === "none" && f.acodec !== "none");
  if (a.length) {
    return a.sort((a1, a2) => (a2.abr ?? 0) - (a1.abr ?? 0) || (a2.tbr ?? 0) - (a1.tbr ?? 0))[0];
  }
  // Fallback to any audio-capable format
  return formats.find((f) => f.acodec !== "none") ?? formats[0];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, kind, platform, urls } = body as {
      url?: string; // single
      urls?: string[]; // playlist selected
      kind: "video" | "audio";
      platform?: Platform;
    };

    if (!url && (!urls || urls.length === 0)) {
      return NextResponse.json({ error: "No URL(s) provided" }, { status: 400 });
    }

    // Instantiate yt-dlp with env-based paths if provided
    const opts: { binaryPath?: string; ffmpegPath?: string } = {};
    if (process.env.YTDLP_BINARY_PATH) opts.binaryPath = process.env.YTDLP_BINARY_PATH;
    if (process.env.FFMPEG_PATH) opts.ffmpegPath = process.env.FFMPEG_PATH;

    const ytdlp = new YtDlp(opts);

    async function getDirect(url0: string) {
      const info = await ytdlp.getInfoAsync(url0, { flatPlaylist: false });
      const formats: any[] = Array.isArray((info as any).formats) ? (info as any).formats : [];
      const title: string = (info as any).title ?? "download";
      const chosen = kind === "audio" ? pickBestAudioFormat(formats) : pickBestVideoFormat(formats);
      if (!chosen || !chosen.url) {
        throw new Error("No downloadable format URL found");
      }
      const ext = chosen.ext ?? (kind === "audio" ? "mp3" : "mp4");
      return { directUrl: chosen.url as string, filename: `${title}.${ext}` };
    }

    if (url) {
      const result = await getDirect(url);
      return NextResponse.json(result);
    }

    // Playlist: resolve each selected url
    const results = [] as Array<{ directUrl: string; filename: string }>;
    for (const u of urls!) {
      try {
        const r = await getDirect(u);
        results.push(r);
      } catch (e) {
        results.push({ directUrl: "", filename: "" });
      }
    }
    return NextResponse.json({ items: results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
