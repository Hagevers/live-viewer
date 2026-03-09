"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getCommentatorToken, getActiveMatch, ActiveMatch } from "@/lib/api";

const POLL_INTERVAL = 5000;

export default function CommentatePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const streamId = params.streamId as string;
  const pin = searchParams.get("pin") || "";

  const [status, setStatus] = useState<"loading" | "error" | "preview" | "live">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [match, setMatch] = useState<ActiveMatch | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const callRef = useRef<any>(null);

  // Validate PIN and get token
  useEffect(() => {
    async function init() {
      if (!pin) {
        setStatus("error");
        setErrorMsg("No PIN provided");
        return;
      }

      const tokenData = await getCommentatorToken(streamId, pin);
      if (!tokenData?.token) {
        setStatus("error");
        setErrorMsg("Invalid PIN or stream not found");
        return;
      }

      // Show preview first
      setStatus("preview");

      // Store token for when user goes live
      (window as any).__dailyTokenData = tokenData;
    }

    init();
  }, [streamId, pin]);

  // Poll active match for context
  useEffect(() => {
    if (status === "error" || status === "loading") return;

    let active = true;

    async function poll() {
      const data = await getActiveMatch(streamId);
      if (active) setMatch(data);
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [status, streamId]);

  // Show local camera preview
  useEffect(() => {
    if (status !== "preview" && status !== "live") return;

    let stream: MediaStream;

    async function startPreview() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch {
        setStatus("error");
        setErrorMsg("Camera access denied. Please allow camera and microphone access.");
      }
    }

    startPreview();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [status]);

  const goLive = async () => {
    const tokenData = (window as any).__dailyTokenData;
    if (!tokenData) return;

    try {
      const DailyIframe = (await import("@daily-co/daily-js")).default;
      const call = DailyIframe.createCallObject();
      callRef.current = call;

      await call.join({
        url: tokenData.roomUrl,
        token: tokenData.token,
        startVideoOff: false,
        startAudioOff: false,
      });

      setStatus("live");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg("Failed to connect: " + (err.message || "Unknown error"));
    }
  };

  const endBroadcast = async () => {
    callRef.current?.leave();
    callRef.current?.destroy();
    setStatus("preview");
  };

  const toggleMute = () => {
    if (callRef.current) {
      callRef.current.setLocalAudio(muted);
    }
    setMuted(!muted);
  };

  const toggleCamera = () => {
    if (callRef.current) {
      callRef.current.setLocalVideo(cameraOff);
    }
    setCameraOff(!cameraOff);
  };

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-white/50 text-lg">Connecting...</div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
        <div className="text-center">
          <p className="text-red-400 text-xl font-semibold mb-2">{errorMsg}</p>
          <p className="text-white/40 text-sm">Check the link and try again</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col">
      {/* Local video preview */}
      <div className="relative flex-1 bg-black">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />

        {/* Live indicator */}
        {status === "live" && (
          <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-md text-white text-sm font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        )}

        {/* Match info */}
        {match && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
            <div className="font-semibold">{match.team1Name} vs {match.team2Name}</div>
            <div className="text-white/50 text-xs">{match.courtName}</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 space-y-3">
        {status === "preview" && (
          <button
            onClick={goLive}
            className="w-full bg-red-600 hover:bg-red-500 active:bg-red-700 rounded-xl py-4 text-white font-bold text-lg transition-colors"
          >
            Go Live
          </button>
        )}

        {status === "live" && (
          <>
            <div className="flex gap-3">
              <button
                onClick={toggleMute}
                className={`flex-1 rounded-xl py-3 font-medium transition-colors ${
                  muted
                    ? "bg-red-600/20 text-red-400 border border-red-600/50"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                {muted ? "Unmute" : "Mute"}
              </button>
              <button
                onClick={toggleCamera}
                className={`flex-1 rounded-xl py-3 font-medium transition-colors ${
                  cameraOff
                    ? "bg-red-600/20 text-red-400 border border-red-600/50"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                {cameraOff ? "Camera Off" : "Camera On"}
              </button>
            </div>
            <button
              onClick={endBroadcast}
              className="w-full bg-gray-700 hover:bg-gray-600 rounded-xl py-3 text-white font-medium transition-colors"
            >
              End Broadcast
            </button>
          </>
        )}
      </div>
    </main>
  );
}
