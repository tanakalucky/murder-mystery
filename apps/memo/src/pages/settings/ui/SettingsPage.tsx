import { useTimelineMasters } from "#/entities/timeline-master";
import { countTimelineUsage, useTimelineEvents } from "#/entities/timeline-event";
import { MasterListEditor } from "#/features/manage-timeline-master";
import { useMemo } from "react";

export const SettingsPage = () => {
  const masters = useTimelineMasters();
  const events = useTimelineEvents();
  const usage = useMemo(() => countTimelineUsage(events), [events]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
      <header>
        <h1 className="text-2xl font-bold">人物・場所・時刻の設定</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          開始前に分かっている分をここで登録しておくと、最初のメモから候補に出ます。
          メモに書いた分も自動で並びます。並び順はそのままタイムテーブルの行と列になります。
        </p>
      </header>

      <MasterListEditor
        kind="player"
        title="人物"
        hint="登録した順に、タイムテーブルの列として左から並びます。"
        placeholder="探偵"
        values={masters.players}
        usage={usage.playerCharacter}
      />

      <MasterListEditor
        kind="time"
        title="時刻"
        hint="時刻の順に自動で並びます。「オープニング」のように時刻でない区切りは末尾に入るので、必要なら上下に動かしてください。"
        placeholder="10:00"
        values={masters.times}
        usage={usage.time}
      />

      <MasterListEditor
        kind="location"
        title="場所"
        hint="タイムテーブルでは各メモのバッジとして出ます。"
        placeholder="食堂"
        values={masters.locations}
        usage={usage.location}
      />
    </div>
  );
};
