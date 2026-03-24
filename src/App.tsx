import MenuBar from "./components/MenuBar";
import Toolbar from "./components/Toolbar";
import Canvas from "./components/Canvas";
import PropertiesPanel from "./components/PropertiesPanel";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

export default function App() {
  useKeyboardShortcuts();

  return (
    <div className="app-container">
      <MenuBar />
      <Toolbar />
      <div className="main-area">
        <Canvas />
        <PropertiesPanel />
      </div>
    </div>
  );
}
