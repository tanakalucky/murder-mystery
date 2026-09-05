// 打ちかけの語に追従する候補メニューは WAI-ARIA の combobox パターンで組む。
// datalist / select では位置も絞り込みも自前にできないため、role で組み立てる。
// oxlint-disable jsx-a11y/prefer-tag-over-role
// oxlint-disable jsx-a11y/no-noninteractive-element-to-interactive-role
import type { Suggestions } from "#/entities/timeline-event";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import {
  applyMention,
  findMention,
  type Mention,
  type MentionKind,
  MENTION_PREFIX,
} from "../lib/find-mention";
import { getTextareaCaretCoordinates } from "../lib/textarea-caret";

interface Props {
  suggestions: Suggestions;
  onSubmit: (text: string) => void;
}

interface Menu {
  readonly mention: Mention;
  readonly items: readonly string[];
  /** 入力欄を包む要素から見たキャレットの位置 */
  readonly top: number;
  readonly left: number;
}

const candidatesFor = (suggestions: Suggestions, mention: Mention): readonly string[] => {
  const pool: Record<MentionKind, readonly string[]> = {
    player: suggestions.players,
    location: suggestions.locations,
    time: suggestions.times,
  };
  const query = mention.query.toLowerCase();

  return pool[mention.kind].filter((item) => item.toLowerCase().includes(query));
};

export const EventComposer = ({ suggestions, onSubmit }: Props) => {
  const textareaId = useId();
  const listboxId = useId();
  const [text, setText] = useState("");
  const [menu, setMenu] = useState<Menu | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // 候補を確定したあとのカーソル位置。textarea の再描画を待ってから戻す
  const pendingCursorRef = useRef<number | null>(null);

  useEffect(() => {
    const cursorPosition = pendingCursorRef.current;
    if (cursorPosition === null) return;

    pendingCursorRef.current = null;
    const textarea = textareaRef.current;
    if (textarea === null) return;

    textarea.focus();
    textarea.setSelectionRange(cursorPosition, cursorPosition);
  }, [text]);

  const openMenuAtCaret = (textarea: HTMLTextAreaElement) => {
    const mention = findMention(textarea.value, textarea.selectionStart);
    const items = mention === null ? [] : candidatesFor(suggestions, mention);

    if (mention === null || items.length === 0) {
      setMenu(null);
      return;
    }

    const caret = getTextareaCaretCoordinates(textarea, textarea.selectionStart);
    const container = containerRef.current?.getBoundingClientRect();

    setMenu({
      mention,
      items,
      top: caret.top - (container?.top ?? 0),
      left: caret.left - (container?.left ?? 0),
    });
    setActiveIndex(0);
  };

  const confirmMention = (item: string) => {
    const textarea = textareaRef.current;
    if (textarea === null || menu === null) return;

    const applied = applyMention(text, textarea.selectionStart, menu.mention, item);
    pendingCursorRef.current = applied.cursorPosition;
    setText(applied.text);
    setMenu(null);
  };

  const submit = () => {
    onSubmit(text);
    setText("");
    setMenu(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // 変換確定の Enter をメモの登録と取り違えない
    if (event.nativeEvent.isComposing) return;

    if (menu === null) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submit();
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
        メモ
      </label>

      <textarea
        id={textareaId}
        ref={textareaRef}
        value={text}
        placeholder="メモを入力してください... (例: @探偵 #食堂 >10:00 アリバイ確認)"
        rows={3}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={menu === null ? undefined : listboxId}
        aria-expanded={menu !== null}
        aria-activedescendant={menu === null ? undefined : `${listboxId}-${activeIndex}`}
        className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed break-all whitespace-pre-wrap text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        onChange={(event) => {
          setText(event.target.value);
          openMenuAtCaret(event.target);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setMenu(null)}
      />

      {menu !== null && (
        <ul
          id={listboxId}
          style={{ top: `${menu.top + 4}px`, left: `${menu.left}px` }}
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
              {MENTION_PREFIX[menu.mention.kind]}
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
