import { useState, useRef, useEffect } from "react";
import useAppStore from "../store/useAppStore";
import { saveDrawing, loadDrawing, exportPNG, exportSVG } from "../utils/export";

type MenuItem =
  | { label: string; shortcut?: string; action: () => void; separator?: false }
  | { separator: true; label?: undefined; shortcut?: undefined; action?: undefined };

interface MenuDef {
  label: string;
  items: MenuItem[];
}

export default function MenuBar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  const elements = useAppStore((s) => s.elements);
  const setElements = useAppStore((s) => s.setElements);
  const clearAll = useAppStore((s) => s.clearAll);
  const filePath = useAppStore((s) => s.filePath);
  const setFilePath = useAppStore((s) => s.setFilePath);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const copy = useAppStore((s) => s.copy);
  const cut = useAppStore((s) => s.cut);
  const paste = useAppStore((s) => s.paste);
  const duplicate = useAppStore((s) => s.duplicate);
  const selectAll = useAppStore((s) => s.selectAll);
  const resetView = useAppStore((s) => s.resetView);
  const bringToFront = useAppStore((s) => s.bringToFront);
  const sendToBack = useAppStore((s) => s.sendToBack);
  const showGrid = useAppStore((s) => s.showGrid);
  const toggleGrid = useAppStore((s) => s.toggleGrid);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        sidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node) &&
        menuBarRef.current &&
        !menuBarRef.current.contains(e.target as Node)
      ) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sidebarOpen]);

  const closeSidebar = () => {
    setSidebarOpen(false);
    setExpandedCategory(null);
  };

  const handleNew = () => {
    clearAll();
    setFilePath(null);
    closeSidebar();
  };

  const handleOpen = async () => {
    closeSidebar();
    const result = await loadDrawing();
    if (result) {
      setElements(result.elements);
      setFilePath(result.path);
    }
  };

  const handleSave = async () => {
    closeSidebar();
    const path = await saveDrawing(elements, filePath);
    if (path) setFilePath(path);
  };

  const handleSaveAs = async () => {
    closeSidebar();
    const path = await saveDrawing(elements);
    if (path) setFilePath(path);
  };

  const handleExportPNG = async () => {
    closeSidebar();
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    if (canvas) await exportPNG(canvas);
  };

  const handleExportSVG = async () => {
    closeSidebar();
    const state = useAppStore.getState();
    await exportSVG(elements, state.viewTransform);
  };

  const menus: MenuDef[] = [
    {
      label: "File",
      items: [
        { label: "New", shortcut: "Ctrl+N", action: handleNew },
        { label: "Open", shortcut: "Ctrl+O", action: handleOpen },
        { label: "Save", shortcut: "Ctrl+S", action: handleSave },
        { label: "Save As", shortcut: "Ctrl+Shift+S", action: handleSaveAs },
        { separator: true },
        { label: "Export PNG", shortcut: "", action: handleExportPNG },
        { label: "Export SVG", shortcut: "", action: handleExportSVG },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Undo", shortcut: "Ctrl+Z", action: () => { undo(); closeSidebar(); } },
        { label: "Redo", shortcut: "Ctrl+Shift+Z", action: () => { redo(); closeSidebar(); } },
        { separator: true },
        { label: "Cut", shortcut: "Ctrl+X", action: () => { cut(); closeSidebar(); } },
        { label: "Copy", shortcut: "Ctrl+C", action: () => { copy(); closeSidebar(); } },
        { label: "Paste", shortcut: "Ctrl+V", action: () => { paste(); closeSidebar(); } },
        { label: "Duplicate", shortcut: "Ctrl+D", action: () => { duplicate(); closeSidebar(); } },
        { separator: true },
        { label: "Select All", shortcut: "Ctrl+A", action: () => { selectAll(); closeSidebar(); } },
      ],
    },
    {
      label: "View",
      items: [
        { label: "Reset View", shortcut: "", action: () => { resetView(); closeSidebar(); } },
        { separator: true },
        { label: `${showGrid ? "✓ " : ""}Toggle Grid`, shortcut: "", action: () => { toggleGrid(); closeSidebar(); } },
        { label: `Toggle Theme (${theme === "dark" ? "Dark" : "Light"})`, shortcut: "", action: () => { toggleTheme(); closeSidebar(); } },
      ],
    },
    {
      label: "Arrange",
      items: [
        { label: "Bring to Front", shortcut: "]", action: () => { bringToFront(); closeSidebar(); } },
        { label: "Send to Back", shortcut: "[", action: () => { sendToBack(); closeSidebar(); } },
      ],
    },
  ];

  const toggleCategory = (label: string) => {
    setExpandedCategory(expandedCategory === label ? null : label);
  };

  return (
    <>
      <div className="menu-bar" ref={menuBarRef}>
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Menu"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
        {filePath && (
          <span className="menu-bar-filename">
            {filePath.split("/").pop()}
          </span>
        )}
      </div>

      {sidebarOpen && <div className="sidebar-overlay" />}

      <div
        ref={sidebarRef}
        className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}
      >
        <div className="sidebar-header">
          <span>Menu</span>
          <button className="sidebar-close-btn" onClick={closeSidebar}>
            ✕
          </button>
        </div>

        <div className="sidebar-content">
          {menus.map((menu) => (
            <div key={menu.label} className="sidebar-category">
              <div
                className="sidebar-category-header"
                onClick={() => toggleCategory(menu.label)}
              >
                <span>{menu.label}</span>
                <span className={`sidebar-chevron ${expandedCategory === menu.label ? "sidebar-chevron-open" : ""}`}>
                  ▸
                </span>
              </div>
              {expandedCategory === menu.label && (
                <div className="sidebar-category-items">
                  {menu.items.map((item, i) =>
                    item.separator ? (
                      <div key={i} className="sidebar-separator" />
                    ) : (
                      <div
                        key={i}
                        className="sidebar-item"
                        onClick={() => item.action()}
                      >
                        <span>{item.label}</span>
                        {item.shortcut && (
                          <span className="sidebar-shortcut">{item.shortcut}</span>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {filePath && (
          <div className="sidebar-footer">
            {filePath.split("/").pop()}
          </div>
        )}
      </div>
    </>
  );
}
