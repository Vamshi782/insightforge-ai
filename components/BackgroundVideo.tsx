"use client";

import { useEffect, useRef } from "react";

const HLS_SRC =
  "https://stream.mux.com/hUT6X11m1Vkw1QMxPOLgI761x2cfpi9bHFbi5cNg4014.m3u8";

export default function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let hlsInstance: any = null;
    let destroyed = false;

    async function init() {
      const HlsLib = (await import("hls.js")).default;
      if (destroyed || !videoRef.current) return;

      if (HlsLib.isSupported()) {
        hlsInstance = new HlsLib({ startLevel: 0, autoStartLoad: true });
        hlsInstance.loadSource(HLS_SRC);
        hlsInstance.attachMedia(videoRef.current);
        hlsInstance.on(HlsLib.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().catch(() => {});
        });
      } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari — native HLS
        videoRef.current.src = HLS_SRC;
        videoRef.current.play().catch(() => {});
      }
    }

    init();

    return () => {
      destroyed = true;
      try { hlsInstance?.destroy(); } catch { /* ignore */ }
      hlsInstance = null;
      // Reset src to prevent AbortError on fast unmount
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      aria-hidden
      className="fixed inset-0 w-full h-full object-cover pointer-events-none"
      style={{ zIndex: -10 }}
    />
  );
}
