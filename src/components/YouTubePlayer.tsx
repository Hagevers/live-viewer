"use client";

interface YouTubePlayerProps {
  youtubeUrl: string;
}

function extractVideoId(url: string): string | null {
  // Handle youtube.com/watch?v=ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];

  // Handle youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1];

  // Handle youtube.com/live/ID
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
      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      style={{ border: "none" }}
    />
  );
}
