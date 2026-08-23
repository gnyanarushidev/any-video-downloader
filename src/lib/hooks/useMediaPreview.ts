import { MediaMetadata, PlaylistItem, PlaylistMetadata } from "@/types/media";
import { useCallback, useState } from "react";

interface UseMediaPreviewReturn {
  metadata?: MediaMetadata | PlaylistMetadata;
  loading: boolean;
  error?: string;
  fetchPreview: (url: string, platform: string, type?: string) => Promise<void>;
  togglePlaylistItem: (id: string) => void;
  selectAllItems: () => void;
  deselectAllItems: () => void;
  clearPreview: () => void;
  setErrorMessage: (message: string) => void;
}

export function useMediaPreview(): UseMediaPreviewReturn {
  const [metadata, setMetadata] = useState<MediaMetadata | PlaylistMetadata>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const fetchPreview = useCallback(
    async (url: string, platform: string, type?: string) => {
      if (!url) {
        setMetadata(undefined);
        setError(undefined);
        return;
      }

      setLoading(true);
      setError(undefined);

      try {
        const response = await fetch("/api/preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, platform, type }),
        });

        const payload = await response.json().catch(() => ({} as Record<string, unknown>));

        if (!response.ok) {
          const errorMessage =
            typeof payload.error === "string"
              ? payload.error
              : "Failed to fetch preview";
          const details =
            typeof payload.details === "string" ? payload.details : undefined;
          throw new Error(
            details
              ? `${errorMessage} (HTTP ${response.status})\n${details}`
              : `${errorMessage} (HTTP ${response.status})`
          );
        }

        setMetadata(payload as MediaMetadata | PlaylistMetadata);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load preview"
        );
        setMetadata(undefined);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const togglePlaylistItem = useCallback((id: string) => {
    setMetadata((prev) => {
      if (!prev || prev.type !== "playlist") return prev;

      const playlist = prev as PlaylistMetadata;
      return {
        ...playlist,
        items: playlist.items.map((item: PlaylistItem) =>
          item.id === id ? { ...item, selected: !item.selected } : item
        ),
      };
    });
  }, []);

  const selectAllItems = useCallback(() => {
    setMetadata((prev) => {
      if (!prev || prev.type !== "playlist") return prev;

      const playlist = prev as PlaylistMetadata;
      return {
        ...playlist,
        items: playlist.items.map((item: PlaylistItem) => ({ ...item, selected: true })),
      };
    });
  }, []);

  const deselectAllItems = useCallback(() => {
    setMetadata((prev) => {
      if (!prev || prev.type !== "playlist") return prev;

      const playlist = prev as PlaylistMetadata;
      return {
        ...playlist,
        items: playlist.items.map((item: PlaylistItem) => ({ ...item, selected: false })),
      };
    });
  }, []);

  const clearPreview = useCallback(() => {
    setMetadata(undefined);
    setError(undefined);
    setLoading(false);
  }, []);

  const setErrorMessage = useCallback((message: string) => {
    setMetadata(undefined);
    setError(message);
    setLoading(false);
  }, []);

  return {
    metadata,
    loading,
    error,
    fetchPreview,
    togglePlaylistItem,
    selectAllItems,
    deselectAllItems,
    clearPreview,
    setErrorMessage,
  };
}
