import { LearningPathsPage } from "./LearningPathsPage";

// Both entry URLs share one API-backed map rather than two competing Path UIs.
export function LearningPathDetailsPage(props) {
  return <LearningPathsPage {...props} />;
}
