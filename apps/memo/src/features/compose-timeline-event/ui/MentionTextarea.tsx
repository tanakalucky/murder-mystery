// 打ちかけの語に追従する候補メニューは WAI-ARIA の combobox パターンで組む。
// datalist / select では位置も絞り込みも自前にできないため、role で組み立てる。
// oxlint-disable jsx-a11y/prefer-tag-over-role
// oxlint-disable jsx-a11y/no-noninteractive-element-to-interactive-role
import { type MasterKind, MASTER_PREFIX, type TimelineMasters } from "#/entities/timeline-master";
import { type KeyboardEvent, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { applyMention, findMention, type Mention } from "../lib/find-mention";
import { getTextareaCaretCoordinates } from "../lib/textarea-caret";

interface Props {
  masters: TimelineMasters;
  value: string;
  /** 読み上げ用のラベル。新規入力と編集で同時に 2 つ並ぶので、呼び出し側が区別できる名前を渡す */
  label: string;
  placeholder?: string;
  /** 編集を始めた直後など、描画と同時に入力させたいとき */
  autoFocus?: boolean;
  onChange: (text: string) => void;
  /** 候補メニューが閉じているときの Enter */
  onSubmit: () => void;
  /** 候補メニューが閉じているときの Escape */
  onCancel?: () => void;
}

interface Menu {
  readonly mention: Mention;
  readonly items: readonly string[];
  /** 入力欄を包む要素から見たキャレットの位置。入力欄は画面下部にあるので上に開く */
  readonly bottom: number;
  readonly left: number;
}

const candidatesFor = (masters: TimelineMasters, mention: Mention): readonly string[] => {
  const pool: Record<MasterKind, readonly string[]> = {
    player: masters.players,
    location: masters.locations,
    time: masters.times,
  };
  const query = mention.query.toLowerCase();

  return pool[mention.kind].filter((item) => item.toLowerCase().includes(query));
};

/**
 * 中身の行数ちょうどの高さにする。1 行のメモに 3 行分の箱を出さないための調整で、
 * 上限は CSS の max-height が持つ（超えた分は入力欄の中でスクロールする）。
 */
const autoResize = (textarea: HTMLTextAreaElement): void => {
  // 空のときは placeholder の折り返しまで scrollHeight に入ってしまうので、測る間だけ外す
  const { placeholder } = textarea;
  textarea.placeholder = "";
  textarea.style.height = "auto";
  // border-box なので、内容の高さ（scrollHeight）に枠線の分を足さないと 1 行ぶん足りない
  const borders = textarea.offsetHeight - textarea.clientHeight;
  textarea.style.height = `${String(textarea.scrollHeight + borders)}px`;
  textarea.placeholder = placeholder;
};

/**
 * `@人物` `#場所` `>時刻` の候補を出す入力欄。
 * 新規のメモ（EventComposer）と記録済みのメモの書き直し（EventEditor）が共有する。
 */
export const MentionTextarea = ({
  masters,
  value,
  label,
  placeholder,
  autoFocus,
  onChange,
  onSubmit,
  onCancel,
}: Props) => {
  const textareaId = useId();
  const listboxId = useId();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // 候補を確定したあとのカーソル位置。textarea の再描画を待ってから戻す
  const pendingCursorRef = useRef<number | null>(null);

  // 候補の確定・送信後のクリア・編集の開始など、入力以外で中身が変わったときの高さ合わせ。
  // 打っている最中は onChange の中で先に合わせる（候補メニューの位置決めが高さを見るため）
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea !== null) autoResize(textarea);
  }, [value]);

  useEffect(() => {
    const cursorPosition = pendingCursorRef.current;
    if (cursorPosition === null) return;

    pendingCursorRef.current = null;
    const textarea = textareaRef.current;
    if (textarea === null) return;

    textarea.focus();
    textarea.setSelectionRange(cursorPosition, cursorPosition);
  }, [value]);

  const openMenuAtCaret = (textarea: HTMLTextAreaElement) => {
    const mention = findMention(textarea.value, textarea.selectionStart);
    const items = mention === null ? [] : candidatesFor(masters, mention);

    if (mention === null || items.length === 0) {
      setMenu(null);
      return;
    }

    const caret = getTextareaCaretCoordinates(textarea, textarea.selectionStart);
    const container = containerRef.current?.getBoundingClientRect();

    setMenu({
      mention,
      items,
      bottom: (container?.bottom ?? 0) - caret.top,
      left: caret.left - (container?.left ?? 0),
    });
    setActiveIndex(0);
  };

  const confirmMention = (item: string) => {
    const textarea = textareaRef.current;
    if (textarea === null || menu === null) return;

    const applied = applyMention(value, textarea.selectionStart, menu.mention, item);
    pendingCursorRef.current = applied.cursorPosition;
    onChange(applied.text);
    setMenu(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // 変換確定の Enter をメモの登録と取り違えない
    if (event.nativeEvent.isComposing) return;

    if (menu === null) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        onSubmit();
      } else if (event.key === "Escape" && onCancel !== undefined) {
        event.preventDefault();
        onCancel();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % menu.items.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + menu.items.length) % menu.items.length);
        break;
      case "Enter":
      case "Tab": {
        event.preventDefault();
        const item = menu.items[activeIndex];
        if (item !== undefined) confirmMention(item);
        break;
      }
      case "Escape":
        event.preventDefault();
        setMenu(null);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="sr-only" htmlFor={textareaId}>
        {label}
      </label>

      <textarea
        id={textareaId}
        ref={textareaRef}
        value={value}
        placeholder={placeholder}
        rows={1}
        // 呼び出し側が編集を開いた直後にだけ渡す
        // oxlint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={menu === null ? undefined : listboxId}
        aria-expanded={menu !== null}
        aria-activedescendant={menu === null ? undefined : `${listboxId}-${activeIndex}`}
        className="max-h-50 w-full resize-none overflow-y-auto rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed break-all whitespace-pre-wrap text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        onChange={(event) => {
          onChange(event.target.value);
          // 折り返しで増えた行のキャレットを拾えるよう、位置を測る前に高さを合わせる
          autoResize(event.target);
          openMenuAtCaret(event.target);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setMenu(null)}
      />

      {menu !== null && (
        <ul
          id={listboxId}
          style={{ bottom: `${menu.bottom + 4}px`, left: `${menu.left}px` }}
          className="absolute z-50 max-h-50 min-w-30 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          role="listbox"
        >
          {menu.items.map((item, index) => (
            <li
              key={item}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={
                index === activeIndex
                  ? "cursor-pointer rounded bg-accent px-3 py-1.5 text-sm text-accent-foreground"
                  : "cursor-pointer rounded px-3 py-1.5 text-sm"
              }
              // クリックで textarea のフォーカスが外れると、候補を確定する前にメニューが閉じる
              onMouseDown={(event) => {
                event.preventDefault();
                confirmMention(item);
              }}
            >
              {MASTER_PREFIX[menu.mention.kind]}
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
