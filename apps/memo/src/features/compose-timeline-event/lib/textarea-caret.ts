/** ミラー要素に写して字送りを揃えるプロパティ */
const MIRRORED_PROPERTIES = [
  "direction",
  "box-sizing",
  "width",
  "height",
  "overflow-x",
  "overflow-y",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "font-family",
  "font-weight",
  "font-size",
  "font-style",
  "font-variant",
  "font-stretch",
  "line-height",
  "letter-spacing",
  "text-transform",
] as const;

export interface CaretCoordinates {
  readonly top: number;
  readonly left: number;
}

/**
 * textarea 内のキャレットのビューポート座標を返す。
 * textarea はキャレットの位置を公開しないので、同じ字送りになる隠し要素に
 * カーソルまでの文字を写し、その直後に置いた span の位置から求める。
 */
export const getTextareaCaretCoordinates = (
  textarea: HTMLTextAreaElement,
  position: number,
): CaretCoordinates => {
  const computed = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");

  for (const property of MIRRORED_PROPERTIES) {
    mirror.style.setProperty(property, computed.getPropertyValue(property));
  }

  // 幅は写したので、枠線は引かれていること自体を揃えれば内容の幅が一致する
  mirror.style.borderStyle = "solid";
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordBreak = "break-all";
  mirror.textContent = textarea.value.slice(0, position);

  // 後続の文字を入れないと、折り返し位置のキャレットが前の行末に残る
  const caret = document.createElement("span");
  caret.textContent = textarea.value.slice(position) || ".";
  mirror.append(caret);
  document.body.append(mirror);

  try {
    const textareaRect = textarea.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();
    const caretRect = caret.getBoundingClientRect();

    return {
      top: caretRect.top - mirrorRect.top + textareaRect.top - textarea.scrollTop,
      left: caretRect.left - mirrorRect.left + textareaRect.left - textarea.scrollLeft,
    };
  } finally {
    mirror.remove();
  }
};
