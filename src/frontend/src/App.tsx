import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import { EffectsPanel } from "./components/EffectsPanel";
import { ExportModal } from "./components/ExportModal";
import { Header } from "./components/Header";
import { MasterSection } from "./components/MasterSection";
import { Timeline } from "./components/Timeline";
import { TrackSidebar } from "./components/TrackSidebar";
import { TransportBar } from "./components/TransportBar";
import { useDAWStore } from "./store/useDAWStore";

export default function App() {
  const { activePanel } = useDAWStore();
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <TrackSidebar />
        <Timeline />
      </div>

      {/* Transport */}
      <TransportBar onExport={() => setExportOpen(true)} />

      {/* Mixer panel (collapsible) */}
      {activePanel === "mixer" && <MasterSection />}

      {/* Modals */}
      <EffectsPanel />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />

      <Toaster />
    </div>
  );
}
