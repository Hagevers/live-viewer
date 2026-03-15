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

## Commentator page (`/commentate/[streamId]`)

PIN-protected page for a remote commentator to push their camera/mic into the live stream via WebRTC WHIP.

### Flow
1. Commentator opens `/commentate/{streamId}?pin=XXXX`
2. PIN is validated against monitoring-server
3. Browser acquires camera + mic via `getUserMedia`
4. On "Go Live": browser creates an `RTCPeerConnection`, gathers ICE candidates, sends SDP offer through monitoring-server → stream-mixer → MediaMTX WHIP endpoint
5. MediaMTX publishes the track at `rtsp://localhost:8554/commentator/{streamId}`
6. FFmpeg compositor picks it up as input and overlays a 320×180 PiP (bottom-right)

### TURN configuration

The commentator is typically on a different network (internet) from the server (local machine behind NAT). TURN relay is required for ICE connectivity.

**Provider:** Metered.ca managed TURN
**Relay host:** `global.relay.metered.ca` (NOT a custom subdomain)
**Transport:** TCP and TLS only — UDP TURN causes burst packet loss that corrupts H264 video

```typescript
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: "stun:stun.relay.metered.ca:80" },
    { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: "...", credential: "..." },
    { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: "...", credential: "..." },
  ],
  iceTransportPolicy: "relay",  // force TURN relay, never direct/STUN
});
```

`iceTransportPolicy: "relay"` is critical — it forces both sides to use the relay path even when a direct path might appear available, ensuring consistent latency and eliminating the UDP packet loss path.

### Known limitation: PiP stall on TURN relay

When the commentator connects via TURN (internet path), TCP delivers H264 video in bursts rather than a smooth stream. This causes the FFmpeg filtergraph `scale` filter to stall waiting for commentator frames, which backs up the camera RTSP reader and causes HLS segment duration spikes (200ms → 6s).

**Mitigation in FFmpeg** (see stream-mixer):
- `-fflags +discardcorrupt -err_detect ignore_err`: drop corrupt frames silently
- `-timeout 5000000`: 5s RTSP socket timeout to break stall
- `eof_action=pass:repeatlast=0` on the PiP overlay: continue main stream without PiP when commentator stalls

**Permanent fix:** Run the commentator on the same local network (same WiFi or Tailscale VPN). Direct ICE path eliminates TURN relay, eliminates packet bursts, eliminates the stall.

## Development

```bash
npm install
npm run dev     # localhost:3000
npm run build
npm start
```

## Deployment

Deployed to Vercel. The `hlsUrl` uses an ngrok HTTPS tunnel pointing to stream-mixer's `/hls` proxy path, which proxies to MediaMTX port 8888.
