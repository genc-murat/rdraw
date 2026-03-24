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
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNew = () => {
    clearAll();
    setFilePath(null);
    setOpenMenu(null);
  };

  const handleOpen = async () => {
    setOpenMenu(null);
    const result = await loadDrawing();
    if (result) {
      setElements(result.elements);
      setFilePath(result.path);
    }
  };

  const handleSave = async () => {
    setOpenMenu(null);
    const path = await saveDrawing(elements, filePath);
    if (path) setFilePath(path);
  };

  const handleSaveAs = async () => {
    setOpenMenu(null);
    const path = await saveDrawing(elements);
    if (path) setFilePath(path);
  };

  const handleExportPNG = async () => {
    setOpenMenu(null);
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    if (canvas) await exportPNG(canvas);
  };

  const handleExportSVG = async () => {
    setOpenMenu(null);
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
        { label: "Undo", shortcut: "Ctrl+Z", action: () => { undo(); setOpenMenu(null); } },
        { label: "Redo", shortcut: "Ctrl+Shift+Z", action: () => { redo(); setOpenMenu(null); } },
        { separator: true },
        { label: "Cut", shortcut: "Ctrl+X", action: () => { cut(); setOpenMenu(null); } },
        { label: "Copy", shortcut: "Ctrl+C", action: () => { copy(); setOpenMenu(null); } },
        { label: "Paste", shortcut: "Ctrl+V", action: () => { paste(); setOpenMenu(null); } },
        { label: "Duplicate", shortcut: "Ctrl+D", action: () => { duplicate(); setOpenMenu(null); } },
        { separator: true },
        { label: "Select All", shortcut: "Ctrl+A", action: () => { selectAll(); setOpenMenu(null); } },
      ],
    },
    {
      label: "View",
      items: [
        { label: "Reset View", shortcut: "", action: () => { resetView(); setOpenMenu(null); } },
      ],
    },
    {
      label: "Arrange",
      items: [
        { label: "Bring to Front", shortcut: "]", action: () => { bringToFront(); setOpenMenu(null); } },
        { label: "Send to Back", shortcut: "[", action: () => { sendToBack(); setOpenMenu(null); } },
      ],
    },
  ];

  return (
    <div className="menu-bar" ref={menuRef}>
      {menus.map((menu) => (
        <div
          key={menu.label}
          className="menu-item"
          onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
        >
          {menu.label}
          {openMenu === menu.label && (
            <div className="menu-dropdown">
              {menu.items.map((item, i) =>
                item.separator ? (
                  <div key={i} className="menu-separator" />
                ) : (
                  <div
                    key={i}
                    className="menu-dropdown-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      item.action();
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className="shortcut">{item.shortcut}</span>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ))}
      {filePath && (
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#888", paddingRight: 8 }}>
          {filePath.split("/").pop()}
        </span>
      )}
    </div>
  );
}
