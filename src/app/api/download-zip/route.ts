import archiver from "archiver";
import { NextRequest } from "next/server";
import { PassThrough, Readable } from "stream";
import { YtDlp } from "ytdlp-nodejs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const urls: string[] = body?.urls ?? [];
    const kind: "video" | "audio" = body?.kind === "audio" ? "audio" : "video";

    if (!Array.isArray(urls) || urls.length < 2) {
      return new Response("At least two URLs required for ZIP download", { status: 400 });
    }

    const opts: { binaryPath?: string; ffmpegPath?: string } = {};
    if (process.env.YTDLP_BINARY_PATH) opts.binaryPath = process.env.YTDLP_BINARY_PATH;
    if (process.env.FFMPEG_PATH) opts.ffmpegPath = process.env.FFMPEG_PATH;
    const ytdlp = new YtDlp(opts);

    // Collect titles and approximate sizes for progress
    const items: { url: string; title: string; size?: number }[] = [];
    for (const url of urls) {
      const info = await ytdlp.getInfoAsync(url, { flatPlaylist: false });
      const title: string = (info as any).title ?? "item";
      const size: number | undefined = (info as any).filesize ?? (info as any).filesize_approx;
      items.push({ url, title, size });
    }

    const totalSize = items.reduce((sum, it) => sum + (it.size ?? 0), 0);

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
      });
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
    return new Response(`ZIP download failed: ${msg}`, { status: 500 });
  }
}
