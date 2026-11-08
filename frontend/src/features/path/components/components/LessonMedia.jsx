import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

export function LessonMedia({ lesson }) {
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const imageUrl = typeof lesson.image_url === "string" ? lesson.image_url.trim() : "";

  return <div className="lesson-media">
    {imageUrl && !imageUnavailable
      ? <img className="lesson-media-image" src={imageUrl} alt={`${lesson.title} lesson`} loading="lazy" onError={() => setImageUnavailable(true)} />
      : <div className="lesson-media-placeholder"><Icon name="bookOpen" size={32} /><span>{imageUrl ? "Lesson image unavailable" : "No image available"}</span></div>}
  </div>;
}
