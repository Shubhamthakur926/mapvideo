import { X } from "lucide-react";

interface RecordingIndicatorProps {
  recording: boolean;
  recordProgress: number;
  onClose: () => void;
}

export function RecordingIndicator({ recording, recordProgress, onClose }: RecordingIndicatorProps) {
  return (
    <>
      {!recording && (
        <button
          className="close-video-button"
          aria-label="Close video preview"
          title="Close video (Esc)"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      )}

      {recording && (
        <div
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "rgba(220, 38, 38, 0.92)",
            backdropFilter: "blur(12px)",
            border: "1.5px solid #ef4444",
            borderRadius: "20px",
            padding: "6px 14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: 800,
            zIndex: 110,
            boxShadow: "0 0 20px rgba(239, 68, 68, 0.6)",
            letterSpacing: "0.05em",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#ffffff",
              boxShadow: "0 0 8px #ffffff",
              animation: "pulse 1s infinite",
            }}
          />
          RECORDING HD VIDEO ({recordProgress}%)
        </div>
      )}
    </>
  );
}

