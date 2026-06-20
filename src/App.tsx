import { useState } from "react";
import Activitybar, { type ActivityId } from "./components/activitybar/page";
import Workspace from "./components/workspace/page";
import Analyzer from "./components/analyzer/page";
import Terminal from "./components/ui/terminal/terminal";
import "./App.css";

function App() {
  const [activeView, setActiveView] = useState<ActivityId>("recon");
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  const handleViewSelect = (id: ActivityId) => {
    if (id === "terminal") {
      // Toggle terminal panel
      setIsTerminalOpen(!isTerminalOpen);
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
      case "box":
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-lg text-zinc-400">WorkBox - Coming Soon</p>
          </div>
        );
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
      />

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