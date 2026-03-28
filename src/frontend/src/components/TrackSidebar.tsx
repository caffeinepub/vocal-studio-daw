import { Plus } from "lucide-react";
import { audioEngine } from "../audio/AudioEngine";
import { useDAWStore } from "../store/useDAWStore";
import { TrackRow } from "./TrackRow";

export function TrackSidebar() {
  const { tracks, addTrack } = useDAWStore();

  const handleAddEmpty = () => {
    const id = addTrack(`Track ${useDAWStore.getState().tracks.length + 1}`);
    audioEngine.initTrackNodes(id, 0.8, 0);
  };

  return (
    <aside className="w-72 shrink-0 flex flex-col bg-sidebar border-r border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Tracks
        </span>
        <button
          type="button"
          className="flex items-center gap-1 px-2 py-1 rounded bg-primary text-primary-foreground text-xs hover:opacity-90 transition-opacity"
          onClick={handleAddEmpty}
          data-ocid="track.add_button"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tracks.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-32 text-muted-foreground text-xs gap-2"
            data-ocid="track.empty_state"
          >
            <p>No tracks</p>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={handleAddEmpty}
            >
              Add a track
            </button>
          </div>
        ) : (
          tracks.map((track, index) => (
            <TrackRow key={track.id} track={track} index={index} />
          ))
        )}
      </div>
    </aside>
  );
}
