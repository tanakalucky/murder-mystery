import { ArrowRight, Clock, Lightbulb, SearchCheck, Users } from "lucide-react";
import type { ComponentType } from "react";
import { Link } from "react-router";

const FEATURES = [
  {
    Icon: Clock,
    title: "タイムラインの自動構築",
    description:
      "「>12:00 発見」のように時刻を書き添えると、時系列に並べ替えたタイムテーブルを組み立てます。",
  },
  {
    Icon: Users,
    title: "人物の紐付け",
    description:
      "「@探偵」のように人物を指定して発言や行動を記録。人物ごとのアリバイ追跡が容易になります。",
  },
  {
    Icon: Lightbulb,
    title: "議論に集中できる UI",
    description: "短い議論時間でも思考を妨げない、打ちながら候補が出る素早い入力インターフェース。",
  },
] as const satisfies readonly {
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
}[];

const STEPS = [
  "サイドメニューまたは上のボタンから「タイムラインメモ」に移動します。",
  "入力欄で「@人物」「#場所」「>時刻（例: >10:30）」を混ぜて、議論やアリバイを記録します。",
  "記録したメモはタイムテーブルに並べ替えられ、容疑者たちの動きが一目で分かるようになります。",
] as const;

export const HomePage = () => (
  <div className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-4 py-8 md:px-6 md:py-12">
    <section className="flex flex-col items-center gap-6 py-10 text-center">
      <span className="rounded-2xl bg-primary/10 p-3 text-primary">
        <SearchCheck className="size-12" aria-hidden />
      </span>

      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Murder Mystery Memo</h1>

      <p className="max-w-xl leading-relaxed text-muted-foreground">
        アリバイの整理、タイムラインの構築、発言ログの記録をシームレスに。
        マーダーミステリーの議論を整理し、事件の真相へと導くための専用メモツール。
      </p>

      <Link
        to="/memo"
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 font-bold text-primary-foreground transition-colors hover:bg-primary/80"
      >
        メモを開始する
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>

    <section className="flex flex-col gap-6">
      <h2 className="text-center text-xl font-bold">主な機能</h2>

      <ul className="grid gap-6 md:grid-cols-3">
        {FEATURES.map(({ Icon, title, description }) => (
          <li
            key={title}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-card-foreground"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden />
            </span>

            <h3 className="font-bold">{title}</h3>

            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </li>
        ))}
      </ul>
    </section>

    <section className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 text-card-foreground md:p-8">
      <h2 className="text-lg font-bold">簡単な使い方</h2>

      <ol className="flex list-inside list-decimal flex-col gap-4 text-sm leading-relaxed marker:font-bold marker:text-primary">
        {STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  </div>
);
