import { useState } from "react";
import Activitybar, { type ActivityId } from "./components/activitybar/page";
import Workspace from "./components/workspace/page";
import Analyzer from "./components/analyzer/page";
import Terminal from "./components/ui/terminal/terminal";
import Sidebar from "./components/ui/sidebar/sidebar";
import Connections from "./components/connection/page";
import { useSidebar } from "./hooks/useSidebar";
import { useConnections, useConnectionsListener } from "./hooks/useConnections";
import { useResizable, useTerminalResizable } from "./hooks/useResizable";
import "./App.css";

function App() {
  const [activeView, setActiveView] = useState<ActivityId>("recon");
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const { isOpen: isSidebarOpen, toggle: toggleSidebar } = useSidebar();
  const { isOpen: isConnectionsOpen, close: closeConnections } = useConnections();
  
  // Listen for connections toggle from ActivityBar
  useConnectionsListener();
  
  const {
    width: sidebarWidth,
    startResizing: startSidebarResize,
  } = useResizable({
    initialWidth: 300,
    minWidth: 200,
    maxWidth: 500,
  });

  const {
    height: terminalHeight,
    startResizing: startTerminalResize,
  } = useTerminalResizable({
    initialHeight: 300,
    minHeight: 150,
    maxHeight: 500,
  });

  const handleViewSelect = (id: ActivityId) => {
    if (id === "terminal") {
      setIsTerminalOpen(!isTerminalOpen);
    } else if (id === "box") {
      toggleSidebar();
    } else {
      setActiveView(id);
    }
  };

  const renderMainContent = () => {
    switch (activeView) {
      case "recon":
        return <Workspace />;
      case "analyzer":
        return <Analyzer />;
      default:
        return <Workspace />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Activitybar 
        active={activeView} 
        onSelect={handleViewSelect}
        isTerminalOpen={isTerminalOpen}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Sidebar Container with resizable border */}
      <div 
        className="relative flex-shrink-0 h-full overflow-hidden"
        style={{
          width: isSidebarOpen ? `${sidebarWidth}px` : '0px',
        }}
      >
        <div 
          className="absolute top-0 left-0 h-full border-r border-[#1c211d] bg-[#0b0e0c]"
          style={{
            width: `${sidebarWidth}px`,
          }}
        >
          <Sidebar />
        </div>

        {/* Resize Handle สำหรับ Sidebar */}
        {isSidebarOpen && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#e8ff6b]/30 transition-colors z-50 group"
            onMouseDown={startSidebarResize}
            style={{ right: '-2px' }}
          >
            <div className="absolute top-1/2 right-0 w-0.5 h-8 -translate-y-1/2 bg-[#6b7268] group-hover:bg-[#e8ff6b] transition-colors rounded-full" />
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Main content area */}
        <main className="flex min-h-0 flex-1 overflow-auto">
          {renderMainContent()}
        </main>

        {/* Terminal panel with resizable border */}
        <div
          className="relative border-t border-[#1c211d] bg-[#0b0e0c] overflow-hidden"
          style={{
            height: isTerminalOpen ? `${terminalHeight}px` : '0px',
          }}
        >
          {/* Resize Handle สำหรับ Terminal */}
          {isTerminalOpen && (
            <div
              className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-[#e8ff6b]/30 transition-colors z-50 group"
              onMouseDown={startTerminalResize}
              style={{ top: '-2px' }}
            >
              <div className="absolute left-1/2 top-0 w-8 h-0.5 -translate-x-1/2 bg-[#6b7268] group-hover:bg-[#e8ff6b] transition-colors rounded-full" />
            </div>
          )}

          <div className="h-full overflow-hidden">
            <Terminal />
          </div>
        </div>
      </div>

      {/* Connections Modal */}
      {isConnectionsOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            // Close when clicking backdrop
            if (e.target === e.currentTarget) {
              closeConnections();
            }
          }}
        >
          <div 
            className="w-[700px] h-[550px] rounded-lg shadow-2xl border border-[#1c211d] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Connections />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;