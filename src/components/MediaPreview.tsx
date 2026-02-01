"use client";

import { MediaMetadata, PlaylistItem, PlaylistMetadata } from "@/types/media";
import { FolderPicker } from "./FolderPicker";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  Typography,
} from "@mui/material";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import React from "react";

interface MediaPreviewProps {
  metadata?: MediaMetadata | PlaylistMetadata;
  loading: boolean;
  error?: string;
  onPlaylistItemToggle?: (id: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  zipKind?: "video" | "audio";
}

export default function MediaPreview({
  metadata,
  loading,
  error,
  onPlaylistItemToggle,
  onSelectAll,
  onDeselectAll,
  zipKind,
}: MediaPreviewProps) {
  const [downloadFolder, setDownloadFolder] = useState<FileSystemDirectoryHandle | null>(null);
  // State for batch download
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  // Handle file upload and batch download
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBatchDownloading(true);
    setBatchProgress(0);
    try {
      const text = await file.text();
      // Extract links (one per line, ignore empty lines)
      const links = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (links.length === 0) throw new Error("No links found in file.");
      let completed = 0;
      for (const link of links) {
        try {
          // Call backend API to trigger download (adjust endpoint as needed)
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
      setSnackbarMessage("Batch download complete.");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (err) {
      setSnackbarMessage(err instanceof Error ? err.message : String(err));
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setBatchDownloading(false);
      setBatchProgress(0);
      e.target.value = ""; // Reset file input
    }
  };
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string>();
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>();
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "error" | "info" | "success"
  >("info");

  useEffect(() => {
    if (!previewRef.current) return;

    if (metadata || error) {
      gsap.fromTo(
        previewRef.current,
        { y: 20, opacity: 0, height: 0 },
        { y: 0, opacity: 1, height: "auto", duration: 0.5, ease: "power3.out" },
      );
    }
  }, [metadata, error]);

  useEffect(() => {
    const message = error ?? downloadError;
    if (message) {
      setSnackbarMessage(message);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [error, downloadError]);

  const handleSnackbarClose = (
    _?: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  if (!loading && !metadata && !error) return null;

  return (
    <div ref={previewRef} className="mt-6 overflow-hidden">
      {/* Batch download from text file */}
      <Box className="mb-4 flex items-center gap-4">
        <Button
          variant="outlined"
          component="label"
          sx={{ borderColor: "var(--tab-indicator)", color: "var(--tab-indicator)" }}
          disabled={batchDownloading}
        >
          Upload Links File
          <input
            type="file"
            accept=".txt"
            hidden
            onChange={handleFileUpload}
            disabled={batchDownloading}
          />
        </Button>
        {batchDownloading && (
          <Box sx={{ minWidth: 200 }}>
            <Typography variant="body2" sx={{ color: "var(--card-text)" }}>
              Downloading batch... {batchProgress}%
            </Typography>
            <LinearProgress value={batchProgress} variant="determinate" sx={{ height: 8, borderRadius: 4 }} />
          </Box>
        )}
      </Box>
      {loading && (
        <Box
          className="rounded-lg p-6"
          sx={{
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--tab-bg)",
          }}>
          <Typography
            variant="subtitle1"
            align="center"
            sx={{ color: "var(--card-text)", mb: 2 }}>
            Loading preview...
          </Typography>
          <LinearProgress sx={{ height: 10, borderRadius: 5 }} />
        </Box>
      )}

      {downloading && (
        <Box
          className="rounded-lg p-6"
          sx={{
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--tab-bg)",
          }}>
          <Typography
            variant="subtitle1"
            align="center"
            sx={{ color: "var(--card-text)", mb: 2 }}>
            Downloading... {downloadProgress}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={downloadProgress}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>
      )}

      {(error || downloadError) && (
        <Alert
          severity="error"
          sx={{
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            color: "var(--card-text)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
          }}>
          {error ?? downloadError}
        </Alert>
      )}

      {metadata && !loading && !downloading && (
        <div
          className="rounded-lg p-6"
          style={{
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--tab-bg)",
          }}>
          {metadata.type === "playlist" ? (
            <>
              <div className="mb-4">
                <FolderPicker onFolderSelect={setDownloadFolder} />
                {downloadFolder && (
                  <span className="ml-2 text-xs text-green-600">Folder selected</span>
                )}
              </div>
              <PlaylistPreview
                playlist={metadata as PlaylistMetadata}
                onItemToggle={onPlaylistItemToggle}
                onSelectAll={onSelectAll}
                onDeselectAll={onDeselectAll}
                zipKind={zipKind}
                onDownloading={setDownloading}
                onProgress={setDownloadProgress}
                onError={setDownloadError}
                downloadFolder={downloadFolder}
                downloadedIds={downloadedIds}
                setDownloadedIds={setDownloadedIds}
              />
            </>
          ) : (
            <SingleMediaPreview
              media={metadata}
              onDownloadError={setDownloadError}
              onDownloading={setDownloading}
              onProgress={setDownloadProgress}
            />
          )}
        </div>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}

async function downloadSingle(
  media: MediaMetadata,
  setDownloading: (v: boolean) => void,
  setError: (m?: string) => void,
  setProgress: (p: number) => void,
  formatId?: string,
  formatExt?: string,
) {
  if (media.type === "photo" && media.sourceUrl) {
    try {
      setError(undefined);
      setDownloading(true);
      setProgress(0);
      const res = await fetch(media.sourceUrl);
      if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${media.title || "image"}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setProgress(100);
      setTimeout(() => {
        setDownloading(false);
        setProgress(0);
      }, 300);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDownloading(false);
      setProgress(0);
    }
    return;
  }

  try {
    setError(undefined);
    setDownloading(true);
    setProgress(0);
    const kind = media.type === "audio" ? "audio" : "video";
    const formatQuery = formatId
      ? `&formatId=${encodeURIComponent(formatId)}`
      : "";
    const resolvedExt = kind === "audio" ? (formatExt ?? "mp3") : "mp4";

    // Use fetch to track progress
    const downloadUrl = `/api/download?url=${encodeURIComponent(media.sourceUrl!)}&kind=${kind}${formatQuery}`;
    const response = await fetch(downloadUrl);

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      const fallback = response.statusText || response.status.toString();
      throw new Error(bodyText || `Download failed: ${fallback}`);
    }

    const contentLength = response.headers.get("content-length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Response body is not readable");

    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      if (total > 0) {
        const progress = Math.round((receivedLength / total) * 100);
        setProgress(progress);
      }
    }

    // Combine chunks into single blob
    const blob = new Blob(chunks as BlobPart[]);
    const url = URL.createObjectURL(blob);

    // Trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = `${media.title}.${resolvedExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setProgress(100);
    setTimeout(() => {
      setDownloading(false);
      setProgress(0);
    }, 500);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    setError(
      message.startsWith("Download failed")
        ? message
        : `Network error: ${message}`,
    );
    setDownloading(false);
    setProgress(0);
  }
}

function SingleMediaPreview({
  media,
  onDownloadError,
  onDownloading,
  onProgress,
}: {
  media: MediaMetadata;
  onDownloadError: (m?: string) => void;
  onDownloading: (v: boolean) => void;
  onProgress: (p: number) => void;
}) {
  const [selectedAudioFormat, setSelectedAudioFormat] = useState<string>();

  useEffect(() => {
    if (media.type === "audio" && media.audioFormats?.length) {
      setSelectedAudioFormat(media.audioFormats[0].formatId);
    } else {
      setSelectedAudioFormat(undefined);
    }
  }, [media]);

  const preferredAudioFormat =
    media.type === "audio"
      ? (media.audioFormats?.find((f) => f.formatId === selectedAudioFormat) ??
        media.audioFormats?.[0])
      : undefined;

  const audioFormatValue =
    media.type === "audio" ? (preferredAudioFormat?.formatId ?? "") : "";

  return (
    <div className="flex gap-4">
      {media.thumbnail && (
        <div className="flex-shrink-0">
          <img
            src={media.thumbnail}
            alt={media.title}
            className="h-24 w-40 rounded-lg object-cover"
          />
        </div>
      )}
      <div className="flex-1">
        <h3
          className="mb-2 text-lg font-semibold"
          style={{ color: "var(--card-text)" }}>
          {media.title}
        </h3>
        <div
          className="space-y-1 text-sm"
          style={{ color: "var(--card-text)", opacity: 0.7 }}>
          {media.author && <p>By {media.author}</p>}
          {media.duration && <p>Duration: {media.duration}</p>}
          {media.type && (
            <p className="capitalize">
              Type: {media.type === "photo" ? "Image" : media.type}
            </p>
          )}
        </div>
        {media.type === "audio" && media.audioFormats?.length ? (
          <Box mt={2} maxWidth={340}>
            <FormControl fullWidth size="small" sx={{ minWidth: 220 }}>
              <InputLabel id={`audio-quality-${media.title}`}>
                Audio quality
              </InputLabel>
              <Select
                labelId={`audio-quality-${media.title}`}
                label="Audio quality"
                value={audioFormatValue}
                onChange={(e) => setSelectedAudioFormat(e.target.value)}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: "var(--card-bg)",
                      color: "var(--card-text)",
                    },
                  },
                }}
                sx={{
                  backgroundColor: "var(--page-bg-gradient-from)",
                  color: "var(--card-text)",
                  borderColor: "var(--tab-bg)",
                }}>
                {media.audioFormats.map((fmt) => (
                  <MenuItem key={fmt.formatId} value={fmt.formatId}>
                    {fmt.label ?? fmt.formatId}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        ) : null}

        {(media.type === "video" ||
          media.type === "audio" ||
          media.type === "photo") &&
          media.sourceUrl && (
            <div className="mt-4">
              <Button
                type="button"
                variant="contained"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  downloadSingle(
                    media,
                    onDownloading,
                    onDownloadError,
                    onProgress,
                    preferredAudioFormat?.formatId,
                    preferredAudioFormat?.ext,
                  );
                }}
                sx={{
                  backgroundColor: "var(--tab-indicator)",
                  color: "var(--page-bg-gradient-to)",
                  "&:hover": {
                    opacity: 0.9,
                    backgroundColor: "var(--tab-indicator)",
                  },
                }}>
                Download{" "}
                {media.type === "audio"
                  ? preferredAudioFormat?.label
                    ? `Audio (${preferredAudioFormat.label})`
                    : "Audio"
                  : media.type === "photo"
                    ? "Image"
                    : "Video"}
              </Button>
            </div>
          )}
      </div>
    </div>
  );
}

function PlaylistPreview({
  playlist,
  onItemToggle,
  onSelectAll,
  onDeselectAll,
  zipKind,
  onDownloading,
  onProgress,
  onError,
  downloadFolder,
  downloadedIds,
  setDownloadedIds,
}: {
  playlist: PlaylistMetadata;
  onItemToggle?: (id: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  zipKind?: "video" | "audio";
  onDownloading?: (v: boolean) => void;
  onProgress?: (p: number) => void;
  onError?: (m?: string) => void;
  downloadFolder?: FileSystemDirectoryHandle | null;
  downloadedIds: string[];
  setDownloadedIds: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  // Count selected items
  const selectedCount = playlist.items.filter((i) => i.selected).length;
  const noneSelected = selectedCount === 0;
  const allSelected = selectedCount === playlist.items.length;

  // Download selected items as individual files
  async function downloadSelected(
    items: PlaylistItem[],
    onError: (m?: string) => void,
    onDownloading: (v: boolean) => void,
    downloadFolder?: FileSystemDirectoryHandle | null
  ) {
    try {
      onError(undefined);
      onDownloading(true);
      for (const item of items) {
        if (!item.selected || !item.url) continue;
        const kind = zipKind ?? "video";
        const formatExt = kind === "audio" ? "mp3" : "mp4";
        const downloadUrl = `/api/download?url=${encodeURIComponent(item.url)}&kind=${kind}`;
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error(`Download failed: ${item.title}`);
        const blob = await response.blob();
        if (downloadFolder && "showDirectoryPicker" in window) {
          // Save directly to the selected folder
          const fileHandle = await downloadFolder.getFileHandle(`${item.title}.${formatExt}`, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        } else {
          // Fallback: browser download
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${item.title}.${formatExt}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        setDownloadedIds((prev) => [...prev, item.id]);
      }
      onDownloading(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
      onDownloading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--card-text)" }}>
            {playlist.title}
          </h3>
          <p
            className="text-sm"
            style={{ color: "var(--card-text)", opacity: 0.7 }}>
            {playlist.totalItems} items • {selectedCount} selected
          </p>
        </div>
        <div className="flex gap-2">
          <React.Fragment>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDownloading?.(true);
                downloadSelected(
                  playlist.items,
                  (m: string | undefined) => onError?.(m),
                  (v: boolean) => onDownloading?.(v),
                  downloadFolder,
                );
              }}
              disabled={noneSelected}
              type="button"
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: "var(--tab-indicator)",
                color: "var(--page-bg-gradient-to)",
              }}>
              Download Selected
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelectAll?.();
              }}
              disabled={allSelected}
              type="button"
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: "var(--tab-indicator)",
                color: "var(--page-bg-gradient-to)",
              }}>
              Select All
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeselectAll?.();
              }}
              disabled={noneSelected}
              type="button"
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: "var(--tab-bg)",
                color: "var(--card-text)",
              }}>
              Deselect All
            </button>
          </React.Fragment>
        </div>
      </div>

      {selectedCount > 1 && (
        <div className="mb-4">
          <button
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                // Start loader
                onError?.(undefined);
                onDownloading?.(true);
                // Gather selected URLs
                const urls = playlist.items
                  .filter((i) => i.selected && i.url)
                  .map((i) => i.url!);
                if (urls.length < 2) return;
                // Trigger ZIP download with progress
                const res = await fetch("/api/download-zip", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ urls, kind: zipKind ?? "video" }),
                });
                if (!res.ok)
                  throw new Error(`ZIP request failed: ${res.statusText}`);
                const totalHeader = res.headers.get("X-Total-Size");
                const total = totalHeader ? parseInt(totalHeader, 10) : 0;
                const reader = res.body?.getReader();
                if (!reader) throw new Error("ZIP stream not readable");
                const chunks: Uint8Array[] = [];
                let received = 0;
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  chunks.push(value!);
                  received += value!.length;
                  if (total > 0) {
                    const pct = Math.round((received / total) * 100);
                    onProgress?.(pct);
                  }
                }
                const blob = new Blob(chunks as BlobPart[], {
                  type: "application/zip",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "playlist.zip";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                onProgress?.(100);
                setTimeout(() => {
                  onDownloading?.(false);
                  onProgress?.(0);
                }, 500);
              } catch (err) {
                onError?.(err instanceof Error ? err.message : String(err));
                onDownloading?.(false);
              }
            }}
            type="button"
            className="rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{
              backgroundColor: "var(--tab-indicator)",
              color: "var(--page-bg-gradient-to)",
            }}>
            Download as ZIP
          </button>
        </div>
      )}

      <div className="max-h-96 space-y-2 overflow-y-auto">
        {playlist.items.map((item: PlaylistItem, idx: number) => (
          <PlaylistItemRow
            key={`${item.id}-${idx}`}
            item={item}
            onToggle={onItemToggle}
            downloaded={downloadedIds.includes(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

function PlaylistItemRow({
  item,
  onToggle,
  downloaded,
}: {
  item: PlaylistItem;
  onToggle?: (id: string) => void;
  downloaded?: boolean;
}) {
  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle?.(item.id);
  };

  const handleLabelClick = (e: React.MouseEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle?.(item.id);
  };

  return (
    <label
      onClick={handleLabelClick}
      className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-opacity-50"
      style={{
        backgroundColor: item.selected
          ? "var(--tab-bg)"
          : "var(--page-bg-gradient-from)",
      }}>
      <input
        type="checkbox"
        checked={item.selected}
        onChange={handleToggle}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4 cursor-pointer rounded"
      />
      {item.thumbnail && (
        <img
          src={item.thumbnail}
          alt={item.title}
          className="h-12 w-20 flex-shrink-0 rounded object-cover"
        />
      )}
      <div className="flex-1 overflow-hidden flex items-center">
        <p
          className="truncate text-sm font-medium"
          style={{ color: "var(--card-text)" }}>
          {item.title}
        </p>
        {downloaded && (
          <span className="ml-2 text-green-600" title="Downloaded">
            &#10003;
          </span>
        )}
      </div>
      {item.duration && (
        <p
          className="text-xs"
          style={{ color: "var(--card-text)", opacity: 0.6 }}>
          {item.duration}
        </p>
      )}
    </label>
  );
}
