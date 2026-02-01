import React from "react";

export function FolderPicker({ onFolderSelect }: { onFolderSelect: (folder: FileSystemDirectoryHandle) => void }) {
  async function handlePickFolder() {
    // @ts-ignore
    if (window.showDirectoryPicker) {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker();
      onFolderSelect(dirHandle);
    } else {
      alert("Your browser does not support folder selection.");
    }
  }

  return (
    <button type="button" onClick={handlePickFolder} className="px-4 py-2 rounded bg-blue-600 text-white">
      Choose Download Folder
    </button>
  );
}
