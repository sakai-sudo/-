"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { sendMessage } from "@/lib/actions";

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "…" : "送信"}
    </button>
  );
}

export function Composer({
  matchId,
  suggestions,
}: {
  matchId: string;
  suggestions: string[];
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // 最新のメッセージが見えるように、開いたら一番下へ
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight });
  }, []);

  return (
    <div>
      {suggestions.length > 0 && (
        <div className="wrap" style={{ marginBottom: 8 }}>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="tag-toggle"
              onClick={() => {
                if (textareaRef.current) {
                  textareaRef.current.value = s;
                  textareaRef.current.focus();
                }
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <form action={sendMessage} className="composer" ref={formRef}>
        <input type="hidden" name="matchId" value={matchId} />
        <textarea
          ref={textareaRef}
          name="body"
          rows={1}
          maxLength={1000}
          placeholder="メッセージを入力"
          aria-label="メッセージ"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (e.currentTarget.value.trim()) formRef.current?.requestSubmit();
            }
          }}
        />
        <SendButton />
      </form>
      <p className="hint" style={{ margin: "2px 4px 0" }}>
        Enterで送信 / Shift+Enterで改行
      </p>
    </div>
  );
}
