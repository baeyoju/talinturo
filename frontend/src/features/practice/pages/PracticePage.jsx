import { useEffect, useRef, useState } from "react";
import { api } from "@/adapters/http/api";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function PracticePage({ onToast }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [activities, setActivities] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [checked, setChecked] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loadingActivities, setLoadingActivities] = useState(true);
  useEffect(() => {
    api("/practice")
      .then(({ activities: items }) => {
        setActivities(items);
        setSelectedId(items.length ? String(items[0].id) : "");
      })
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoadingActivities(false));
  }, []);
  const selectedActivity = activities.find((activity) => String(activity.id) === selectedId);
  const content = selectedActivity?.content || {};
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  const toggleCamera = async () => {
    if (cameraOn) return stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) return onToast("Camera access isn't available in this browser. You can still practice with the sign guide.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch (error) {
      onToast(error.name === "NotAllowedError" ? "Camera permission was declined. You can still practice with the sign guide." : `Could not start camera: ${error.message}`);
    }
  };
  const markPractice = async () => {
    if (!selectedActivity) return;
    try {
      await api("/progress/complete", {
        method: "POST",
        body: JSON.stringify({ activity_id: selectedActivity.id, response: { completed: true } }),
      });
      setChecked(true);
      onToast("Nice work! Your practice has been noted.");
    } catch (error) {
      onToast(`Your practice couldn't be saved: ${error.message}`);
    }
  };
  return <>
    <PageTitle eyebrow="PRACTICE MAKES CONNECTION" title="Sign practice" description="Take a breath, get comfortable, and practice a sign at your own pace." />
    {loadError && <p className="inline-error">{loadError}</p>}
    {loadingActivities ? <div className="empty-state">Loading practice activities…</div> : !loadError && !activities.length ? <div className="empty-state"><Icon name="hand" size={34} /><h2>No practice activities available</h2><p>Add a published <code>practice</code> activity to PostgreSQL <code>activities</code>, including its sign, meaning, steps, and any media URL in JSONB <code>content</code>.</p></div> : activities.length > 0 && <><div className="practice-layout"><section className="camera-panel"><div className="camera-top"><div><p className="eyebrow">YOUR PRACTICE SPACE</p><h2>Ready when you are</h2></div><span className={`camera-state ${cameraOn ? "camera-live" : ""}`}><i />{cameraOn ? "Camera on" : "Camera off"}</span></div><div className={`camera-view ${cameraOn ? "camera-active" : ""}`}>{cameraOn ? <video ref={videoRef} autoPlay muted playsInline /> : <><div className="camera-frame"><span /><span /><span /><span /></div><div className="camera-placeholder"><div className="camera-icon"><Icon name="camera" size={28} /></div><strong>Make yourself comfy</strong><p>Your camera preview will appear here.<br />Nothing is recorded or saved.</p><Button variant="outline" onClick={toggleCamera}>Turn on camera</Button></div></>}</div><div className="camera-controls"><Button variant={cameraOn ? "outline" : "primary"} onClick={toggleCamera}>{cameraOn ? "Turn camera off" : "Enable camera"} <span>⌕</span></Button><span><Icon name="shield" size={15} /> Your video stays on your device</span></div></section><aside className="sign-guide panel"><p className="eyebrow">{content.category || "PRACTICE ACTIVITY"}</p><label className="select-label">Choose an activity<select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setChecked(false); }} aria-label="Choose practice activity">{activities.map((activity) => <option value={activity.id} key={activity.id}>{activity.title}</option>)}</select></label><h2>{content.word || selectedActivity.title}</h2>{content.meaning && <p className="guide-meaning">{content.meaning}</p>}{content.media_url && <img className="practice-media" src={content.media_url} alt={content.media_alt || content.word || selectedActivity.title} />}<h3>{content.instructions_title || "Instructions"}</h3>{Array.isArray(content.steps) && content.steps.length ? <ol>{content.steps.map((step, index) => <li key={`${index}-${step}`}><span>{index + 1}</span> {step}</li>)}</ol> : <p>Add a <code>steps</code> array to this activity's PostgreSQL JSONB content.</p>}{content.hint && <div className="guide-note"><Icon name="lightbulb" size={18} /><p>{content.hint}</p></div>}</aside></div><section className="practice-check"><div><span className="check-star">✦</span><div><strong>Practice completed?</strong><small>Your practice record will be saved to your account.</small></div></div><div><Button variant={checked ? "outline" : "primary"} disabled={checked} onClick={markPractice}>{checked ? "✓ Practice noted" : "I practiced this activity"}</Button></div></section></>}
  </>;
}
