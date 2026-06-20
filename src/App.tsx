import Activitybar from "./components/activitybar/page";
import "./App.css";

function App() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Activitybar />

      <main className="flex min-h-0 flex-1 flex-col items-center justify-between overflow-auto py-32 px-16 sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight">
            Get started Here, edit App.tsx
          </h1>

          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Tauri + React + Tailwind v4
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;