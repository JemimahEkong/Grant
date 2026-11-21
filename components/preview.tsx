"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PauseIcon, PlayIcon } from "./icons";
import { formatDuration } from "../lib/ui/format";

export type VideoPreview = {
  url: string;
  duration: number;
  width: number;
  height: number;
};

type PreviewAudioContextValue = {
  activeTrackId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  play: (trackId: string) => void;
  pause: () => void;
  toggle: (trackId: string) => void;
  seek: (seconds: number) => void;
};

type VideoPreviewContextValue = {
  video: VideoPreview | null;
  busy: boolean;
  error: string | null;
  setVideo: (file: File) => Promise<VideoPreview>;
  clearVideo: () => void;
};

const PreviewAudioContext = createContext<PreviewAudioContextValue | null>(null);
const VideoPreviewContext = createContext<VideoPreviewContextValue | null>(null);

export function usePreviewAudio(): PreviewAudioContextValue {
  const value = useContext(PreviewAudioContext);
  if (!value) throw new Error("usePreviewAudio must be used inside PreviewProvider");
  return value;
}

export function useVideoPreview(): VideoPreviewContextValue {
  const value = useContext(VideoPreviewContext);
  if (!value) throw new Error("useVideoPreview must be used inside PreviewProvider");
  return value;
}

function readVideoMetadata(url: string): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const element = document.createElement("video");
    element.preload = "metadata";
    element.muted = true;
    element.playsInline = true;
    element.style.position = "fixed";
    element.style.width = "1px";
    element.style.height = "1px";
    element.style.opacity = "0";
    element.style.pointerEvents = "none";
    element.setAttribute("aria-hidden", "true");
    element.tabIndex = -1;

    let settled = false;
    const cleanup = () => {
      element.removeEventListener("loadedmetadata", onLoaded);
      element.removeEventListener("error", onError);
      element.remove();
      element.removeAttribute("src");
      element.load();
    };
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      action();
    };
    const onLoaded = () => {
      const duration = element.duration;
      const width = element.videoWidth;
      const height = element.videoHeight;
      if (!Number.isFinite(duration) || duration <= 0 || width <= 0 || height <= 0) {
        finish(() => reject(new Error("This video has no readable length. Try a different clip.")));
        return;
      }
      finish(() => resolve({ duration, width, height }));
    };
    const onError = () => {
      finish(() => reject(new Error("This browser could not read that video. Try MP4 or WebM.")));
    };

    element.addEventListener("loadedmetadata", onLoaded);
    element.addEventListener("error", onError);
    element.src = url;
    document.body.appendChild(element);
    element.load();
  });
}

function usePreviewAudioController(): PreviewAudioContextValue {
  const pathname = usePathname();
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef<string | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration || 0);
    };
    const onError = () => {
      setIsPlaying(false);
      setError("Preview unavailable for this track.");
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioRef.current?.pause();
  }, [pathname]);

  const play = useCallback((trackId: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);

    if (activeRef.current !== trackId) {
      activeRef.current = trackId;
      setActiveTrackId(trackId);
      setCurrentTime(0);
      setDuration(0);
      audio.src = `/api/catalog/${encodeURIComponent(trackId)}/preview`;
      audio.load();
    } else if (audio.duration > 0 && audio.currentTime >= audio.duration - 0.05) {
      audio.currentTime = 0;
      setCurrentTime(0);
    }

    const started = audio.play();
    if (started) {
      void started.catch((failure: unknown) => {
        if (failure instanceof DOMException && failure.name === "AbortError") return;
        setError("Preview could not start. Try again.");
      });
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(
    (trackId: string) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (activeRef.current === trackId && !audio.paused) audio.pause();
      else play(trackId);
    },
    [play],
  );

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const max = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : seconds;
    const next = Math.min(Math.max(0, seconds), max);
    audio.currentTime = next;
    setCurrentTime(next);
  }, []);

  return useMemo(
    () => ({ activeTrackId, isPlaying, currentTime, duration, error, play, pause, toggle, seek }),
    [activeTrackId, currentTime, duration, error, isPlaying, pause, play, seek, toggle],
  );
}

function useVideoPreviewController(): VideoPreviewContextValue {
  const [video, setVideoState] = useState<VideoPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const setVideo = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    const url = URL.createObjectURL(file);

    try {
      const metadata = await readVideoMetadata(url);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      const next = { url, ...metadata };
      setVideoState(next);
      return next;
    } catch (failure) {
      URL.revokeObjectURL(url);
      const message = failure instanceof Error ? failure.message : "This video could not be read.";
      setError(message);
      throw failure;
    } finally {
      setBusy(false);
    }
  }, []);

  const clearVideo = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setVideoState(null);
    setError(null);
  }, []);

  return useMemo(
    () => ({ video, busy, error, setVideo, clearVideo }),
    [busy, clearVideo, error, setVideo, video],
  );
}

export function PreviewProvider({ children }: { children: ReactNode }) {
  const audio = usePreviewAudioController();
  const video = useVideoPreviewController();
  return (
    <PreviewAudioContext.Provider value={audio}>
      <VideoPreviewContext.Provider value={video}>{children}</VideoPreviewContext.Provider>
    </PreviewAudioContext.Provider>
  );
}

export function PreviewPlayer({
  trackId,
  title,
  compact = false,
}: {
  trackId: string;
  title: string;
  compact?: boolean;
}) {
  const audio = usePreviewAudio();
  const { video } = useVideoPreview();
  const videoRef = useRef<HTMLVideoElement>(null);

  const isActive = audio.activeTrackId === trackId;
  const playing = isActive && audio.isPlaying;
  const currentTime = isActive ? audio.currentTime : 0;
  const duration = isActive && audio.duration > 0 ? audio.duration : 0;
  const max = duration || 40;
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const remaining = duration > 0 ? Math.max(0, duration - currentTime) : 0;
  const activeVideo = isActive ? video : null;

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    if (playing) {
      if (element.readyState >= 1 && Math.abs(element.currentTime - currentTime) > 0.2) {
        element.currentTime = Math.min(currentTime, element.duration || currentTime);
      }
      if (element.paused) void element.play().catch(() => {});
    } else {
      element.pause();
    }
  }, [activeVideo, currentTime, playing]);

  function handleToggle() {
    if (!isActive) {
      audio.play(trackId);
      return;
    }
    if (audio.isPlaying) {
      audio.pause();
      return;
    }
    if (activeVideo && videoRef.current?.ended) audio.seek(0);
    audio.play(trackId);
  }

  function handleSeek(value: number) {
    audio.seek(value);
    if (activeVideo && videoRef.current && videoRef.current.readyState >= 1) {
      videoRef.current.currentTime = Math.min(value, videoRef.current.duration || value);
    }
  }

  const videoBlock = activeVideo ? (
    <video
      ref={videoRef}
      className="preview-video"
      src={activeVideo.url}
      muted
      playsInline
      preload="metadata"
      aria-hidden="true"
      onEnded={audio.pause}
    />
  ) : null;

  return (
    <div className={`preview-player${compact ? " compact" : ""}`} role="group" aria-label={`Preview ${title}`}>
      {compact ? null : videoBlock}

      <div className="preview-controls">
        <button
          type="button"
          className="preview-toggle"
          onClick={handleToggle}
          aria-label={playing ? `Pause preview of ${title}` : `Play preview of ${title}`}
          aria-pressed={playing}
        >
          {playing ? <PauseIcon className="preview-icon" /> : <PlayIcon className="preview-icon" />}
        </button>

        <input
          className="preview-range"
          type="range"
          min={0}
          max={max}
          step={0.1}
          value={Math.min(currentTime, max)}
          disabled={!isActive || duration === 0}
          onChange={event => handleSeek(Number(event.target.value))}
          aria-label={`Seek preview of ${title}`}
          aria-valuetext={
            duration > 0
              ? `${formatDuration(Math.floor(currentTime))} of ${formatDuration(Math.floor(duration))}`
              : "Preview not loaded"
          }
          style={{ "--preview-progress": `${progress}%` } as CSSProperties}
        />

        <span className="preview-time" aria-hidden="true">
          {duration > 0 ? `${formatDuration(Math.ceil(remaining))} left` : "40s preview"}
        </span>
      </div>

      {compact ? videoBlock : null}
      {isActive && audio.error ? <p className="preview-error">{audio.error}</p> : null}
      {isActive && activeVideo ? (
        <p className="preview-foot">Your footage, muted. It stays on this device.</p>
      ) : null}
    </div>
  );
}
