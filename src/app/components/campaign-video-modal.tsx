"use client";

import { useEffect, useState } from "react";

export default function CampaignVideoModal({
  title,
  videoSrc,
}: {
  title: string;
  videoSrc: string;
}) {
  const [open, setOpen] = useState(false);
  const [mountedSrc, setMountedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMountedSrc(videoSrc);
      document.body.style.overflow = "hidden";
    } else {
      setMountedSrc(null);
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open, videoSrc]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid rgba(34,211,238,.35)",
          background: "rgba(34,211,238,.14)",
          color: "#9cecf7",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Watch Video
      </button>

      {open ? (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.72)",
            zIndex: 9999,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "5vh",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: 900,
              width: "92%",
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,.12)",
              background: "#0b1220",
              boxShadow: "0 30px 80px rgba(0,0,0,.55)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                borderBottom: "1px solid rgba(255,255,255,.08)",
              }}
            >
              <div style={{ fontWeight: 800 }}>{title}</div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#fff",
                  opacity: 0.8,
                  fontWeight: 800,
                  padding: "4px 8px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
              {mountedSrc ? (
                <iframe
                  key={mountedSrc}
                  src={mountedSrc}
                  title={`${title} video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    border: 0,
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
