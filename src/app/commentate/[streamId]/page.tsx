"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { validateCommentatorPin, commentatorWhip, getActiveMatch, ActiveMatch } from "@/lib/api";

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
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Validate PIN
  useEffect(() => {
    async function init() {
      if (!pin) {
        setStatus("error");
        setErrorMsg("No PIN provided");
        return;
      }

      const valid = await validateCommentatorPin(streamId, pin);
      if (!valid) {
        setStatus("error");
        setErrorMsg("Invalid PIN or stream not found");
        return;
      }

      setStatus("preview");
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

    async function startPreview() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
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
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, [status === "preview" || status === "live" ? "active" : "inactive"]);

  const goLive = async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      // Add all local tracks to the peer connection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete (null candidate = done)
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") {
          resolve();
          return;
        }
        pc.addEventListener("icecandidate", (e) => {
          if (e.candidate === null) resolve(); // null = gathering finished
        });
        // Hard fallback: 10s in case icecandidate null never fires
        setTimeout(resolve, 10000);
      });

      const sdp = pc.localDescription?.sdp;
      if (!sdp) throw new Error("Failed to gather SDP");

      // Debug: log ICE candidates to diagnose mDNS/firewall issues
      const candidates = sdp.match(/^a=candidate:.+$/mg) ?? [];
      console.log("[WHIP] ICE candidates in offer:", candidates.join("\n"));

      // Send offer through monitoring-server → stream-mixer → MediaMTX
      const answerSdp = await commentatorWhip(streamId, pin, sdp);
      if (!answerSdp) throw new Error("No SDP answer from server");

      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setStatus("live");
    } catch (err: any) {
      pcRef.current?.close();
      pcRef.current = null;
      setStatus("error");
      setErrorMsg("Failed to connect: " + (err.message || "Unknown error"));
    }
  };

  const endBroadcast = () => {
    pcRef.current?.close();
    pcRef.current = null;
    setStatus("preview");
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = muted));
    }
    setMuted(!muted);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach((t) => (t.enabled = cameraOff));
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
