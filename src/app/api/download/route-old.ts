import { execSync } from "child_process";
import * as fs from "fs";
import { NextRequest } from "next/server";
import * as os from "os";
import * as path from "path";
import { YtDlp } from "ytdlp-nodejs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const fileSize: number | undefined =
      selectedFormat?.filesize ?? selectedFormat?.filesize_approx ?? (fallbackVideo?.filesize ?? fallbackVideo?.filesize_approx) ?? (fallbackAudio?.filesize ?? fallbackAudio?.filesize_approx) ?? (info as any).filesize ?? (info as any).filesize_approx;

    // Get file as buffer using ytdlp-nodejs
    const formatRequest = formatId
      ? formatId
      : kind === "audio"
        ? "bestaudio"
        : "best";

    console.log("[Download] Using format request:", formatRequest, { kind });

    let file;
    try {
      console.log("[Download] Calling getFileAsync...");
      file = await ytdlp.getFileAsync(url, { format: formatRequest });
      console.log("[Download] File retrieved successfully, type:", typeof file, "has stream:", typeof file?.stream);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Download] getFileAsync failed:", { message: msg, stack: err instanceof Error ? err.stack : "" });
      
      // Fallback: try using execSync with yt-dlp directly
      console.log("[Download] Attempting fallback with execSync...");
      try {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ytdl-"));
        const tmpFile = path.join(tmpDir, "download");
        const ytdlpCmd = `yt-dlp -f "${formatRequest}" -o "${tmpFile}" "${url}"`;
        console.log("[Download] Running:", ytdlpCmd);
        execSync(ytdlpCmd, { stdio: "pipe" });
        
        const files = fs.readdirSync(tmpDir);
        const downloadedFile = files.find((f) => !f.startsWith("."));
        if (!downloadedFile) throw new Error("No file found after download");
        
        const fullPath = path.join(tmpDir, downloadedFile);
        const buffer = fs.readFileSync(fullPath);
        file = { stream: () => buffer, buffer };
        
        console.log("[Download] Fallback successful, buffer size:", buffer.length);
        // Clean up
        fs.rmSync(tmpDir, { recursive: true });
      } catch (fallbackErr) {
        const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        console.error("[Download] Fallback also failed:", fallbackMsg);
        
        if (msg.toLowerCase().includes("ffmpeg")) {
          return new Response(
            "Download failed: ffmpeg is required for this format. Install ffmpeg or choose a different quality.",
            { status: 503 },
          );
        }
        return new Response(`Download failed: ${msg}`, { status: 500 });
      }
    }

    const ext = selectedFormat?.ext ?? fallbackAudio?.ext ?? fallbackVideo?.ext ?? (kind === "audio" ? "m4a" : "mp4");
    const filename = `${title}.${ext}`;

    console.log("[Download] Sending file:", { filename, ext, fileSize });

    if (!file || !file.stream) {
      console.error("[Download] Error: file object missing or no stream method");
      return new Response("File download failed: invalid file object", { status: 500 });
    }

    const stream = file.stream();
    if (!stream) {
      console.error("[Download] Error: stream is null/undefined");
      return new Response("File download failed: invalid stream", { status: 500 });
    }

    // Stream the file to the client
    return new Response(stream, {
      headers: {
        "Content-Type": getContentType(ext, kind),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        ...(fileSize ? { "Content-Length": String(fileSize) } : {}),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(`Download failed: ${msg}`, { status: 500 });
  }
}

function getContentType(ext: string, kind: "video" | "audio") {
  if (kind === "audio") {
    if (ext === "m4a" || ext === "mp4") return "audio/mp4";
    if (ext === "webm") return "audio/webm";
    return "audio/mpeg";
  }
  if (ext === "webm") return "video/webm";
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
