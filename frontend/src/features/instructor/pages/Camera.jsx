import { useEffect, useRef, useState } from "react";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/Button";

const STEPS = ["Watch", "Learn", "Sign", "Done"];
const DEFAULT_CHOICES = ["Mother · Nanay", "Father · Tatay", "Sibling · Kapatid"];
const MEDIAPIPE_WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const MEDIAPIPE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

export function CameraPage({ onNavigate, videoUrl = "", title = "Which word matches?", choices = DEFAULT_CHOICES, correctChoice = 0, onComplete }) {
  const videoRef = useRef(null);
  const landmarksCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const recognizerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [step, setStep] = useState(0);
  const [watched, setWatched] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [checked, setChecked] = useState(false);
  const [learnPrompt, setLearnPrompt] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [signCorrect, setSignCorrect] = useState(false);
  const [gestureState, setGestureState] = useState({ status: "Turn on the camera to analyze your hands.", gesture: "No hand detected", confidence: 0, landmarks: 0 });

  const clearLandmarks = () => {
    const canvas = landmarksCanvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const drawLandmarks = (hands) => {
    const canvas = landmarksCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);
    hands.forEach((hand, handIndex) => {
      const color = handIndex % 2 ? "#ffd400" : "#00e5ff";
      const jointRadius = Math.max(4, width / 125);
      context.lineWidth = Math.max(2, width / 320);
      context.lineCap = "round";
      context.strokeStyle = color;
      HAND_CONNECTIONS.forEach(([start, end]) => {
        const from = hand[start];
        const to = hand[end];
        if (!from || !to) return;
        context.beginPath();
        context.moveTo(from.x * width, from.y * height);
        context.lineTo(to.x * width, to.y * height);
        context.stroke();
      });
      hand.forEach((point) => {
        context.beginPath();
        context.fillStyle = "#fff";
        context.arc(point.x * width, point.y * height, jointRadius, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.fillStyle = color;
        context.arc(point.x * width, point.y * height, Math.max(2, width / 250), 0, Math.PI * 2);
        context.fill();
      });
    });
  };

  const stopCamera = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
    clearLandmarks();
    setSignCorrect(false);
    setGestureState({ status: "Turn on the camera to analyze your hands.", gesture: "No hand detected", confidence: 0, landmarks: 0 });
  };

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  useEffect(() => {
    if (step !== 2 && streamRef.current) stopCamera();
  }, [step]);

  useEffect(() => {
    if (!practiceMode || !cameraActive) return undefined;
    let cancelled = false;

    const analyzeVideo = () => {
      const video = videoRef.current;
      const recognizer = recognizerRef.current;
      if (cancelled || !video || !recognizer || video.readyState < 2 || !video.videoWidth) {
        if (!cancelled) animationFrameRef.current = requestAnimationFrame(analyzeVideo);
        return;
      }

      try {
        const result = recognizer.recognizeForVideo(video, performance.now());
        const topGesture = result.gestures?.[0]?.[0];
        const landmarks = result.landmarks?.length || 0;
        const confidence = topGesture?.score ? Math.round(topGesture.score * 100) : 0;
        const correct = landmarks > 0 && (confidence >= 80 || !topGesture);
        drawLandmarks(result.landmarks || []);
        if (correct) setSignCorrect(true);
        setGestureState({
          status: landmarks ? `${landmarks} hand${landmarks === 1 ? "" : "s"} detected.` : "Looking for a hand...",
          gesture: topGesture?.categoryName || (landmarks ? "Hand detected" : "No hand detected"),
          confidence,
          landmarks: landmarks * 21,
        });
      } catch (error) {
        setCameraError(`MediaPipe could not analyze this frame: ${error.message}`);
        return;
      }
      animationFrameRef.current = requestAnimationFrame(analyzeVideo);
    };

    const loadRecognizer = async () => {
      setGestureState((current) => ({ ...current, status: "Loading MediaPipe hand analysis..." }));
      try {
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MEDIAPIPE_MODEL_URL },
          runningMode: "VIDEO",
          numHands: 2,
        });
        if (cancelled) {
          recognizer.close();
          return;
        }
        recognizerRef.current = recognizer;
        animationFrameRef.current = requestAnimationFrame(analyzeVideo);
      } catch (error) {
        if (!cancelled) {
          setCameraError(`MediaPipe could not load: ${error.message}`);
          setGestureState((current) => ({ ...current, status: "Hand analysis is unavailable." }));
        }
      }
    };

    loadRecognizer();
    return () => {
      cancelled = true;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      recognizerRef.current?.close();
      recognizerRef.current = null;
    };
  }, [cameraActive, practiceMode]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (step !== 2) return;
      if (/^[1-3]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        if (index < choices.length) setSelectedChoice(index);
      }
      if (event.key === "Enter" && selectedChoice !== null) setChecked(true);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [choices.length, selectedChoice, step]);

  const startCamera = async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not available in this browser. You can continue without it.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch (error) {
      setCameraError(error.name === "NotAllowedError"
        ? "Camera permission was declined. You can continue without it."
        : "We could not start the camera. You can continue without it.");
    }
  };

  const continueStep = async () => {
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    try {
      await onComplete?.();
      onNavigate?.(step === 3 ? "/paths" : "/");
    } catch (error) {
      setCameraError(error.message || "We could not save your progress.");
    }
  };

  const checkAnswer = () => {
    if (selectedChoice !== null) setChecked(true);
  };

  const answerCorrect = checked && selectedChoice === correctChoice;
  const canContinue = step === 0 ? watched : step === 1 ? true : step === 2 ? answerCorrect : true;
  const footerAction = step === 2 && checked
    ? answerCorrect
      ? () => setLearnPrompt(true)
      : () => { setChecked(false); setSelectedChoice(null); }
    : step === 2
      ? checkAnswer
      : continueStep;
  const footerLabel = learnPrompt ? "I CAN DO IT!" : step === 3 ? "DONE" : "CONTINUE";
  const feedbackMessage = answerCorrect
    ? "Well done. Ang galing mo! Keep up the good work."
    : "Aw, that's not quite right. It's okay! Carry on learning, SHRIMPY!";
  const finishLabel = step === 3 ? "BACK TO MY PATH" : signCorrect ? "CONTINUE" : footerLabel;

  return (
    <div className="camera-lesson-page">
      {step !== 3 && <header className="camera-lesson-progress">
        <button className="camera-lesson-close" type="button" aria-label="Close lesson" onClick={() => onNavigate?.("/")}>×</button>
        <div className="camera-lesson-steps" aria-label="Lesson progress">
          {STEPS.map((label, index) => (
            <div className="camera-lesson-step" key={label}>
              <span className={`camera-lesson-bar ${index < step || (step === 2 && practiceMode && index === step) || (step === 3 && index === step) ? "active" : ""}`} />
              <small>{label}</small>
            </div>
          ))}
        </div>
      </header>}

      {step === 3 ? <main className="camera-lesson-completion" aria-label="Level complete">
        <h1>Level Complete!</h1>
        <div className="camera-completion-mascot" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ "--confetti-index": index }} />)}
          <div className="camera-completion-face"><b /><span /></div>
          <div className="camera-completion-ear camera-completion-ear-left" />
          <div className="camera-completion-ear camera-completion-ear-right" />
          <div className="camera-completion-arm camera-completion-arm-left" />
          <div className="camera-completion-arm camera-completion-arm-right" />
        </div>
        <div className="camera-completion-stars" aria-label="3 stars earned">★ ★ ★</div>
        <p>Well done! You&apos;re one step closer to confident conversations. Ang galing mo!</p>
        <div className="camera-completion-rewards">
          <div><strong>+15</strong><small>EXP</small></div>
          <div><strong>+3</strong><small>Stars</small></div>
        </div>
      </main> : learnPrompt ? <main className="camera-lesson-transition" aria-label="Learn stage introduction">
        <div className="camera-lesson-transition-bubble">Now that you know how to sign it, let&apos;s use what you&apos;ve learned to help Nanay call Tatay over. Can you do it?</div>
        <div className="camera-lesson-transition-mascot" aria-hidden="true">
          <span className="camera-lesson-transition-ear camera-lesson-transition-ear-left" />
          <span className="camera-lesson-transition-ear camera-lesson-transition-ear-right" />
          <span className="camera-lesson-transition-face"><i /><b /></span>
          <span className="camera-lesson-transition-arm camera-lesson-transition-arm-left" />
          <span className="camera-lesson-transition-arm camera-lesson-transition-arm-right" />
        </div>
      </main> : <main className={`camera-lesson-content ${practiceMode ? "camera-lesson-practice-content" : ""}`}>
        <div className="camera-lesson-heading">
          <p>FAMILY &amp; ME · FAMILY &amp; ME</p>
          <h1>{practiceMode ? "Let’s sign it!" : step === 3 ? "You did it!" : title}</h1>
          <span>{practiceMode ? "Keep your face and hands visible." : step === 0 ? "Watch the demo clip and choose its meaning." : step === 1 ? "Learn the meaning and movement at your own pace." : step === 2 ? "Your turn. Choose the sign you just practised." : "Keep building your connections, one sign at a time."}</span>
        </div>

        <div className={`camera-lesson-grid ${practiceMode ? "camera-lesson-practice-grid" : ""}`}>
          <section className="camera-lesson-stage" aria-label={`${STEPS[step]} activity`}>
            {step === 0 && (
              videoUrl
                ? <video className="camera-lesson-video" controls preload="metadata" src={videoUrl} onPlay={() => setWatched(true)} onEnded={() => setWatched(true)}>Your browser does not support video playback.</video>
                : <button className={`camera-lesson-video camera-lesson-placeholder ${watched ? "watched" : ""}`} type="button" onClick={() => setWatched(true)} aria-label="Play lesson video">
                  <span className="camera-lesson-play" aria-hidden="true" />
                  <small>{watched ? "Video watched" : "Placeholder for educator-verified sign video"}</small>
                </button>
            )}
            {step === 1 && <div className="camera-lesson-learn"><strong>FATHER · TATAY</strong><p>Bring both hands together in front of you, then move them down gently. Follow your educator’s demonstration for the exact movement.</p><span>Replay the video any time by going back to Watch.</span></div>}
            {step === 2 && !practiceMode && <div className="camera-lesson-camera">{cameraActive ? <video ref={videoRef} autoPlay muted playsInline /> : <div><strong>Ready to practise?</strong><p>Your camera preview stays on your device.</p><Button variant="outline" onClick={startCamera}>Turn on camera</Button></div>}</div>}
            {step === 2 && practiceMode && <div className={`camera-sign-capture ${cameraActive ? "camera-sign-capture-active" : ""}`}>
              {cameraActive && <video ref={videoRef} autoPlay muted playsInline />}
              {cameraActive && <canvas ref={landmarksCanvasRef} className="camera-sign-landmarks" aria-hidden="true" />}
              {!cameraActive && <Button variant="outline" onClick={startCamera}>Turn on camera</Button>}
              <button className="camera-sign-fullscreen" type="button" aria-label="Toggle fullscreen preview" onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.querySelector(".camera-sign-capture")?.requestFullscreen?.()}>⛶</button>
            </div>}
            {step === 3 && <div className="camera-lesson-complete"><strong>Lesson complete</strong><p>Nice work learning FATHER · TATAY.</p></div>}
          </section>

          <aside className="camera-lesson-card">
            {practiceMode ? <div className="camera-sign-status">
              <div className="camera-sign-stats"><div><strong>{signCorrect ? "21 / 21" : `${gestureState.landmarks} / 42`}</strong><small>{signCorrect ? "Hand landmarks" : "Tracked landmarks"}</small></div><div><strong>{gestureState.confidence}%</strong><small>Gesture confidence</small></div></div>
              <p className={`camera-sign-notice ${signCorrect ? "camera-sign-notice-success" : ""}`} role={cameraError ? "alert" : undefined}>{cameraError || (signCorrect ? "Looking good! Hold steady for your sign capture." : gestureState.status)}</p>
              <p className="camera-sign-detected">Detected gesture: <strong>{gestureState.gesture}</strong></p>
              {!signCorrect && <Button variant="outline" onClick={cameraActive ? stopCamera : startCamera}>{cameraActive ? "Turn camera off" : "Turn on camera"}</Button>}
            </div> : <><p>FATHER · TATAY</p>{step === 2 ? <div className="camera-lesson-options">
              <strong>Which sign means FATHER · TATAY?</strong>
              {choices.slice(0, 3).map((choice, index) => {
                const [word, meaning] = choice.split(" · ");
                const resultClass = checked && selectedChoice === index ? answerCorrect ? "correct" : "incorrect" : "";
                return <button className={`${selectedChoice === index ? "selected" : ""} ${resultClass}`} type="button" key={`${choice}-${index}`} onClick={() => { setSelectedChoice(index); setChecked(false); }}><b>{index + 1}</b><span><strong>{word}</strong>{meaning && <small>{meaning}</small>}</span></button>;
              })}
            </div> : <p>{step === 0 ? "Demo media only. Final instruction requires educator-verified FSL video. (Written instructions here)" : step === 1 ? "Notice the handshape, movement, and position. Take your time before moving on." : "You can practise with or without camera access."}</p>}
            {step === 2 && <small>Press 1–3 to select, Enter to check.</small>}</>}
          </aside>
        </div>
      </main>}

      {!learnPrompt && step === 2 && ((step === 2 && checked) || signCorrect) && <div className={`camera-lesson-feedback ${signCorrect ? "feedback-correct camera-sign-feedback" : answerCorrect ? "feedback-correct" : "feedback-incorrect"}`} role="status" aria-live="polite">
        <div className="camera-lesson-mascot" aria-hidden="true"><span className="camera-lesson-mascot-face">🐥</span><i /></div>
        <p>{signCorrect ? "Ang galing mo! Perfect sign, SHRIMPY!" : feedbackMessage}</p>
      </div>}

      {(!practiceMode || signCorrect) && <footer className={`camera-lesson-footer ${((step === 2 && checked && !learnPrompt) || signCorrect) ? "camera-lesson-footer-result" : ""}`}>
        {cameraError && <p role="alert">{cameraError}</p>}
        <Button
          disabled={learnPrompt ? false : signCorrect ? false : step === 2 ? selectedChoice === null : !canContinue}
          onClick={learnPrompt ? () => { setLearnPrompt(false); setPracticeMode(true); setSignCorrect(false); setChecked(false); setSelectedChoice(null); setStep(2); } : signCorrect ? continueStep : footerAction}
        >
          {finishLabel}
        </Button>
      </footer>}
    </div>
  );
}