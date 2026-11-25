import { SearchX } from "lucide-react";

export default function EmptyState({ title = "Nothing here just yet", description = "Try changing your filters or check back soon.", action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><SearchX size={26} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
