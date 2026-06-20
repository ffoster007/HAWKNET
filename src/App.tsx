import { useState } from "react";
import Activitybar, { type ActivityId } from "./components/activitybar/page";
import Workspace from "./components/workspace/page";
import Analyzer from "./components/analyzer/page";
import Terminal from "./components/ui/terminal/terminal";
import Sidebar from "./components/ui/sidebar/sidebar";
import { useSidebar } from "./hooks/useSidebar";
import "./App.css";

function App() {
  const [activeView, setActiveView] = useState<ActivityId>("recon");
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const { isOpen: isSidebarOpen, toggle: toggleSidebar } = useSidebar();

  const handleViewSelect = (id: ActivityId) => {
    if (id === "terminal") {
      // Toggle terminal panel
      setIsTerminalOpen(!isTerminalOpen);
    } else if (id === "box") {
      // Toggle sidebar
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

      {/* Sidebar - slides from left */}
      <div
        className={[
          "border-r border-[#1c211d] bg-[#0b0e0c] overflow-hidden",
          isSidebarOpen ? "w-[300px]" : "w-0",
        ].join(" ")}
      >
        <div className="h-full w-[300px] overflow-hidden">
          <Sidebar />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Main content area */}
        <main className="flex min-h-0 flex-1 overflow-auto">
          {renderMainContent()}
        </main>

        {/* Terminal panel - slides up from bottom */}
        <div
          className={[
            "border-t border-[#1c211d] bg-[#0b0e0c]",
            isTerminalOpen ? "h-[300px]" : "h-0",
          ].join(" ")}
        >
          <div className="h-full overflow-hidden">
            <Terminal />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;