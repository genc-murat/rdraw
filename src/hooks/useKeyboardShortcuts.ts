import { useEffect, useCallback } from "react";
import useAppStore from "../store/useAppStore";

export function useKeyboardShortcuts() {
  const {
    undo,
    redo,
    copy,
    cut,
    paste,
    duplicate,
    selectAll,
    removeElements,
    selectedIds,
    setTool,
    bringToFront,
    sendToBack,
    resetView,
    createPage,
  } = useAppStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (ctrl && (e.key === "Z" || (e.key === "z" && e.shiftKey) || e.key === "y")) {
        e.preventDefault();
        redo();
      } else if (ctrl && e.shiftKey && (e.key === "N" || e.key === "n")) {
        e.preventDefault();
        createPage();
      } else if (ctrl && e.key === "c") {
        e.preventDefault();
        copy();
      } else if (ctrl && e.key === "x") {
        e.preventDefault();
        cut();
      } else if (ctrl && e.key === "v") {
        e.preventDefault();
        paste();
      } else if (ctrl && e.key === "d") {
        e.preventDefault();
        duplicate();
      } else if (ctrl && e.key === "a") {
        e.preventDefault();
        selectAll();
      } else if (ctrl && e.key === "0") {
        e.preventDefault();
        resetView();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeElements(selectedIds);
      } else if (e.key === "Escape") {
        e.preventDefault();
        useAppStore.getState().clearSelection();
        setTool("select");
      } else if (e.key === "v" || e.key === "V") {
        setTool("select");
      } else if (e.key === "r" || e.key === "R") {
        setTool("rectangle");
      } else if (e.key === "e" || e.key === "E") {
        setTool("ellipse");
      } else if (e.key === "d" && !ctrl) {
        setTool("diamond");
      } else if (e.key === "l" || e.key === "L") {
        setTool("line");
      } else if (e.key === "a" && !ctrl) {
        setTool("arrow");
      } else if (e.key === "p" || e.key === "P") {
        setTool("freehand");
      } else if (e.key === "t" || e.key === "T") {
        setTool("text");
      } else if (e.key === "h" || e.key === "H") {
        setTool("hand");
      } else if (e.key === "m" || e.key === "M") {
        setTool("mermaid");
      } else if ((e.key === "g" || e.key === "G") && !ctrl) {
        setTool("highlight");
      } else if (e.key === "[" || e.key === "{") {
        sendToBack();
      } else if (e.key === "]" || e.key === "}") {
        bringToFront();
      }
    },
    [undo, redo, copy, cut, paste, duplicate, selectAll, removeElements, selectedIds, setTool, bringToFront, sendToBack, resetView, createPage]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
