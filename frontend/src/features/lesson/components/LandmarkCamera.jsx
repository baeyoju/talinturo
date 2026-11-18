import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

const BODY_LINKS = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [0, 11], [0, 12]];
const HAND_LINKS = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
const FACE_OUTLINE = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];
const FACE_EYES = [[33, 160, 158, 133, 153, 144, 33], [362, 385, 387, 263, 373, 380, 362]];
const FACE_MOUTH = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
const HOLISTIC_MODEL = "https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/1/holistic_landmarker.task";
const HAND_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

function paintLandmarks(canvas, result, handResult) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const face = result.faceLandmarks?.[0] || [];
  const pose = result.poseLandmarks?.[0] || [];
  const hands = handResult.landmarks || [];
  const faceDetected = face.length > 0;
  const point = (landmark) => ({ x: (1 - landmark.x) * canvas.width, y: landmark.y * canvas.height });
  const drawLinks = (landmarks, links, color, width = 3) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    links.forEach(([start, end]) => {
      if (!landmarks[start] || !landmarks[end]) return;
      const a = point(landmarks[start]);
      const b = point(landmarks[end]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
  };
  const drawDots = (landmarks, color, radius = 4) => {
    ctx.fillStyle = color;
    landmarks.forEach((landmark) => {
      const p = point(landmark);
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  hands.forEach((hand) => {
    drawLinks(hand, HAND_LINKS, "#40e0ff", 2.5);
    drawDots(hand, "#ff7043", 3.5);
    if (hand[0]) {
      const wrist = point(hand[0]);
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(0, 0, 0, .7)";
      ctx.fillStyle = "white";
      const side = handResult.handedness?.[hands.indexOf(hand)]?.[0]?.categoryName || "Hand";
      ctx.strokeText(side, wrist.x + 7, wrist.y + 16);
      ctx.fillText(side, wrist.x + 7, wrist.y + 16);
    }
  });

  if (!faceDetected) return;
  drawLinks(pose, BODY_LINKS, "#69f0ae", 4);
  drawDots([pose[0], pose[2], pose[5], pose[7], pose[8], pose[11], pose[12], pose[13], pose[14], pose[15], pose[16]].filter(Boolean), "#fff176", 5);

  const drawFacePath = (indices, color, width) => {
    const valid = indices.map((index) => face[index]).filter(Boolean);
    if (valid.length < 2) return;
    ctx.beginPath();
    valid.forEach((landmark, index) => {
      const p = point(landmark);
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.stroke();
  };
  drawFacePath(FACE_OUTLINE, "#c084fc", 2.5);
  FACE_EYES.forEach((eye) => drawFacePath(eye, "#f9a8d4", 2));
  drawFacePath(FACE_MOUTH, "#f9a8d4", 2);

  const label = (text, index, dx = 10, dy = -10) => {
    if (!pose[index]) return;
    const p = point(pose[index]);
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0, 0, 0, .65)";
    ctx.fillStyle = "white";
    ctx.strokeText(text, p.x + dx, p.y + dy);
    ctx.fillText(text, p.x + dx, p.y + dy);
  };
  label("Head", 0);
  label("Shoulders", 11);
  label("Arms", 13);
  if (face.length) {
    const nose = point(face[1] || face[0]);
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0, 0, 0, .7)";
    ctx.fillStyle = "white";
    ctx.strokeText("Face landmarks", nose.x + 8, nose.y - 8);
    ctx.fillText("Face landmarks", nose.x + 8, nose.y - 8);
  }
}

function smoothHands(previous, next) {
  const unusedPrevious = new Set(previous.map((_, index) => index));
  return (next || []).map((hand) => {
    const wrist = hand[0];
    let nearestIndex = -1;
    let nearestDistance = Infinity;
    unusedPrevious.forEach((index) => {
      const oldWrist = previous[index]?.[0];
      if (!oldWrist || !wrist) return;
      const distance = Math.hypot(wrist.x - oldWrist.x, wrist.y - oldWrist.y);
      if (distance < nearestDistance) { nearestIndex = index; nearestDistance = distance; }
    });
    if (nearestIndex < 0 || nearestDistance > 0.2) return hand;
    unusedPrevious.delete(nearestIndex);
    return hand.map((landmark, landmarkIndex) => {
      const old = previous[nearestIndex]?.[landmarkIndex];
      return old ? { ...landmark, x: landmark.x * 0.8 + old.x * 0.2, y: landmark.y * 0.8 + old.y * 0.2, z: landmark.z * 0.8 + old.z * 0.2 } : landmark;
    });
  });
}

export function LandmarkCamera({ onLandmarks, onCameraState }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const frameRef = useRef(null);
  const runningRef = useRef(false);
  const onLandmarksRef = useRef(onLandmarks);
  const onCameraStateRef = useRef(onCameraState);
  onLandmarksRef.current = onLandmarks;
  onCameraStateRef.current = onCameraState;
  const [cameraOn, setCameraOn] = useState(false);
  const [status, setStatus] = useState("Camera is off");
  const [error, setError] = useState("");
  const statusRef = useRef("Camera is off");
  const updateStatus = (value) => {
    if (statusRef.current === value) return;
    statusRef.current = value;
    setStatus(value);
  };

  const stopCamera = () => {
    runningRef.current = false;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    handLandmarkerRef.current?.close();
    handLandmarkerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setCameraOn(false);
    onCameraStateRef.current?.(false);
    updateStatus("Camera is off");
  };

  useEffect(() => () => {
    runningRef.current = false;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    landmarkerRef.current?.close();
    handLandmarkerRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const startCamera = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access requires localhost or a secure HTTPS connection in a supported browser.");
      return;
    }
    updateStatus("Starting camera...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      updateStatus("Loading landmark model...");
      const { FilesetResolver, HolisticLandmarker, HandLandmarker } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm");
      let landmarker;
      let handLandmarker;
      try {
        landmarker = await HolisticLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HOLISTIC_MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          minFaceDetectionConfidence: 0.5,
          minPoseDetectionConfidence: 0.5,
          minHandLandmarksConfidence: 0.5,
        });
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HAND_MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.65,
          minHandPresenceConfidence: 0.65,
          minTrackingConfidence: 0.65,
        });
      } catch {
        landmarker?.close();
        landmarker = await HolisticLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HOLISTIC_MODEL, delegate: "CPU" },
          runningMode: "VIDEO",
          minFaceDetectionConfidence: 0.5,
          minPoseDetectionConfidence: 0.5,
          minHandLandmarksConfidence: 0.5,
        });
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HAND_MODEL, delegate: "CPU" },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.65,
          minHandPresenceConfidence: 0.65,
          minTrackingConfidence: 0.65,
        });
      }
      landmarkerRef.current = landmarker;
      handLandmarkerRef.current = handLandmarker;
      runningRef.current = true;
      setCameraOn(true);
      onCameraStateRef.current?.(true);
      updateStatus("Looking for your landmarks...");
      let lastVideoTime = -1;
      let lastDetectionAt = 0;
      let previousHands = [];
      const renderFrame = (now) => {
        if (!runningRef.current) return;
        const canvas = canvasRef.current;
        if (video.readyState >= 2 && video.currentTime !== lastVideoTime && now - lastDetectionAt >= 60 && canvas) {
          lastVideoTime = video.currentTime;
          lastDetectionAt = now;
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          const result = landmarker.detectForVideo(video, now);
          const handResult = handLandmarker.detectForVideo(video, now);
          handResult.landmarks = smoothHands(previousHands, handResult.landmarks);
          previousHands = handResult.landmarks;
          onLandmarksRef.current?.({
            captured_at: new Date().toISOString(),
            hands: handResult.landmarks.map((landmarks, index) => ({
              handedness: handResult.handedness?.[index]?.[0]?.categoryName || `Hand ${index + 1}`,
              landmarks,
            })),
            pose: result.poseLandmarks?.[0] || [],
            face: result.faceLandmarks?.[0] || [],
          });
          paintLandmarks(canvas, result, handResult);
          if (!result.faceLandmarks?.[0]?.length && handResult.landmarks.length) updateStatus(`Face not detected; ${handResult.landmarks.length} hand${handResult.landmarks.length === 1 ? "" : "s"} tracked`);
          else if (!result.faceLandmarks?.[0]?.length) updateStatus("Face not detected; hand landmarks appear when hands enter the frame");
          else if (result.poseLandmarks?.length && handResult.landmarks.length) updateStatus(`Face, body, and ${handResult.landmarks.length} hand${handResult.landmarks.length === 1 ? "" : "s"} detected`);
          else if (result.poseLandmarks?.length) updateStatus("Face and body detected; bring your hands closer and keep fingers apart");
          else updateStatus("Face detected; move into view to show body landmarks");
        }
        frameRef.current = requestAnimationFrame(renderFrame);
      };
      frameRef.current = requestAnimationFrame(renderFrame);
    } catch (cameraError) {
      stopCamera();
      setError(cameraError.name === "NotAllowedError"
        ? "Camera permission was denied. Allow camera access in your browser and try again."
        : `Could not start the camera or landmark model: ${cameraError.message}`);
    }
  };

  return <section className="landmark-camera" aria-label="Live camera and body landmarks">
    <div className="landmark-camera-heading"><div><h3>Live landmark view</h3><p>Position your upper body and hands in the frame.</p></div><span className={cameraOn ? "landmark-camera-live" : ""}><i />{cameraOn ? "Live" : "Off"}</span></div>
    <div className={`landmark-camera-frame ${cameraOn ? "is-live" : ""}`}>
      <video ref={videoRef} autoPlay muted playsInline aria-label="Your live camera preview" />
      <canvas ref={canvasRef} aria-hidden="true" />
      {!cameraOn && <div className="landmark-camera-placeholder"><strong>Camera preview with live landmarks</strong><p>Your camera stays on this device and is not recorded.</p><Button onClick={startCamera} disabled={status.includes("...")}>{status.includes("...") ? status : "Turn on camera"}</Button></div>}
    </div>
    <div className="landmark-camera-footer"><span>{status}</span>{cameraOn && <Button variant="outline" onClick={stopCamera}>Turn camera off</Button>}</div>
    {error && <p className="landmark-camera-error" role="alert">{error}</p>}
  </section>;
}
