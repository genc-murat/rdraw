import MenuBar from "./components/MenuBar";
import Toolbar from "./components/Toolbar";
import Canvas from "./components/Canvas";
import PropertiesPanel from "./components/PropertiesPanel";
import PageTabs from "./components/PageTabs";
import LibraryPanel from "./components/LibraryPanel";
import PresentationMode from "./components/PresentationMode";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useAutoSave } from "./hooks/useAutoSave";
import useAppStore from "./store/useAppStore";

export default function App() {
  useKeyboardShortcuts();
  useAutoSave();
  const panelOpen = useAppStore((s) => s.panelOpen);
  const togglePanel = useAppStore((s) => s.togglePanel);
  const presentationMode = useAppStore((s) => s.presentationMode);

  if (presentationMode) {
    return <PresentationMode />;
  }

  return (
    <div className="app-container">
      <MenuBar />
      <div className="main-area">
        <LibraryPanel />
        <Toolbar />
        <Canvas />
        <button
          className="panel-toggle-btn"
          onClick={togglePanel}
          title={panelOpen ? "Hide properties" : "Show properties"}
        >
          {panelOpen ? "\u203A" : "\u2039"}
        </button>
        {panelOpen && <PropertiesPanel />}
      </div>
      <PageTabs />
    </div>
  );
}
