/** メモ 1 件。`@人物` `#場所` `>時刻` を取り出した残りが本文になる */
export interface TimelineEvent {
  readonly playerCharacter?: string;
  readonly time?: string;
  readonly location?: string;
  readonly body: string;
}
