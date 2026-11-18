import { Button } from "@/components/ui/Button";
import star from "@/assets/path/node-star.svg";
import check from "@/assets/path/node-check.svg";
import lock from "@/assets/path/lock.svg";

export function PathLessonNode({ node, pathId, onNavigate, open, setOpen }) {
  const show = () => setOpen(node.number);
  const close = () => setOpen(current => current === node.number ? null : current);
  const locked = node.status === "locked";
  const id = `path-lesson-${node.number}`;
  const completed = node.status === "completed";
  return <li className={`path-stop path-stop--${node.status}`} data-lesson={node.id || ""} data-status={node.status}
    data-number={node.number} data-open={open}
    onMouseLeave={() => { if (!document.activeElement?.closest(`#${id}-card`)) close(); }}
    onFocus={show} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }}
    onKeyDown={event => { if (event.key === "Escape") { setOpen(null); event.stopPropagation(); } }} id={id}>
    <button type="button" className="path-node" aria-expanded={open} aria-controls={`${id}-card`}
      aria-label={`Lesson ${node.number}: ${node.title}, ${node.status}`} aria-current={node.status === "current" ? "step" : undefined}
      onMouseEnter={show} onClick={show} style={{ "--lesson-progress": `${completed ? 100 : node.progress}%` }}>
      <span className="path-node__ring" aria-hidden="true" />
      <span className="path-node__face" aria-hidden="true">{locked ? <img src={lock} width="50" height="50" alt="" />
        : completed ? <img src={check} width="40.0001" height="27.0001" alt="" />
          : <img src={star} width="50.9632" height="47.655" alt="" />}</span>
    </button>
    <div className="path-lesson-card" id={`${id}-card`} hidden={!open}>
      <h2>{node.title}</h2><p>Lesson {node.number} of 5</p>
      {locked && <p className="path-lesson-card__reason">Complete the previous lesson to unlock this one.</p>}
      {!locked && !node.canStart && <p className="path-lesson-card__reason">Lesson content is not available yet.</p>}
      <Button type="button" disabled={!node.canStart || !pathId} onClick={() => {
        if (node.canStart && pathId) onNavigate(`/paths/${pathId}/lessons/${node.id}`);
      }}>{locked ? "LOCKED" : !node.canStart ? "NOT AVAILABLE YET" : completed ? "REVIEW LESSON" : node.started ? "CONTINUE + 15 XP" : "START + 15 XP"}</Button>
    </div>
  </li>;
}
