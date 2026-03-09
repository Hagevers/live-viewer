"use client";

import { useEffect, useRef, useState } from "react";

interface CommentatorOverlayProps {
  roomUrl: string;
  token: string;
}

export default function CommentatorOverlay({ roomUrl, token }: CommentatorOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const callRef = useRef<any>(null);
  const [hasCommentator, setHasCommentator] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let destroyed = false;

    async function joinCall() {
      // Dynamic import to avoid SSR issues
      const DailyIframe = (await import("@daily-co/daily-js")).default;

      const call = DailyIframe.createCallObject({
        subscribeToTracksAutomatically: true,
      });
      callRef.current = call;

      call.on("track-started", (event: any) => {
        if (destroyed) return;
        if (event.participant?.local) return;

        if (event.track.kind === "video" && videoRef.current) {
          const stream = new MediaStream([event.track]);
          videoRef.current.srcObject = stream;
          setHasCommentator(true);
        }

        if (event.track.kind === "audio") {
          const audio = new Audio();
          audio.srcObject = new MediaStream([event.track]);
          audio.play().catch(() => {});
        }
      });

      call.on("participant-left", (event: any) => {
        if (destroyed) return;
        if (!event.participant?.local) {
          setHasCommentator(false);
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
        }
      });

      await call.join({
        url: roomUrl,
        token,
        startVideoOff: true,
        startAudioOff: true,
      });
    }

    joinCall();

    return () => {
      destroyed = true;
      callRef.current?.leave();
      callRef.current?.destroy();
    };
  }, [roomUrl, token]);

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };

    const handleUp = () => setDragging(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging]);

  if (!hasCommentator) return null;

  return (
    <div
      className="absolute z-30 cursor-grab active:cursor-grabbing rounded-lg overflow-hidden shadow-2xl border-2 border-white/20"
      style={{
        left: position.x,
        top: position.y,
        width: 200,
        height: 150,
      }}
      onMouseDown={handleMouseDown}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
