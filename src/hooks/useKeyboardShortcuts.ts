import { useEffect, useCallback } from "react";
import useAppStore from "../store/useAppStore";
import { updateConnectorPoints } from "../utils/connectors";
import type { LineElement } from "../types";

const NUDGE_STEP = 1;
const NUDGE_STEP_SHIFT = 10;

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
    group,
    ungroup,
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
      } else if (ctrl && e.shiftKey && (e.key === "G" || e.key === "g")) {
        e.preventDefault();
        ungroup();
      } else if (ctrl && (e.key === "g" || e.key === "G")) {
        e.preventDefault();
        group();
      } else if (ctrl && e.key === "0") {
        e.preventDefault();
        resetView();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeElements(selectedIds);
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (selectedIds.length === 0) return;
        e.preventDefault();
        const step = e.shiftKey ? NUDGE_STEP_SHIFT : NUDGE_STEP;
        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowUp") dy = -step;
        else if (e.key === "ArrowDown") dy = step;
        else if (e.key === "ArrowLeft") dx = -step;
        else if (e.key === "ArrowRight") dx = step;
        const state = useAppStore.getState();
        state.pushHistory();
        for (const id of selectedIds) {
          const el = state.elements.find((e) => e.id === id);
          if (!el) continue;
          if (el.type === "line" || el.type === "arrow" || el.type === "c4-relationship" || el.type === "freehand") {
            state.updateElement(id, { x: el.x + dx, y: el.y + dy } as any);
          } else {
            state.updateElement(id, { x: el.x + dx, y: el.y + dy } as any);
          }
        }
        // Update connected arrows
        const movedIds = new Set(selectedIds);
        for (const el of state.elements) {
          if ((el.type === "arrow" || el.type === "line" || el.type === "c4-relationship") &&
              ((el as LineElement).startElementId && movedIds.has((el as LineElement).startElementId!) ||
               (el as LineElement).endElementId && movedIds.has((el as LineElement).endElementId!))) {
            const updates = updateConnectorPoints(el as LineElement, state.elements);
            if (updates) {
              state.updateElement(el.id, updates as any);
            }
          }
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        const state = useAppStore.getState();
        // Don't clear selection if an overlay is open - let the overlay handle Escape
        if (state.showTextInput || state.showMermaidInput || state.showC4LabelInput) return;
        state.clearSelection();
        setTool("select");
      } else if (e.key === "v" || e.key === "V") {
        setTool("select");
      } else if (e.shiftKey && (e.key === "r" || e.key === "R")) {
        setTool("rounded-rectangle");
      } else if (e.key === "r" || e.key === "R") {
        setTool("rectangle");
      } else if (e.key === "s" || e.key === "S") {
        setTool("star");
      } else if (e.key === "x" || e.key === "X") {
        setTool("hexagon");
      } else if (e.key === "c" || e.key === "C") {
        setTool("callout");
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
      } else if (e.key === "n" || e.key === "N") {
        setTool("note");
      } else if ((e.key === "g" || e.key === "G") && !ctrl) {
        setTool("highlight");
      } else if (e.key === "1") {
        setTool("c4-person");
      } else if (e.key === "2") {
        setTool("c4-software-system");
      } else if (e.key === "3") {
        setTool("c4-container");
      } else if (e.key === "4") {
        setTool("c4-component");
      } else if (e.key === "5") {
        setTool("c4-database");
      } else if (e.key === "6") {
        setTool("c4-system-boundary");
      } else if (e.key === "7") {
        setTool("c4-enterprise-boundary");
      } else if (e.key === "8") {
        setTool("c4-relationship");
      } else if (e.key === "[" || e.key === "{") {
        sendToBack();
      } else if (e.key === "]" || e.key === "}") {
        bringToFront();
      }
    },
    [undo, redo, copy, cut, paste, duplicate, selectAll, removeElements, selectedIds, setTool, bringToFront, sendToBack, resetView, createPage, group, ungroup]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
