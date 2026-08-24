import archiver from "archiver";
import * as fs from "fs";
import { NextRequest } from "next/server";
import { PassThrough, Readable } from "stream";
import { YtDlp } from "ytdlp-nodejs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MAX_ZIP_ITEMS = 5;
const DEFAULT_MAX_ZIP_TOTAL_MB = 400;

function readLimitEnv(name: string, fallback: number) {
  const raw = process.env[name];
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function resolveYtDlpBinaryPath() {
  const envPath = process.env.YTDLP_BINARY_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  const candidates = ["/usr/local/bin/yt-dlp", "/usr/bin/yt-dlp"];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return envPath;
}

function resolveCookiesPath() {
  const cookiesPath = process.env.YTDLP_COOKIES_PATH;
  if (cookiesPath && fs.existsSync(cookiesPath)) return cookiesPath;
  return undefined;
}

function resolveProxyOptions(): string[] {
  const proxy = process.env.YTDLP_PROXY?.trim();
  return proxy ? [`--proxy=${proxy}`] : [];
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.ENABLE_ZIP_DOWNLOADS === "false") {
      return new Response("ZIP downloads are disabled on this deployment tier.", { status: 503 });
    }

    const body = await request.json();
    const urls: string[] = body?.urls ?? [];
    const kind: "video" | "audio" = body?.kind === "audio" ? "audio" : "video";

    const maxZipItems = readLimitEnv("MAX_ZIP_ITEMS", DEFAULT_MAX_ZIP_ITEMS);
    const maxZipTotalBytes = readLimitEnv("MAX_ZIP_TOTAL_MB", DEFAULT_MAX_ZIP_TOTAL_MB) * 1024 * 1024;

    if (!Array.isArray(urls) || urls.length < 2) {
      return new Response("At least two URLs required for ZIP download", { status: 400 });
    }
    if (urls.length > maxZipItems) {
      return new Response(`ZIP download rejected: max ${maxZipItems} items allowed on this host.`, { status: 413 });
    }

    const opts: { binaryPath?: string; ffmpegPath?: string } = {};
    const binaryPath = resolveYtDlpBinaryPath();
    if (binaryPath) opts.binaryPath = binaryPath;
    if (process.env.FFMPEG_PATH) opts.ffmpegPath = process.env.FFMPEG_PATH;
    const ytdlp = new YtDlp(opts);
    const cookiesPath = resolveCookiesPath();
    const proxyOptions = resolveProxyOptions();

    // Collect titles and approximate sizes for progress
    const items: { url: string; title: string; size?: number }[] = [];
    for (const url of urls) {
      const info = await ytdlp.getInfoAsync(url, {
        flatPlaylist: false,
        additionalOptions: [...proxyOptions, "--js-runtimes", "node"],
        ...(cookiesPath ? { cookies: cookiesPath } : {}),
      } as any);
      const title: string = (info as any).title ?? "item";
      const size: number | undefined = (info as any).filesize ?? (info as any).filesize_approx;
      items.push({ url, title, size });
    }

    const totalSize = items.reduce((sum, it) => sum + (it.size ?? 0), 0);
    if (totalSize && totalSize > maxZipTotalBytes) {
      const maxMb = Math.floor(maxZipTotalBytes / (1024 * 1024));
      return new Response(`ZIP download rejected: estimated total size above ${maxMb}MB host limit.`, { status: 413 });
    }

    // Create an archive and stream to client
    const archive = archiver("zip", { zlib: { level: 9 } });
    const stream = new PassThrough();
    archive.pipe(stream);

    // Append each media stream to the archive
    for (const it of items) {
      const file = await ytdlp.getFileAsync(it.url, {
        format: kind === "audio"
          ? { filter: "audioonly", quality: "highest" }
          : { filter: "audioandvideo", quality: "highest", type: "mp4" },
        additionalOptions: [...proxyOptions, "--js-runtimes", "node"],
        ...(cookiesPath ? { cookies: cookiesPath } : {}),
      } as any);
      const ext = kind === "audio" ? "mp3" : "mp4";
      const name = `${it.title}.${ext}`;
      const nodeStream = Readable.fromWeb(file.stream() as any);
      archive.append(nodeStream, { name });
    }

    // Finalize after appending
    archive.finalize();

    return new Response(stream as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent("playlist.zip")}"`,
        ...(totalSize ? { "X-Total-Size": String(totalSize) } : {}),
      },
    });
  } catch (error) {
    console.error("ZIP download error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    const lower = msg.toLowerCase();
    if (lower.includes("sign in to confirm you're not a bot") || lower.includes("cookies-from-browser")) {
      return new Response(
        "YouTube is blocking this request with a bot-check challenge for the current server IP.",
        { status: 429 }
      );
    }
    return new Response(`ZIP download failed: ${msg}`, { status: 500 });
  }
}
