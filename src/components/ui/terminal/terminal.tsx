import { useState, useRef, useEffect } from "react";

/**
 * HAWKNET — Terminal Panel
 * Basic terminal emulator UI component with resizable feature
 */

export default function Terminal() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([
    "HAWKNET Terminal v1.0.0",
    "Type 'help' for available commands",
    "",
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new output appears
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history]);

  // Focus input when terminal opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const command = input.trim();
    setHistory((prev) => [...prev, `$ ${command}`]);

    // Simulate command processing
    switch (command.toLowerCase()) {
      case "help":
        setHistory((prev) => [
          ...prev,
          "Available commands:",
          "  help     - Show this help message",
          "  clear    - Clear terminal",
          "  whoami   - Display current user",
          "  date     - Show current date/time",
          "",
        ]);
        break;
      case "clear":
        setHistory([]);
        break;
      case "whoami":
        setHistory((prev) => [...prev, "hawknet-user", ""]);
        break;
      case "date":
        setHistory((prev) => [...prev, new Date().toString(), ""]);
        break;
      default:
        setHistory((prev) => [
          ...prev,
          `Command not found: ${command}`,
          "Type 'help' for available commands",
          "",
        ]);
    }

    setInput("");
  };

  return (
    <div className="flex h-full flex-col bg-[#0b0e0c] font-mono text-sm">
      {/* Terminal header with resize hint */}
      <div className="flex items-center justify-between border-b border-[#1c211d] px-4 py-2">
        <span className="text-xs text-[#6b7268]">Terminal</span>
        <span className="text-[10px] text-[#6b7268] opacity-50">
          ↕ Drag top border to resize
        </span>
      </div>

      {/* Terminal output */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto px-4 py-2 text-[#cfd6c8]"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((line, index) => (
          <div
            key={index}
            className={`leading-6 ${
              line.startsWith("$") ? "text-[#e8ff6b]" : "text-[#9ba39a]"
            }`}
          >
            {line || "\u00A0"} {/* Non-breaking space for empty lines */}
          </div>
        ))}
      </div>

      {/* Terminal input */}
      <form onSubmit={handleSubmit} className="flex items-center border-t border-[#1c211d] px-4 py-2">
        <span className="mr-2 text-[#e8ff6b]">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent text-[#cfd6c8] outline-none placeholder:text-[#6b7268]"
          placeholder="Type a command..."
          spellCheck={false}
          autoComplete="off"
        />
      </form>
    </div>
  );
}