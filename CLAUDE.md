# live-viewer

Next.js app for viewers to watch live padel streams with HLS playback. Deployed on Vercel.

## Pages

| Route | Description |
|---|---|
| `/watch/[streamId]` | HLS live stream player |
| `/score/[matchId]` | Score entry page (PIN-protected, for court-side score updates) |
| `/commentate/[streamId]` | Commentator overlay page |

## HLS Player (`src/components/HlsPlayer.tsx`)

Uses **HLS.js** for low-latency playback. Configured for LL-HLS:

```typescript
const hls = new Hls({
  lowLatencyMode: true,
  liveSyncDuration: 2,        // target 2s behind live edge
  liveMaxLatencyDuration: 6,  // seek to live if >6s behind
  backBufferLength: 0,        // don't hold back buffer
});
```

The HLS stream URL comes from the monitoring-server (`hlsUrl` field on the stream record). It points to the ngrok tunnel that proxies MediaMTX HLS output.

## Stream pipeline (for context)

```
AXIS Camera → RTMP → MediaMTX → RTSP → stream-mixer (FFmpeg)
                                              ↓
                              RTMP → MediaMTX (mixed/{streamId})
                                              ↓
                                    HLS → ngrok tunnel → live-viewer
```

The scoreboard overlay is **baked into the video** by FFmpeg (server-side compositing). This ensures the overlay is visible everywhere the video is watched — browser, AirPlay, TV, YouTube, screen recording — without any client-side rendering.

## Expected latency

~3-6s behind live. Breakdown:
- FFmpeg encode → RTMP: ~0ms (local)
- MediaMTX LL-HLS segmentation: 0-200ms (200ms parts)
- HLS.js `liveSyncDuration: 2`: 2s buffer
- Score overlay update: ~200ms after admin clicks (TCP image2pipe delivery)

## Development

```bash
npm install
npm run dev     # localhost:3000
npm run build
npm start
```

## Deployment

Deployed to Vercel. The `hlsUrl` uses an ngrok HTTPS tunnel pointing to stream-mixer's `/hls` proxy path, which proxies to MediaMTX port 8888.
