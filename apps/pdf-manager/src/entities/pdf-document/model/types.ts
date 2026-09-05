export interface PdfDocument {
  readonly id: string;
  readonly name: string;
  /** 追加順を決めるソートキー。値が小さいほど古い */
  readonly addedAt: number;
  readonly file: File;
}

/** 1ページ目から生成するサムネイルの状態 */
export type ThumbnailState =
  | { readonly status: "pending" }
  | { readonly status: "ready"; readonly url: string }
  | { readonly status: "failed" };
