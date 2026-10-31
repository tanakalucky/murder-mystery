import { MapPin } from "lucide-react";
import type { ReactNode } from "react";

import type { TimelineEvent } from "../../model/types";

interface Props {
  event: TimelineEvent;
  action?: ReactNode;
}

export const EventCard = ({ event, action }: Props) => {
  const { playerCharacter, time, location, body } = event;
  const hasMetadata = Boolean(playerCharacter) || Boolean(location);

  return (
    <article className="flex gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xs md:gap-4">
      {Boolean(time) && (
        <div className="w-15 shrink-0 border-r border-border pr-3 text-sm font-semibold break-all text-primary tabular-nums">
          {time}
        </div>
      )}

      <div className="min-w-0 flex-1">
        {hasMetadata && (
          <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {Boolean(playerCharacter) && (
              <span className="font-semibold text-primary">@{playerCharacter}</span>
            )}
            {Boolean(location) && (
              <span className="inline-flex items-center gap-1 break-all text-muted-foreground">
                <MapPin className="size-3 shrink-0" aria-hidden />
                {location}
              </span>
            )}
          </div>
        )}
        <p className="text-sm leading-7 break-all whitespace-pre-wrap">{body}</p>
      </div>
      {action}
    </article>
  );
};
