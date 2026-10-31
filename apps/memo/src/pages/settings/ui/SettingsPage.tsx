import { useTimelineMasters } from "#/entities/timeline-master";
import { countTimelineUsage, useTimelineEvents } from "#/entities/timeline-event";
import { MasterListEditor } from "#/features/manage-timeline-master";
import { useMemo } from "react";

export const SettingsPage = () => {
  const masters = useTimelineMasters();
  const events = useTimelineEvents();
  const usage = useMemo(() => countTimelineUsage(events), [events]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
      <header className="border-b border-border pb-5">
        <h1 className="text-xl font-semibold tracking-wide md:text-2xl">人物・場所・時刻</h1>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <MasterListEditor
          kind="player"
          title="人物"
          placeholder="探偵"
          values={masters.players}
          usage={usage.playerCharacter}
        />

        <MasterListEditor
          kind="time"
          title="時刻"
          placeholder="10:00"
          values={masters.times}
          usage={usage.time}
        />

        <MasterListEditor
          kind="location"
          title="場所"
          placeholder="食堂"
          values={masters.locations}
          usage={usage.location}
        />
      </div>
    </div>
  );
};
