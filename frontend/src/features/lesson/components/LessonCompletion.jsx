import { useEffect, useRef, useState } from "react";
import { api } from "@/adapters/http/api";
import { Button } from "@/components/ui/Button";
import { AvatarMascot } from "@/features/profile/avatar/AvatarMascot";
import "../styles/lesson-completion.css";

// Presentation of an acknowledged quiz/practice save, NOT a sign-recognition verdict.
export function LessonCompletion({ result, pathId, nickname, onContinue }) {
  const [stage, setStage] = useState("commend");
  const [avatar, setAvatar] = useState(null);
  const [pathComplete, setPathComplete] = useState(false);
  const dialog = useRef(null), heading = useRef(null);
  useEffect(() => {
    let active = true;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current.showModal();
    api("/avatar").then(({ avatar: saved }) => { if (active) setAvatar(saved); }).catch(() => {});
    api(`/paths/${pathId}`).then(({ lessons }) => {
      if (active) setPathComplete(Array.isArray(lessons) && lessons.length > 0 && lessons.every(lesson => Number(lesson.progress) === 100));
    }).catch(() => {}); // No claim of level completion if that read fails.
    const element = dialog.current;
    return () => { active = false; element.close(); document.body.style.overflow = previous; };
  }, [pathId]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [stage]);
  return <dialog className="lesson-completion" ref={dialog} aria-labelledby="lesson-completion-title" onCancel={event => { event.preventDefault(); onContinue(); }}>
    <section className="lesson-completion__page" data-stage={stage}>
      <div className="lesson-completion__main">
        <h1 ref={heading} tabIndex="-1" id="lesson-completion-title" className={stage === "commend" ? "lesson-completion__bubble" : ""}>
          {stage === "commend" ? `Good job, ${nickname || "learner"}!` : pathComplete ? "Level Complete!" : "Lesson Complete!"}
        </h1>
        <AvatarMascot character={avatar?.character} equipped={avatar?.equipped} celebration />
        {stage === "review" && <>
          <p>Well done! You’re one step closer to confident conversations. Ang galing mo!</p>
          <div className="lesson-completion__rewards"><div><strong>+{result.xp}</strong><span>EXP</span></div></div>
        </>}
      </div>
      <footer><Button className="lesson-completion__continue" onClick={() => stage === "commend" ? setStage("review") : onContinue()}>{stage === "commend" ? "CONTINUE" : "BACK TO MY PATH"}</Button></footer>
    </section>
  </dialog>;
}
