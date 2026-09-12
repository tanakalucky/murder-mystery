import { Clock, MapPin } from "lucide-react";
import type { ReactNode } from "react";

import type { TimelineEvent } from "../../model/types";

interface Props {
  event: TimelineEvent;
  /** カードの右上に置く操作。エンティティは操作を持たないので上位レイヤーから差す */
  action?: ReactNode;
}

export const EventCard = ({ event, action }: Props) => {
  const { playerCharacter, time, location, body } = event;
  // `@` だけを打つと空文字が入るので、中身のある属性だけをバッジにする
  const hasBadge = Boolean(playerCharacter) || Boolean(time) || Boolean(location);

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
      {(hasBadge || action !== undefined) && (
        <div className="flex items-start justify-between gap-2">
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

          {action}
        </div>
      )}

      <p className="text-sm leading-relaxed whitespace-pre-wrap">{body}</p>
    </article>
  );
};
