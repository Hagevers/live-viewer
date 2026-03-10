"use client";

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

export default function YouTubePlayer({ youtubeUrl }: YouTubePlayerProps) {
  const videoId = extractVideoId(youtubeUrl);

  if (!videoId) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white/50">
        Invalid YouTube URL
      </div>
    );
  }

  return (
    <iframe
      className="w-full h-full"
      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1&fs=0`}
      allow="autoplay; picture-in-picture"
      allowFullScreen={false}
    />
  );
}
