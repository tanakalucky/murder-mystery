import { Clock, MapPin } from "lucide-react";

import type { TimelineEvent } from "../../model/types";

interface Props {
  event: TimelineEvent;
}

export const EventCard = ({ event }: Props) => {
  const { playerCharacter, time, location, body } = event;
  // `@` だけを打つと空文字が入るので、中身のある属性だけをバッジにする
  const hasBadge = Boolean(playerCharacter) || Boolean(time) || Boolean(location);

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
      {hasBadge && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {Boolean(playerCharacter) && (
            <span className="rounded bg-primary/10 px-2 py-0.5 font-bold text-primary">
              @{playerCharacter}
            </span>
          )}

          {Boolean(time) && (
            <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-muted-foreground">
              <Clock className="size-3" aria-hidden />
              {time}
            </span>
          )}

          {Boolean(location) && (
            <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-muted-foreground">
              <MapPin className="size-3" aria-hidden />
              {location}
            </span>
          )}
        </div>
      )}

      <p className="text-sm leading-relaxed whitespace-pre-wrap">{body}</p>
    </article>
  );
};
