import { useEffect, useState } from "react";
import { api } from "@/adapters/http/api";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function ChallengePage({ onNavigate, onToast }) {
  const [challenges, setChallenges] = useState([]);
  const [challengeId, setChallengeId] = useState("");
  const [answers, setAnswers] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api("/challenges")
      .then(({ challenges: items }) => {
        setChallenges(items);
        setChallengeId(items.length ? String(items[0].id) : "");
      })
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);
  const challenge = challenges.find((item) => String(item.id) === challengeId);
  const questions = Array.isArray(challenge?.content?.questions) ? challenge.content.questions : [];
  const questionsReady = questions.length > 0 && questions.every((question) =>
    typeof question?.prompt === "string" && Array.isArray(question.choices)
    && question.choices.length > 0 && question.choices.every((choice) => typeof choice?.label === "string"),
  );
  const submit = async () => {
    if (!challenge || answers.length !== questions.length || answers.some((answer) => answer === undefined)) {
      return onToast("Answer every question before submitting.");
    }
    try {
      const result = await api("/progress/complete", {
        method: "POST",
        body: JSON.stringify({ activity_id: challenge.id, response: { answers } }),
      });
      onNavigate(result.score === 100 ? "/challenge/success" : "/challenge/try-again");
    } catch (error) {
      setLoadError(error.message);
    }
  };
  if (loadError) return <><PageTitle eyebrow="YOUR LEARNING JOURNEY" title="Level challenge" /><p className="inline-error">{loadError}</p></>;
  if (loading) return <div className="empty-state">Loading challenges…</div>;
  if (!challenges.length) return <><PageTitle eyebrow="YOUR LEARNING JOURNEY" title="Level challenge" description="Challenge questions will appear here when they are published." /><div className="empty-state"><Icon name="sparkles" size={34} /><h2>No challenge available</h2><p>Add a published challenge activity to PostgreSQL <code>activities</code> with questions, choices, and correct-choice flags.</p></div></>;
  if (!challenge || !questionsReady) return <div className="empty-state"><h2>This challenge needs question data</h2><p>Add a <code>questions</code> array with prompts and labeled choices to the activity's JSONB <code>content</code>.</p></div>;
  return <><PageTitle eyebrow="A NEW CHAPTER IS WAITING" title={challenge.title} description={challenge.content.description} /><section className="challenge-panel panel"><div className="challenge-top"><span className="challenge-badge">✦</span><label>Choose challenge <select value={challengeId} onChange={(event) => { setChallengeId(event.target.value); setAnswers([]); }} aria-label="Choose challenge">{challenges.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label><span>{questions.length} question{questions.length === 1 ? "" : "s"}</span></div><ProgressBar value={answers.filter((answer) => answer !== undefined).length / questions.length * 100} color="peach" /><div className="challenge-question">{questions.map((question, questionIndex) => <div key={question.id || questionIndex}><p className="eyebrow">{question.instruction || "CHALLENGE"}</p><h2>{question.prompt}</h2><div className="challenge-options">{(question.choices || []).map((choice, choiceIndex) => { const choiceId = choice.id ?? choice.label; return <button className={`challenge-option ${answers[questionIndex] === choiceId ? "challenge-selected" : ""}`} key={choiceId ?? choiceIndex} onClick={() => setAnswers((current) => { const next = [...current]; next[questionIndex] = choiceId; return next; })}>{choice.label}<span>{answers[questionIndex] === choiceId ? "●" : "○"}</span></button>; })}</div></div>)}<Button onClick={submit}>Submit challenge <span>→</span></Button></div><p className="challenge-footnote">Take a breath. Learning isn't a race. <button onClick={() => onNavigate("/")}>Come back later</button></p></section></>;
}
