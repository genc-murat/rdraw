import { useState } from "react";
import MenuBar from "./components/MenuBar";
import Toolbar from "./components/Toolbar";
import Canvas from "./components/Canvas";
import PropertiesPanel from "./components/PropertiesPanel";
import PageTabs from "./components/PageTabs";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

export default function App() {
  useKeyboardShortcuts();
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="app-container">
      <MenuBar />
      <div className="main-area">
        <Toolbar />
        <Canvas />
        <button
          className="panel-toggle-btn"
          onClick={() => setPanelOpen((v) => !v)}
          title={panelOpen ? "Hide properties" : "Show properties"}
        >
          {panelOpen ? "›" : "‹"}
        </button>
        <PropertiesPanel open={panelOpen} />
      </div>
      <PageTabs />
    </div>
  );
}
