import { useState, useRef, useCallback, useEffect } from "react";
import useAppStore from "../store/useAppStore";
import LibraryItemPreview from "./LibraryItemPreview";
import type { LibraryItem, RemoteLibrary } from "../types";

export default function LibraryPanel() {
  const libraryPanelOpen = useAppStore((s) => s.libraryPanelOpen);
  const toggleLibraryPanel = useAppStore((s) => s.toggleLibraryPanel);
  const libraryItems = useAppStore((s) => s.libraryItems);
  const remoteLibraries = useAppStore((s) => s.remoteLibraries);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const activeTab = useAppStore((s) => s.activeLibraryTab);
  const setActiveTab = useAppStore((s) => s.setActiveLibraryTab);
  const addLibraryItem = useAppStore((s) => s.addLibraryItem);
  const removeLibraryItem = useAppStore((s) => s.removeLibraryItem);
  const importLibraryFromFile = useAppStore((s) => s.importLibraryFromFile);
  const importRemoteLibrary = useAppStore((s) => s.importRemoteLibrary);
  const exportLibrary = useAppStore((s) => s.exportLibrary);
  const insertLibraryItem = useAppStore((s) => s.insertLibraryItem);
  const insertLibraryItemElements = useAppStore((s) => s.insertLibraryItemElements);
  const fetchRemoteLibraries = useAppStore((s) => s.fetchRemoteLibraries);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const elements = useAppStore((s) => s.elements);

  const [expandedRemote, setExpandedRemote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (libraryPanelOpen && activeTab === "browse" && remoteLibraries.length === 0) {
      fetchRemoteLibraries();
    }
  }, [libraryPanelOpen, activeTab]);

  useEffect(() => {
    if (libraryPanelOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [libraryPanelOpen]);

  const handleImportFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        importLibraryFromFile(content);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [importLibraryFromFile]);

  const handleAddSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
    if (selectedElements.length === 0) return;

    let minX = Infinity, minY = Infinity;
    for (const el of selectedElements) {
      if (el.x < minX) minX = el.x;
      if (el.y < minY) minY = el.y;
    }

    const normalizedElements = selectedElements.map((el) => ({
      ...el,
      x: el.x - minX,
      y: el.y - minY,
    }));

    const item: LibraryItem = {
      id: "lib-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      name: `Item ${libraryItems.length + 1}`,
      elements: normalizedElements,
      created: Date.now(),
      status: "published",
    };
    addLibraryItem(item);
  }, [selectedIds, elements, libraryItems.length, addLibraryItem]);

  const filteredItems = searchQuery
    ? libraryItems.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : libraryItems;

  const handleItemClick = useCallback((id: string) => {
    insertLibraryItem(id);
  }, [insertLibraryItem]);

  const handleRemoteItemClick = useCallback((library: RemoteLibrary, item: LibraryItem) => {
    insertLibraryItemElements(item.elements);
  }, [insertLibraryItemElements]);

  if (!libraryPanelOpen) return null;

  return (
    <div className="library-panel">
      <div className="library-panel-header">
        <div className="library-panel-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span>Library</span>
        </div>
        <div className="library-panel-actions">
          <button
            className="library-action-btn"
            onClick={handleAddSelected}
            disabled={selectedIds.length === 0}
            title="Add selected elements to library"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            className="library-action-btn"
            onClick={handleImportFile}
            title="Import .excalidrawlib file"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            className="library-action-btn"
            onClick={exportLibrary}
            title="Export library"
            disabled={libraryItems.length === 0}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>
          <button
            className="library-action-btn library-close-btn"
            onClick={toggleLibraryPanel}
            title="Close library"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="library-tabs">
        <button
          className={`library-tab ${activeTab === "local" ? "active" : ""}`}
          onClick={() => setActiveTab("local")}
        >
          My Library ({libraryItems.length})
        </button>
        <button
          className={`library-tab ${activeTab === "browse" ? "active" : ""}`}
          onClick={() => setActiveTab("browse")}
        >
          Browse
        </button>
      </div>

      {activeTab === "local" && (
        <>
          <div className="library-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="library-search-input"
            />
            {searchQuery && (
              <button
                className="library-search-clear"
                onClick={() => setSearchQuery("")}
              >
                ×
              </button>
            )}
          </div>

          <div className="library-content">
            {filteredItems.length === 0 ? (
              <div className="library-empty">
                {libraryItems.length === 0 ? (
                  <>
                    <p>Your library is empty</p>
                    <p className="library-empty-hint">
                      Select elements on the canvas and click + to add them,
                      or import an .excalidrawlib file.
                    </p>
                  </>
                ) : (
                  <p>No items match your search</p>
                )}
              </div>
            ) : (
              <div className="library-grid">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="library-item-card"
                    onClick={() => handleItemClick(item.id)}
                    title={item.name}
                  >
                    <LibraryItemPreview elements={item.elements} size={80} />
                    <div className="library-item-info">
                      <span className="library-item-name">{item.name}</span>
                      <button
                        className="library-item-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeLibraryItem(item.id);
                        }}
                        title="Remove from library"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "browse" && (
        <div className="library-content">
          {remoteLibraries.length === 0 ? (
            <div className="library-empty">
              <p>Loading libraries...</p>
            </div>
          ) : (
            <div className="library-remote-list">
              {remoteLibraries.map((lib) => (
                <div key={lib.source} className="library-remote-pack">
                  <div
                    className="library-remote-pack-header"
                    onClick={() =>
                      setExpandedRemote(expandedRemote === lib.source ? null : lib.source)
                    }
                  >
                    <div className="library-remote-pack-info">
                      <span className="library-remote-pack-name">{lib.name}</span>
                      <span className="library-remote-pack-meta">
                        {lib.total} items
                        {lib.authors.length > 0 && ` · ${lib.authors.map((a) => a.name).join(", ")}`}
                      </span>
                    </div>
                    <div className="library-remote-pack-actions">
                      {lib.loading ? (
                        <span className="library-loading">...</span>
                      ) : (
                        <button
                          className="library-import-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            importRemoteLibrary(lib);
                          }}
                          title="Import all items"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </button>
                      )}
                      <span className={`library-chevron ${expandedRemote === lib.source ? "open" : ""}`}>
                        ▸
                      </span>
                    </div>
                  </div>
                  {expandedRemote === lib.source && lib.items && (
                    <div className="library-grid">
                      {lib.items.map((item) => (
                        <div
                          key={item.id}
                          className="library-item-card"
                          onClick={() => handleRemoteItemClick(lib, item)}
                          title={item.name}
                        >
                          <LibraryItemPreview elements={item.elements} size={80} />
                          <div className="library-item-info">
                            <span className="library-item-name">{item.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {expandedRemote === lib.source && !lib.items && (
                    <div className="library-remote-pack-empty">
                      Click the download button to load items
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".excalidrawlib,.json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
}
