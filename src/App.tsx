import Activitybar from "./components/activitybar/page";
import "./App.css";

function App() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Activitybar />

      <main className="flex min-h-0 flex-1 flex-col items-center justify-between overflow-auto py-32 px-16 sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight">
            To get started, edit App.tsx
          </h1>

          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Tauri + React + Tailwind v4
          </p>
        </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://tauri.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Tauri Docs
          </a>

          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://react.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            React Docs
          </a>
        </div>
      </main>
    </div>
  );
}

export default App;