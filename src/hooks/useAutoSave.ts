import { useEffect, useRef } from "react";
import useAppStore from "../store/useAppStore";
import { saveDrawing } from "../utils/export";
import type { DrawElement } from "../types";

const AUTO_SAVE_DELAY = 30000; // 30 seconds
const LOCAL_STORAGE_KEY = "rdraw-recovery";

export function useAutoSave() {
  const elements = useAppStore((s) => s.elements);
  const pages = useAppStore((s) => s.pages);
  const activePageId = useAppStore((s) => s.activePageId);
  const filePath = useAppStore((s) => s.filePath);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced file auto-save
  useEffect(() => {
    if (!filePath) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      const state = useAppStore.getState();
      const updatedPages = state.pages.map((p) =>
        p.id === state.activePageId ? { ...p, elements: state.elements } : p
      );
      await saveDrawing(updatedPages, state.activePageId, state.filePath);
    }, AUTO_SAVE_DELAY);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [elements, pages, activePageId, filePath]);

  // Save to localStorage on beforeunload for crash recovery
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const state = useAppStore.getState();
        const recoveryData = {
          elements: state.elements,
          pages: state.pages.map((p) =>
            p.id === state.activePageId ? { ...p, elements: state.elements } : p
          ),
          activePageId: state.activePageId,
          timestamp: Date.now(),
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(recoveryData));
      } catch {
        // localStorage might be full or unavailable
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Offer recovery on mount if no file is loaded and recovery data exists
  useEffect(() => {
    const state = useAppStore.getState();
    if (state.filePath) return;
    if (state.elements.length > 0) return;

    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw);
      if (!data.elements || data.elements.length === 0) return;

      const age = Date.now() - (data.timestamp || 0);
      if (age > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        return;
      }

      if (window.confirm("Recover unsaved drawing from your last session?")) {
        const elements = data.elements as DrawElement[];
        useAppStore.setState({
          elements,
          pages: data.pages || [{ id: "page-default", name: "Page 1", elements }],
          activePageId: data.activePageId || "page-default",
          history: [JSON.parse(JSON.stringify(elements))],
          historyIndex: 0,
        });
      }
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // Invalid recovery data
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, []);
}
