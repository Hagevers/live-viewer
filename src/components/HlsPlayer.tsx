"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface HlsPlayerProps {
  hlsUrl: string;
}

export default function HlsPlayer({ hlsUrl }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Safari supports HLS natively via <video src>
    if (!Hls.isSupported()) {
      video.src = hlsUrl;
      video.play().catch(() => {});
      return;
    }

    const hls = new Hls({
      lowLatencyMode: true,
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 6,
    });

    hls.loadSource(hlsUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            hls.destroy();
            break;
        }
      }
    });

    return () => {
      hls.destroy();
    };
  }, [hlsUrl]);

  return (
    <video
      ref={videoRef}
      className="w-full h-full object-contain bg-black"
      autoPlay
      muted
      playsInline
      controls={false}
    />
  );
}
