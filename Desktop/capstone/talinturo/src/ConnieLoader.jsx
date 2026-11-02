import { useEffect, useState } from "react";
import "./ConnieLoader.css";

const poses = ["happy", "impressed"];

export default function ConnieLoader({ active }) {
  const [visible, setVisible] = useState(false);
  const [poseIndex, setPoseIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setVisible(true), 5000);
    return () => window.clearTimeout(timer);
  }, [active]);

  useEffect(() => {
    if (!visible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => {
      setPoseIndex((current) => (current + 1) % poses.length);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="connie-loader" role="status" aria-live="polite">
      <div className={`connie-loader__bunny pose-${poses[poseIndex]}`} aria-hidden="true">
        <svg viewBox="0 0 220 230">
          <ellipse className="bunny-ear bunny-ear-back" cx="70" cy="51" rx="19" ry="51" transform="rotate(-17 70 51)" />
          <ellipse className="bunny-ear-inner bunny-ear-back-inner" cx="70" cy="51" rx="9" ry="38" transform="rotate(-17 70 51)" />
          <path className="bunny-ear bunny-ear-flop" d="M137 35c8-22 26-31 45-18 17 12 27 34 15 46-13 13-38-2-60-28Z" />
          <path className="bunny-ear-inner bunny-ear-flop-inner" d="M145 35c8-14 17-17 27-9 10 8 15 19 11 22-6 6-21-3-38-13Z" />
          <ellipse className="bunny-body" cx="111" cy="177" rx="49" ry="43" />
          <ellipse className="bunny-foot" cx="83" cy="211" rx="18" ry="11" transform="rotate(-18 83 211)" />
          <ellipse className="bunny-foot" cx="139" cy="211" rx="18" ry="11" transform="rotate(18 139 211)" />
          <path className="bunny-arm bunny-left-arm" d="M68 165c-19-15-31-34-33-52-2-12-9-17-16-11-8 7-2 22 2 32 7 19 19 31 35 42" />
          <g transform="translate(154 165)">
            <g className="bunny-right-arm">
              <path className="bunny-arm" d="M0 0c19-15 31-34 33-52" />
              <path className="bunny-hand" d="M33-49V-66c0-5 7-6 8-1l2 10v-15c0-6 8-6 9 0l1 14v-10c0-6 8-6 9 0v15l3-6c3-5 9-2 7 3l-5 17c-2 7-8 12-15 12h-8c-7 0-12-4-15-10l-5-11c-2-4 4-8 8-4Z" />
            </g>
          </g>
          <circle className="bunny-face" cx="110" cy="119" r="52" />
          <ellipse className="bunny-blush" cx="78" cy="130" rx="9" ry="5" />
          <ellipse className="bunny-blush" cx="142" cy="130" rx="9" ry="5" />
          <g className="bunny-expression expression-happy">
            <path className="bunny-eyes-closed" d="M87 117q7-8 14 0m16 0q7-8 14 0" />
            <path className="bunny-mouth" d="M110 128v8m0 0q-7 8-13 0m13 0q7 8 13 0" />
          </g>
          <g className="bunny-expression expression-impressed">
            <circle className="bunny-eye" cx="94" cy="116" r="4.5" />
            <circle className="bunny-eye" cx="126" cy="116" r="4.5" />
            <ellipse className="bunny-mouth-open" cx="110" cy="134" rx="7" ry="9" />
          </g>
          <path className="bunny-nose" d="M106 126q4-5 8 0l-4 5Z" />
        </svg>
      </div>
      <div className="connie-loader__track" aria-hidden="true"><span /></div>
      <span className="connie-loader__sr-only">Loading, please wait.</span>
    </div>
  );
}
