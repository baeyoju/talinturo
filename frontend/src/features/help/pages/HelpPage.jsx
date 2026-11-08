import { useState } from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import { Icon } from "@/components/ui/Icon";

const questions = [
  ["What is Filipino Sign Language?", "Filipino Sign Language (FSL) is the natural sign language used by the Filipino Deaf community. It has its own grammar and vocabulary. FSL belongs to its community — this app is only a starting point for learning."],
  ["Can I use the camera to check my signs?", "The camera preview lets you see yourself while you practice. This demo does not recognize or score signs. For accurate learning, seek guidance from Deaf FSL signers and qualified teachers."],
  ["Is this app suitable for children?", "Talinturo is designed with gentle feedback and a learner-friendly layout. For children, use the app with a trusted adult or educator. This demo does not collect child account data beyond what you enter locally."],
  ["How do I join a virtual classroom?", "Ask your instructor for a classroom invite code. In this demo, classroom joining is represented by the learner management experience; learner invites can be connected to an account flow in a deployed version."],
  ["Is my camera video saved?", "No. The camera preview is processed by your browser only and is never recorded or uploaded by this application."],
];

export function HelpPage() {
  const [open, setOpen] = useState(0);
  return <><PageTitle eyebrow="WE'RE HERE FOR YOU" title="Help & about" description="Questions are part of learning. Find a few answers and helpful notes below." /><section className="help-intro"><span><Icon name="heart" size={24} /></span><div><h2>Learning with respect, always.</h2><p>Talinturo is a small step toward making FSL learning more welcoming and accessible. FSL is a living language, and the Filipino Deaf community is its heart. We encourage learning directly from Deaf signers and educators.</p></div></section><section className="panel faq-panel"><p className="eyebrow">A FEW COMMON QUESTIONS</p><h2>How can we help?</h2>{questions.map(([question, answer], index) => <div className={`faq-item ${open === index ? "faq-open" : ""}`} key={question}><button onClick={() => setOpen(open === index ? -1 : index)} aria-expanded={open === index}><strong>{question}</strong><span>{open === index ? "−" : "+"}</span></button>{open === index && <p>{answer}</p>}</div>)}</section><p className="help-contact">Still have questions? <a href="mailto:hello@talinturo.example">Say hello to our team</a>.</p></>;
}
