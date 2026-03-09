"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface YouTubePlayerProps {
  youtubeUrl: string;
}

function extractVideoId(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1];
  const liveMatch = url.match(/youtube\.com\/live\/([^?&]+)/);
  if (liveMatch) return liveMatch[1];
  return null;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function YouTubePlayer({ youtubeUrl }: YouTubePlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(100);
  const [isBehindLive, setIsBehindLive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [quality, setQuality] = useState("auto");
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const lastDurationRef = useRef(0);

  const videoId = extractVideoId(youtubeUrl);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT?.Player) {
      initPlayer();
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      initPlayer();
    };

    return () => {
      playerRef.current?.destroy();
    };
  }, [videoId]);

  function initPlayer() {
    if (!videoId || !containerRef.current) return;
    if (playerRef.current) playerRef.current.destroy();

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        disablekb: 1,
        fs: 0,
        playsinline: 1,
        cc_load_policy: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: (event: any) => {
          setPlayerReady(true);
          event.target.mute();
          setIsMuted(true);
          setVolume(event.target.getVolume());
          const quals = event.target.getAvailableQualityLevels?.() || [];
          setAvailableQualities(quals);
          event.target.playVideo();
        },
        onStateChange: (event: any) => {
          setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
          if (event.data === window.YT.PlayerState.PLAYING) {
            const dur = playerRef.current?.getDuration?.() || 0;
            setDuration(dur);
            // Detect live: check getVideoData().isLive or if duration keeps growing
            try {
              const videoData = playerRef.current?.getVideoData?.();
              if (videoData?.isLive) setIsLive(true);
            } catch {}
          }
        },
      },
    });
  }

  // Update time & detect behind-live
  useEffect(() => {
    if (!playerReady) return;
    const interval = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        const ct = playerRef.current.getCurrentTime();
        const dur = playerRef.current.getDuration?.() || 0;
        setCurrentTime(ct);
        setDuration(dur);

        // Detect live: if duration keeps growing, it's a live stream
        if (!isLive && dur > 0 && lastDurationRef.current > 0 && dur > lastDurationRef.current + 0.5) {
          setIsLive(true);
        }
        lastDurationRef.current = dur;

        // For live streams, if current time is more than 10s behind duration, user is behind live edge
        if (isLive && dur > 0 && dur - ct > 10) {
          setIsBehindLive(true);
        } else {
          setIsBehindLive(false);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [playerReady, isLive]);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimer();
    return () => clearTimeout(controlsTimerRef.current);
  }, [isPlaying, resetControlsTimer]);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const togglePlay = () => {
    if (isPlaying) playerRef.current?.pauseVideo();
    else playerRef.current?.playVideo();
  };

  const toggleMute = () => {
    if (isMuted) {
      playerRef.current?.unMute();
      setIsMuted(false);
    } else {
      playerRef.current?.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (val: number) => {
    playerRef.current?.setVolume(val);
    setVolume(val);
    if (val === 0) {
      playerRef.current?.mute();
      setIsMuted(true);
    } else if (isMuted) {
      playerRef.current?.unMute();
      setIsMuted(false);
    }
  };

  const handleSeek = (fraction: number) => {
    if (!duration) return;
    playerRef.current?.seekTo(fraction * duration, true);
  };

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapperRef.current.requestFullscreen();
  };

  const goToLive = () => {
    const dur = playerRef.current?.getDuration?.() || 0;
    if (dur > 0) {
      playerRef.current?.seekTo(dur, true);
      setIsBehindLive(false);
    }
  };

  const handleQualityChange = (q: string) => {
    playerRef.current?.setPlaybackQuality?.(q);
    setQuality(q);
    setShowQualityMenu(false);
  };

  const handleCast = () => {
    // Use native Picture-in-Picture as a fallback for "cast"
    const iframe = containerRef.current?.querySelector?.("iframe") as HTMLIFrameElement | null;
    if (iframe && document.pictureInPictureEnabled) {
      // PiP requires a video element, cast button will trigger browser's built-in
      // For now just show a message
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const qualityLabels: Record<string, string> = {
    highres: "4K",
    hd2160: "4K",
    hd1440: "1440p",
    hd1080: "1080p",
    hd720: "720p",
    large: "480p",
    medium: "360p",
    small: "240p",
    tiny: "144p",
    auto: "Auto",
  };

  if (!videoId) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white/50">
        Invalid YouTube URL
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      data-player-wrapper=""
      className="relative w-full h-full bg-black group"
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      onClick={(e) => {
        // Click on the video area (not controls) toggles play
        if ((e.target as HTMLElement).closest("[data-controls]")) return;
        togglePlay();
      }}
    >
      {/* YouTube Player (hidden controls) */}
      <div ref={containerRef} className="w-full h-full pointer-events-none" />

      {/* Custom Controls Overlay */}
      <div
        data-controls=""
        className="absolute inset-0 flex flex-col justify-end pointer-events-none transition-opacity duration-300"
        style={{ opacity: showControls ? 1 : 0 }}
      >
        {/* Gradient background for controls visibility */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        {/* Controls bar */}
        <div className="relative z-10 px-4 pb-3 pt-2 pointer-events-auto">
          {/* Progress bar */}
          {!isLive && duration > 0 && (
            <div
              className="w-full h-1 bg-white/10 rounded-full mb-3 cursor-pointer group/progress relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                handleSeek((e.clientX - rect.left) / rect.width);
              }}
            >
              <div
                className="h-full bg-[#06F9A8] rounded-full relative"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#06F9A8] rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#06F9A8] text-[#0f231c] hover:bg-[#34fabb] transition-all hover:scale-105 flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                {isPlaying ? (
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                ) : (
                  <path d="M8 5v14l11-7z" />
                )}
              </svg>
            </button>

            {/* Volume */}
            <div
              className="relative flex items-center"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  {isMuted || volume === 0 ? (
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  ) : volume < 50 ? (
                    <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                  ) : (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  )}
                </svg>
              </button>
              {showVolumeSlider && (
                <div className="flex items-center ml-1">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="w-20 h-1 accent-[#06F9A8] cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Time / Live badge */}
            <div className="flex-1 flex items-center gap-2">
              {isLive ? (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (isBehindLive) goToLive(); }}
                    className={`text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wider transition-colors ${isBehindLive ? 'bg-white/20 cursor-pointer hover:bg-white/30' : 'bg-red-600 cursor-default'}`}
                  >
                    {isBehindLive ? "Go Live" : "Live"}
                  </button>
                  <span className="text-white/40 text-xs font-mono">
                    {formatTime(currentTime)}
                  </span>
                </>
              ) : (
                <span className="text-white/50 text-xs font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              )}
            </div>

            {/* Quality selector */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQualityMenu(!showQualityMenu);
                }}
                className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                </svg>
              </button>
              {showQualityMenu && (
                <div className="absolute bottom-10 right-0 bg-[#1a1a1a] border border-white/10 rounded-lg py-1 min-w-[120px] shadow-2xl">
                  {availableQualities.length > 0
                    ? availableQualities.map((q) => (
                        <button
                          key={q}
                          onClick={(e) => { e.stopPropagation(); handleQualityChange(q); }}
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 transition-colors ${
                            quality === q ? "text-[#06F9A8]" : "text-white/70"
                          }`}
                        >
                          {qualityLabels[q] || q}
                        </button>
                      ))
                    : ["auto", "hd1080", "hd720", "large"].map((q) => (
                        <button
                          key={q}
                          onClick={(e) => { e.stopPropagation(); handleQualityChange(q); }}
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 transition-colors ${
                            quality === q ? "text-[#06F9A8]" : "text-white/70"
                          }`}
                        >
                          {qualityLabels[q] || q}
                        </button>
                      ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                {isFullscreen ? (
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                ) : (
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
