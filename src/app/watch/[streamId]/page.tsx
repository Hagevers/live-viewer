"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { getActiveMatch, getStreamInfo, getViewerToken, ActiveMatch, StreamInfo } from "@/lib/api";
import Scoreboard from "@/components/Scoreboard";
import YouTubePlayer from "@/components/YouTubePlayer";
import CommentatorOverlay from "@/components/CommentatorOverlay";

const POLL_INTERVAL = 3000;

export default function WatchPage() {
  const params = useParams();
  const streamId = params.streamId as string;
  const containerRef = useRef<HTMLDivElement>(null);

  const [stream, setStream] = useState<StreamInfo | null>(null);
  const [match, setMatch] = useState<ActiveMatch | null>(null);
  const [dailyToken, setDailyToken] = useState<{ token: string; roomUrl: string; roomName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch stream info once
  useEffect(() => {
    async function fetchStream() {
      const info = await getStreamInfo(streamId);
      if (!info) {
        setError("Stream not found");
        setLoading(false);
        return;
      }
      if (info.status === "ended") {
        setError("This stream has ended");
        setLoading(false);
        return;
      }
      setStream(info);
      setLoading(false);

      // Get viewer token for Daily.co
      const token = await getViewerToken(streamId);
      if (token?.token) {
        setDailyToken(token);
      }
    }
    fetchStream();
  }, [streamId]);

  // Poll for active match
  useEffect(() => {
    if (!stream) return;

    let active = true;

    async function poll() {
      const data = await getActiveMatch(streamId);
      if (active) {
        setMatch(data);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [stream, streamId]);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => {
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  const toggleFullscreen = () => {
    const el = containerRef.current as any;
    if (!el) return;
    const doc = document as any;

    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      if (doc.exitFullscreen) doc.exitFullscreen();
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    } else if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else {
      // iOS fallback: CSS-based fullscreen
      setIsFullscreen((prev) => {
        document.body.style.overflow = !prev ? "hidden" : "";
        return !prev;
      });
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-white/50 text-lg">Loading...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-white/50 text-lg">{error}</div>
      </main>
    );
  }

  const youtubeUrl = match?.youtubeUrl || stream?.youtubeUrl;

  return (
    <main
      ref={containerRef}
      className={`relative bg-black overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-[9999] w-screen h-screen" : "w-screen h-screen"
      }`}
    >
      {/* YouTube Player - full screen */}
      {youtubeUrl ? (
        <YouTubePlayer youtubeUrl={youtubeUrl} />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-white/40">
            <p className="text-xl font-semibold mb-2">
              {stream?.courtName || "Live Stream"}
            </p>
            <p>Waiting for stream to start...</p>
          </div>
        </div>
      )}

      {/* Commentator PiP overlay */}
      {dailyToken && (
        <CommentatorOverlay
          roomUrl={dailyToken.roomUrl}
          token={dailyToken.token}
        />
      )}

      {/* Scoreboard overlay */}
      {match && (
        <Scoreboard
          team1Name={match.team1Name}
          team2Name={match.team2Name}
          score={match.score}
          courtName={match.courtName}
        />
      )}

      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        onTouchEnd={(e) => { e.preventDefault(); toggleFullscreen(); }}
        className="absolute top-4 right-4 z-[9999] w-12 h-12 flex items-center justify-center rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/70 active:text-white transition-all backdrop-blur-sm touch-manipulation"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          {isFullscreen
            ? <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
            : <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />}
        </svg>
      </button>
    </main>
  );
}
