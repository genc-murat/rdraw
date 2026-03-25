import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import useAppStore from "../store/useAppStore";

export default function PageTabs() {
  const pages = useAppStore((s) => s.pages);
  const activePageId = useAppStore((s) => s.activePageId);
  const switchPage = useAppStore((s) => s.switchPage);
  const createPage = useAppStore((s) => s.createPage);
  const deletePage = useAppStore((s) => s.deletePage);
  const renamePage = useAppStore((s) => s.renamePage);
  const duplicatePage = useAppStore((s) => s.duplicatePage);
  const reorderPage = useAppStore((s) => s.reorderPage);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{ pageId: string; x: number; y: number } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contextMenu && contextMenuRef.current) {
      const el = contextMenuRef.current;
      const { offsetHeight } = el;
      if (contextMenu.y + offsetHeight > window.innerHeight - 4) {
        el.style.top = `${Math.max(4, contextMenu.y - offsetHeight)}px`;
      }
    }
  }, [contextMenu]);

  const startRename = useCallback((pageId: string, currentName: string) => {
    setEditingId(pageId);
    setEditValue(currentName);
    setContextMenu(null);
    requestAnimationFrame(() => editInputRef.current?.select());
  }, []);

  const commitRename = useCallback(() => {
    if (editingId && editValue.trim()) {
      renamePage(editingId, editValue.trim());
    }
    setEditingId(null);
  }, [editingId, editValue, renamePage]);

  const handleContextMenu = useCallback((e: React.MouseEvent, pageId: string) => {
    e.preventDefault();
    setContextMenu({ pageId, x: e.clientX, y: e.clientY });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== toIndex) {
      reorderPage(dragIndex, toIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, reorderPage]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  const elementCount = useCallback(
    (pageId: string) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return 0;
      if (pageId === activePageId) {
        return useAppStore.getState().elements.length;
      }
      return page.elements.length;
    },
    [pages, activePageId]
  );

  return (
    <div className="page-tabs">
      <div className="page-tabs-list">
        {pages.map((page, index) => (
          <div
            key={page.id}
            className={`page-tab ${page.id === activePageId ? "page-tab-active" : ""} ${
              dragOverIndex === index && dragIndex !== index ? "page-tab-drop-target" : ""
            }`}
            onClick={() => switchPage(page.id)}
            onDoubleClick={() => startRename(page.id, page.name)}
            onContextMenu={(e) => handleContextMenu(e, page.id)}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            {editingId === page.id ? (
              <input
                ref={editInputRef}
                className="page-tab-rename-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setEditingId(null);
                  e.stopPropagation();
                }}
                autoFocus
              />
            ) : (
              <>
                <span className="page-tab-name">{page.name}</span>
                {elementCount(page.id) > 0 && (
                  <span className="page-tab-badge">{elementCount(page.id)}</span>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <button
        className="page-tab-add"
        onClick={() => createPage()}
        title="New page"
      >
        +
      </button>

      {contextMenu && createPortal(
        <>
          <div className="page-tab-context-overlay" onClick={() => setContextMenu(null)} />
          <div
            ref={contextMenuRef}
            className="page-tab-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div
              className="page-tab-context-item"
              onClick={() => {
                const page = pages.find((p) => p.id === contextMenu.pageId);
                if (page) startRename(page.id, page.name);
              }}
            >
              Rename
            </div>
            <div
              className="page-tab-context-item"
              onClick={() => {
                duplicatePage(contextMenu.pageId);
                setContextMenu(null);
              }}
            >
              Duplicate
            </div>
            <div
              className="page-tab-context-item page-tab-context-item-danger"
              onClick={() => {
                deletePage(contextMenu.pageId);
                setContextMenu(null);
              }}
            >
              Delete
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
