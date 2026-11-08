import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/adapters/http/api";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function ScenarioActivityPage({ onNavigate }) {
  const { activityId } = useParams();
  const [activity, setActivity] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    setActivity(null);
    setAnswers([]);
    setResult(null);
    setLoadError("");
    api(`/activities/${activityId}`)
      .then(({ activity: item }) => setActivity(item))
      .catch((error) => setLoadError(error.message));
  }, [activityId]);
  const content = activity?.content || {};
  const questions = Array.isArray(content.questions) ? content.questions : [];
  const questionsReady = questions.length > 0 && questions.every((question) =>
    typeof question?.prompt === "string" && Array.isArray(question.choices)
    && question.choices.length > 0 && question.choices.every((choice) => typeof choice?.label === "string"),
  );
  const submit = async () => {
    if (result) return onNavigate(`/results?activity_id=${activityId}`);
    try {
      const saved = await api("/progress/complete", {
        method: "POST",
        body: JSON.stringify({ activity_id: Number(activityId), response: { answers } }),
      });
      setResult(saved);
    } catch (error) {
      setLoadError(error.message);
    }
  };
  if (loadError) return <><PageTitle eyebrow="SCENARIO" title="Activity unavailable" /><p className="inline-error">{loadError}</p><Button variant="outline" onClick={() => onNavigate("/scenarios")}>← All scenarios</Button></>;
  if (!activity) return <div className="empty-state">Loading scenario…</div>;
  if (!questionsReady) return <div className="empty-state"><h2>This scenario needs question data</h2><p>Add a <code>questions</code> array with a prompt and labeled choices for each question in the activity's PostgreSQL JSONB <code>content</code>.</p></div>;
  return <><div className="activity-top"><button className="back-link" onClick={() => onNavigate("/scenarios")}>← All scenarios</button><span>{activity.title}</span><span>{questions.length} question{questions.length === 1 ? "" : "s"}</span></div><div className="activity-progress"><ProgressBar value={result ? 100 : 0} /></div><section className="activity-card panel"><div className="activity-art peach"><Icon name="message" size={40} /></div><span className="eyebrow">{content.category || activity.activity_type}</span><h1>{activity.title}</h1>{content.description && <p className="activity-prompt">{content.description}</p>}{questions.map((question, questionIndex) => <div className="activity-question" key={question.id || questionIndex}><h2>{question.prompt}</h2><div className="choice-grid">{(question.choices || []).map((choice, choiceIndex) => { const choiceId = choice.id ?? choice.label; return <button className={`choice-card ${answers[questionIndex] === choiceId ? "choice-selected" : ""}`} key={choiceId ?? choiceIndex} disabled={Boolean(result)} onClick={() => setAnswers((current) => { const next = [...current]; next[questionIndex] = choiceId; return next; })}><span className="choice-emoji">{choice.emoji || <Icon name="hand" size={23} />}</span><span><strong>{choice.label}</strong>{choice.meaning && <small>{choice.meaning}</small>}</span><span className="choice-radio">{answers[questionIndex] === choiceId ? "●" : "○"}</span></button>; })}</div>{question.hint && <small>{question.hint}</small>}</div>)}{result && <div className="answer-feedback"><Icon name="star" size={21} /><div><strong>Progress saved</strong><p>Your score: {result.score}%</p></div></div>}<div className="activity-actions"><span>{content.hint || ""}</span><Button disabled={!result && (answers.length !== questions.length || answers.some((answer) => answer === undefined))} onClick={submit}>{result ? "View results" : "Submit answers"} <span>→</span></Button></div></section></>;
}
