"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getActiveMatch, getStreamInfo, getViewerToken, ActiveMatch, StreamInfo } from "@/lib/api";
import YouTubePlayer from "@/components/YouTubePlayer";
import CommentatorOverlay from "@/components/CommentatorOverlay";

const POLL_INTERVAL = 3000;

export default function WatchPage() {
  const params = useParams();
  const streamId = params.streamId as string;
  const [stream, setStream] = useState<StreamInfo | null>(null);
  const [match, setMatch] = useState<ActiveMatch | null>(null);
  const [dailyToken, setDailyToken] = useState<{ token: string; roomUrl: string; roomName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <main className="relative bg-black overflow-hidden w-screen h-screen">
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

      {/* Scoreboard is burned into the video stream by stream-mixer */}

    </main>
  );
}
