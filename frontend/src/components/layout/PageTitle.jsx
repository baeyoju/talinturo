import { useContext } from "react";
import { m } from "framer-motion";
import { introTextVariants } from "@/lib/motion";
import { PageMotionContext } from "./PageMotionContext";

export function PageTitle({ eyebrow, title, description, action }) {
  const reduceMotion = useContext(PageMotionContext);
  const textVariants = introTextVariants(reduceMotion);
  const variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.075, delayChildren: reduceMotion ? 0 : 0.04 } },
  };
  return <m.div className="page-title" variants={variants} initial={reduceMotion ? false : "hidden"} animate="visible">
    <div>
      {eyebrow && <m.p className="eyebrow" variants={textVariants}>{eyebrow}</m.p>}
      <m.h1 variants={textVariants}>{title}</m.h1>
      {description && <m.p className="page-description" variants={textVariants}>{description}</m.p>}
    </div>
    {action && <m.div variants={textVariants}>{action}</m.div>}
  </m.div>;
}
