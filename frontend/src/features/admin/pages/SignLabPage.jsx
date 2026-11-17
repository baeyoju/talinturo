import { useMemo, useRef, useState } from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";
import { LandmarkCamera } from "@/features/lesson/components/LandmarkCamera";

const DATA_HEADERS = ["label", "sample_id", "frame_index", "captured_at", "landmarks_json"];
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_DATASET_ROWS = 50000;

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function rowsFromCsv(source) {
  const table = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted && char === '"' && source[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(cell); table.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); table.push(row); }
  const [headers = [], ...records] = table;
  return records.filter((record) => record.some((value) => value !== ""))
    .map((record) => Object.fromEntries(headers.map((header, index) => [String(header).trim().toLowerCase(), record[index] ?? ""])));
}

function valueFromCell(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    if (value.text != null) return value.text;
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join("");
    if (value.result != null) return value.result;
  }
  return value;
}

function frameFromRow(row) {
  const label = String(row.label || row.word || row.sign || "").trim();
  if (!label) throw new Error("Every data row needs a label, word, or sign column.");
  let raw = row.landmarks_json || row.landmarks || row.coordinates_json || row.coordinates || row.features;
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); }
    catch { throw new Error(`Landmark JSON for “${label}” is not valid JSON.`); }
  }
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.hands)) {
    throw new Error("Rows need a landmarks_json column containing a hands array. Use a Sign Lab CSV/XLSX export as the template.");
  }
  const hands = raw.hands.filter((hand) => Array.isArray(hand.landmarks) && hand.landmarks.length >= 21);
  if (!hands.length) throw new Error(`The row labeled “${label}” has no complete hand landmark set.`);
  return {
    label,
    sample_id: String(row.sample_id || row.recording_id || "imported"),
    frame_index: Number(row.frame_index) || 0,
    captured_at: String(row.captured_at || row.recorded_at || ""),
    landmarks: { ...raw, hands },
  };
}

function compactFrame(frame) {
  const toTriples = (points) => (points || []).map((point) => [point.x, point.y, point.z]);
  return {
    captured_at: frame.captured_at,
    hands: frame.hands.map((hand) => ({ handedness: hand.handedness, landmarks: toTriples(hand.landmarks) })),
    pose: toTriples(frame.pose),
    face: toTriples(frame.face),
  };
}

function sideName(value) {
  const side = String(value || "").toLowerCase();
  return side.includes("left") ? "left" : side.includes("right") ? "right" : side;
}

function landmarkDistance(live, stored) {
  let sum = 0;
  let count = 0;
  for (const hand of live.hands || []) {
    const matching = (stored.hands || []).find((candidate) => sideName(candidate.handedness) === sideName(hand.handedness));
    if (!matching) continue;
    for (let index = 0; index < 21; index += 1) {
      const a = hand.landmarks[index];
      const b = matching.landmarks[index];
      const xyz = (point) => Array.isArray(point) ? point : [point?.x, point?.y, point?.z];
      const [ax, ay, az] = xyz(a);
      const [bx, by, bz] = xyz(b);
      if (![ax, ay, az, bx, by, bz].every(Number.isFinite)) continue;
      sum += Math.hypot(ax - bx, ay - by, az - bz);
      count += 1;
    }
  }
  return count >= 15 ? sum / count : Infinity;
}

function classifyFrame(frame, dataset) {
  let best = null;
  for (const sample of dataset) {
    const distance = landmarkDistance(frame, sample.landmarks);
    if (distance < (best?.distance ?? Infinity)) best = { label: sample.label, distance };
  }
  if (!best) return null;
  return { ...best, similarity: Math.max(0, Math.round((1 - best.distance / 0.35) * 100)) };
}

export default function SignLabPage() {
  const [label, setLabel] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(false);
  const [samples, setSamples] = useState([]);
  const samplesRef = useRef([]);
  const recordingRefId = useRef("");
  const recordingFrame = useRef(0);
  const lastRecordAt = useRef(0);
  const lastClassifyAt = useRef(0);
  const testRef = useRef(false);
  const testFrames = useRef([]);
  const [dataset, setDataset] = useState([]);
  const [datasetName, setDatasetName] = useState("");
  const [targetWord, setTargetWord] = useState("");
  const [testRunning, setTestRunning] = useState(false);
  const [livePrediction, setLivePrediction] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const words = useMemo(() => [...new Set(dataset.map((row) => row.label))].sort((a, b) => a.localeCompare(b)), [dataset]);
  const correctCount = attempts.filter((attempt) => attempt.correct).length;

  const onLandmarks = (frame) => {
    const now = performance.now();
    if (recordingRef.current && frame.hands.length && now - lastRecordAt.current >= 180 && samplesRef.current.length < MAX_DATASET_ROWS) {
      lastRecordAt.current = now;
      const row = {
        label: label.trim(),
        sample_id: recordingRefId.current,
        frame_index: recordingFrame.current++,
        captured_at: frame.captured_at,
        landmarks: compactFrame(frame),
      };
      samplesRef.current = [...samplesRef.current, row];
      setSamples(samplesRef.current);
    }
    if (testRef.current && now - lastClassifyAt.current >= 220) {
      lastClassifyAt.current = now;
      const prediction = classifyFrame(frame, dataset);
      if (prediction) {
        testFrames.current.push(prediction);
        setLivePrediction(prediction);
      }
    }
  };

  const beginRecording = () => {
    setError(""); setMessage("");
    if (!cameraActive) { setError("Turn on the camera before recording."); return; }
    if (!label.trim()) { setError("Enter the sign word before recording."); return; }
    recordingRefId.current = `sign-${Date.now()}`;
    recordingFrame.current = 0;
    lastRecordAt.current = 0;
    recordingRef.current = true;
    setRecording(true);
    setMessage(`Recording “${label.trim()}”. Hold the sign, then stop when the sample is complete.`);
  };

  const endRecording = () => {
    recordingRef.current = false;
    setRecording(false);
    setMessage(`Recording stopped. ${recordingFrame.current} landmark frames captured for “${label.trim()}”.`);
  };

  const onCameraFrame = (frame) => {
    onLandmarks(frame);
  };

  const onCameraState = (active) => {
    setCameraActive(active);
    if (!active) {
      recordingRef.current = false;
      testRef.current = false;
      setRecording(false);
      setTestRunning(false);
    }
  };

  const exportCsv = (rows = samples, filename = "talinturo-sign-landmarks.csv") => {
    const lines = [DATA_HEADERS.map(csvCell).join(","), ...rows.map((row) => [
      row.label, row.sample_id, row.frame_index, row.captured_at, JSON.stringify(row.landmarks),
    ].map(csvCell).join(","))];
    downloadBlob(new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), filename);
  };

  const exportXlsx = async (rows = samples, filename = "talinturo-sign-landmarks.xlsx") => {
    setBusy(true); setError("");
    try {
      const imported = await import("exceljs");
      const ExcelJS = imported.default || imported;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Landmark samples");
      sheet.addRow(DATA_HEADERS);
      rows.forEach((row) => sheet.addRow([row.label, row.sample_id, row.frame_index, row.captured_at, JSON.stringify(row.landmarks)]));
      sheet.getColumn(5).width = 80;
      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
    } catch (exportError) {
      setError(`Could not create the XLSX file: ${exportError.message}`);
    } finally { setBusy(false); }
  };

  const importDataset = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    setError(""); setMessage(""); setBusy(true);
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error("Choose a dataset smaller than 20 MB.");
      let rows;
      if (file.name.toLowerCase().endsWith(".csv")) {
        rows = rowsFromCsv(await file.text());
      } else if (file.name.toLowerCase().endsWith(".xlsx")) {
        const imported = await import("exceljs");
        const ExcelJS = imported.default || imported;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const sheet = workbook.worksheets[0];
        if (!sheet) throw new Error("The workbook does not contain a worksheet.");
        const matrix = [];
        sheet.eachRow({ includeEmpty: false }, (row) => matrix.push(row.values.slice(1).map(valueFromCell)));
        const [headers = [], ...records] = matrix;
        rows = records.map((record) => Object.fromEntries(headers.map((header, index) => [String(header).trim().toLowerCase(), record[index] ?? ""])));
      } else throw new Error("Choose a .csv or .xlsx file.");
      if (!rows.length) throw new Error("The dataset has no sample rows.");
      if (rows.length > MAX_DATASET_ROWS) throw new Error(`The dataset exceeds the ${MAX_DATASET_ROWS.toLocaleString()}-row limit.`);
      const parsed = rows.map(frameFromRow);
      const nextWords = new Set(parsed.map((row) => row.label));
      if (nextWords.size < 2) throw new Error("Include at least two labeled words so the live comparison can distinguish them.");
      setDataset(parsed);
      setDatasetName(file.name);
      setTargetWord([...nextWords][0]);
      setAttempts([]); setLivePrediction(null);
      setMessage(`Loaded ${parsed.length.toLocaleString()} landmark frames across ${nextWords.size} words from ${file.name}.`);
    } catch (importError) {
      setError(importError.message);
    } finally { setBusy(false); }
  };

  const startTest = () => {
    if (!cameraActive) { setError("Turn on the camera before starting a live test."); return; }
    if (!dataset.length || !targetWord) { setError("Load a labeled dataset and choose a target word first."); return; }
    testFrames.current = [];
    lastClassifyAt.current = 0;
    testRef.current = true;
    setTestRunning(true); setLivePrediction(null); setError("");
    setMessage(`Perform “${targetWord}” for a few seconds, then stop the test.`);
  };

  const stopTest = () => {
    testRef.current = false;
    setTestRunning(false);
    const votes = new Map();
    testFrames.current.forEach((frame) => votes.set(frame.label, (votes.get(frame.label) || 0) + 1));
    const predicted = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!predicted) { setMessage("No complete hand landmarks were detected during this test."); return; }
    const attempt = { target: targetWord, predicted, correct: predicted === targetWord, at: new Date().toISOString() };
    setAttempts((current) => [attempt, ...current]);
    setMessage(`Predicted “${predicted}” for target “${targetWord}” — ${attempt.correct ? "match" : "no match"}.`);
  };

  return <div className="sign-lab">
    <PageTitle eyebrow="ADMINISTRATION · SIGN LAB" title="Landmark recorder & sign check" description="Capture labeled landmark sequences, export a dataset, or compare a live sign with an uploaded dataset. Camera frames stay in your browser." />
    {message && <p className="sign-lab-message" role="status">{message}</p>}
    {error && <p className="sign-lab-error" role="alert">{error}</p>}
    <div className="sign-lab-grid">
      <section className="sign-lab-panel sign-lab-camera-panel">
        <div className="sign-lab-heading"><div><p className="eyebrow">LIVE CAMERA</p><h2>Record word signs</h2></div><span className="sign-lab-count">{samples.length.toLocaleString()} frames</span></div>
        <LandmarkCamera onLandmarks={onCameraFrame} onCameraState={onCameraState} />
        <label className="sign-lab-label">Word or sign label<input value={label} onChange={(event) => setLabel(event.target.value)} disabled={recording} maxLength={100} placeholder="Example: hello" /></label>
        <div className="sign-lab-actions">
          {recording
            ? <Button onClick={endRecording}>Stop recording</Button>
            : <Button onClick={beginRecording} disabled={!cameraActive}>Record labeled sign</Button>}
          <Button variant="outline" disabled={busy || !samples.length} onClick={() => exportCsv()}>Export CSV</Button>
          <Button variant="outline" disabled={busy || !samples.length} onClick={() => exportXlsx()}>Export XLSX</Button>
        </div>
        <p className="sign-lab-help">Start the camera, enter a label, then record while holding or repeating the sign. Each row contains timestamped hand, pose, and face coordinates as JSON. No video is saved.</p>
      </section>

      <section className="sign-lab-panel">
        <div className="sign-lab-heading"><div><p className="eyebrow">DATASET EVALUATOR</p><h2>Try a live sign</h2></div></div>
        <p className="sign-lab-help">Upload a Sign Lab export or another CSV/XLSX with <code>label</code> and <code>landmarks_json</code> columns. The JSON must contain a <code>hands</code> array with 21 x/y/z landmarks per hand.</p>
        <label className="sign-lab-file">CSV or XLSX dataset<input type="file" accept=".csv,.xlsx" disabled={busy || testRunning} onChange={importDataset} /></label>
        {dataset.length > 0 && <>
          <div className="sign-lab-dataset-summary"><strong>{datasetName}</strong><span>{dataset.length.toLocaleString()} frames · {words.length} words</span></div>
          <label className="sign-lab-label">Sign to perform<select value={targetWord} onChange={(event) => setTargetWord(event.target.value)} disabled={testRunning}>{words.map((word) => <option key={word} value={word}>{word}</option>)}</select></label>
          <div className="sign-lab-actions">{testRunning ? <Button onClick={stopTest}>Finish test</Button> : <Button onClick={startTest} disabled={!cameraActive}>Start live test</Button>}<span className="sign-lab-status">{testRunning ? "Comparing live frames…" : cameraActive ? "Ready to compare live frames." : "Turn on the camera to test."}</span></div>
          {livePrediction && <div className="sign-lab-prediction"><span>Current closest match</span><strong>{livePrediction.label}</strong><small>{livePrediction.similarity}% frame similarity · prototype comparison</small></div>}
          <div className="sign-lab-results"><div className="sign-lab-heading"><h3>Observed test results</h3><strong>{attempts.length ? `${Math.round(correctCount * 100 / attempts.length)}%` : "—"}</strong></div><p>{correctCount} matches out of {attempts.length} completed attempts. This is a small-sample experimental result, not a validated FSL recognition accuracy score.</p>
            {attempts.slice(0, 6).map((attempt) => <div className="sign-lab-result-row" key={attempt.at}><span>Target: <strong>{attempt.target}</strong> · Predicted: <strong>{attempt.predicted}</strong></span><b className={attempt.correct ? "is-correct" : "is-incorrect"}>{attempt.correct ? "Match" : "No match"}</b></div>)}
          </div>
        </>}
        {!dataset.length && <div className="sign-lab-empty">Upload a labeled landmark dataset to enable word selection and live comparison.</div>}
      </section>
    </div>
  </div>;
}
