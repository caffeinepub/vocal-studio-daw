import { useCallback, useEffect, useRef, useState } from "react";
import { audioEngine } from "../audio/AudioEngine";
import { useDAWStore } from "../store/useDAWStore";
import { TimelineRuler } from "./TimelineRuler";
import { TrackLane } from "./TrackLane";

export function Timeline() {
  const {
    tracks,
    isPlaying,
    currentTime,
    setCurrentTime,
    zoom,
    scrollX,
    setScrollX,
    totalDuration,
    setPlaying,
  } = useDAWStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const animFrameRef = useRef<number>(0);
  const LANE_HEIGHT = 56;
  const RULER_HEIGHT = 32;

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    setContainerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  // Playhead animation
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const tick = () => {
      const t = audioEngine.getCurrentTime();
      setCurrentTime(t);

      // Auto-scroll when playhead goes out of view
      const playheadX = t * zoom;
      const visibleEnd = scrollX + containerWidth - 20;
      if (playheadX > visibleEnd) {
        setScrollX(playheadX - containerWidth * 0.3);
      }

      // Check loop
      const state = useDAWStore.getState();
      if (state.isLooping && t >= state.totalDuration) {
        audioEngine.seekTo(0);
        audioEngine.startPlayback(state.tracks, 0);
        setCurrentTime(0);
      } else if (!state.isLooping && t >= state.totalDuration) {
        audioEngine.stopPlayback();
        setPlaying(false);
        setCurrentTime(state.totalDuration);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [
    isPlaying,
    zoom,
    scrollX,
    containerWidth,
    setCurrentTime,
    setScrollX,
    setPlaying,
  ]);

  const handleSeek = useCallback(
    (time: number) => {
      const wasPlaying = audioEngine.seekTo(time);
      setCurrentTime(time);
      if (wasPlaying) {
        const state = useDAWStore.getState();
        audioEngine.startPlayback(state.tracks, time);
        setPlaying(true);
      }
    },
    [setCurrentTime, setPlaying],
  );

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollX(e.currentTarget.scrollLeft);
  };

  const contentWidth = Math.max(containerWidth, totalDuration * zoom + 200);
  const playheadX = currentTime * zoom - scrollX;

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden bg-background relative"
      ref={containerRef}
      data-ocid="timeline.panel"
    >
      {/* Scrollable area */}
      <div
        className="flex-1 overflow-x-auto overflow-y-auto"
        onScroll={handleScroll}
        style={{ position: "relative" }}
      >
        {/* Ruler */}
        <div className="sticky top-0 z-10">
          <TimelineRuler
            width={Math.max(contentWidth, containerWidth)}
            scrollX={scrollX}
            onSeek={handleSeek}
          />
        </div>

        {/* Track lanes */}
        <div style={{ width: contentWidth, position: "relative" }}>
          {tracks.map((track) => (
            <TrackLane
              key={track.id}
              track={track}
              width={contentWidth}
              scrollX={scrollX}
            />
          ))}

          {tracks.length === 0 && (
            <div
              className="flex items-center justify-center h-32 text-muted-foreground text-sm"
              data-ocid="timeline.empty_state"
            >
              Add tracks to get started
            </div>
          )}
        </div>

        {/* Playhead */}
        {playheadX >= 0 && playheadX <= containerWidth && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-daw-red pointer-events-none z-20"
            style={{
              left: playheadX,
              top: 0,
              height: RULER_HEIGHT + tracks.length * LANE_HEIGHT,
            }}
          />
        )}
      </div>
    </div>
  );
}
