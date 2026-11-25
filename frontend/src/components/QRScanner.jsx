import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ScanLine } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function QRScanner({ onScan, active = true }) {
  const videoRef = useRef(null);
  const callbackRef = useRef(onScan);
  const controlsRef = useRef(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { callbackRef.current = onScan; }, [onScan]);

  useEffect(() => {
    if (!active || !videoRef.current) return undefined;
    let cancelled = false;
    setError("");
    const reader = new BrowserMultiFormatReader();
    reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
      if (result && !cancelled) callbackRef.current?.(result.getText());
    }).then((controls) => {
      if (cancelled) controls?.stop();
      else {
        controlsRef.current = controls;
        setScanning(true);
      }
    }).catch(() => {
      if (!cancelled) setError("Camera access is unavailable. Allow camera permission or enter the ticket code below.");
    });
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      setScanning(false);
    };
  }, [active, attempt]);

  return (
    <div className="scanner">
      <div className="scanner-viewport">
        <video ref={videoRef} muted playsInline />
        {scanning && <><span className="scan-corner corner-tl" /><span className="scan-corner corner-tr" /><span className="scan-corner corner-bl" /><span className="scan-corner corner-br" /><div className="scan-line" /></>}
        {!scanning && !error && <div className="scanner-placeholder"><Camera size={32} /><span>Starting camera…</span></div>}
        {error && <div className="scanner-placeholder scanner-error"><CameraOff size={32} /><span>{error}</span><button className="button button-outline button-small" onClick={() => setAttempt((value) => value + 1)}>Try camera again</button></div>}
      </div>
      <p className="scanner-hint"><ScanLine size={16} /> Position the attendee’s QR code inside the frame</p>
    </div>
  );
}
