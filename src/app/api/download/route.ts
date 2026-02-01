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

    // Get file as buffer using ytdlp-nodejs
    const formatRequest = formatId
      ? formatId
      : kind === "audio"
        ? "bestaudio"
        : "best";

    console.log("[Download] Using format request:", formatRequest, { kind });

    let fileBuffer: Buffer | null = null;
    let ext = selectedFormat?.ext ?? fallbackAudio?.ext ?? fallbackVideo?.ext ?? (kind === "audio" ? "m4a" : "mp4");

    try {
      console.log("[Download] Calling getFileAsync...");
      const file = await ytdlp.getFileAsync(url, { format: formatRequest });
      console.log("[Download] File retrieved successfully, type:", typeof file, "is Buffer:", Buffer.isBuffer(file));
      
      // Handle both Buffer and object with stream
      if (Buffer.isBuffer(file)) {
        fileBuffer = file;
      } else if (file && typeof file === "object" && typeof (file as any).stream === "function") {
        const stream = (file as any).stream();
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        fileBuffer = Buffer.concat(chunks);
      }
      
      if (!fileBuffer) {
        throw new Error("Could not extract buffer from file response");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Download] getFileAsync failed:", { message: msg });
      
      // Fallback: try using execSync with yt-dlp directly
      console.log("[Download] Attempting fallback with execSync...");
      try {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ytdl-"));
        const tmpFile = path.join(tmpDir, "download");
        const ytdlpCmd = `yt-dlp -f "${formatRequest}" -o "${tmpFile}" "${url}"`;
        console.log("[Download] Running command...");
        execSync(ytdlpCmd, { stdio: "pipe" });
        
        const files = fs.readdirSync(tmpDir);
        const downloadedFile = files.find((f) => !f.startsWith("."));
        if (!downloadedFile) throw new Error("No file found after download");
        
        const fullPath = path.join(tmpDir, downloadedFile);
        fileBuffer = fs.readFileSync(fullPath);
        
        // Try to detect extension from downloaded file
        const fileExt = path.extname(downloadedFile);
        if (fileExt) {
          ext = fileExt.substring(1);
        }
        
        console.log("[Download] Fallback successful, buffer size:", fileBuffer.length, "ext:", ext);
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

    if (!fileBuffer || fileBuffer.length === 0) {
      console.error("[Download] Error: file buffer is empty");
      return new Response("File download failed: empty file", { status: 500 });
    }

    const filename = `${title}.${ext}`;
    console.log("[Download] Sending file:", { filename, ext, size: fileBuffer.length });

    // Stream the file to the client
    // Convert Buffer to Uint8Array to satisfy the Web Response body type
    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": getContentType(ext, kind),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": String(fileBuffer.length),
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
