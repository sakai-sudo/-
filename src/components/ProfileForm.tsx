"use client";

import { useActionState, useState } from "react";
import {
  AGE_GROUPS,
  BIRTH_ORDERS,
  INTEREST_GROUPS,
  INTEREST_TAGS,
  MAX_INTERESTS,
  PREFECTURES,
} from "@/lib/constants";
import type { FormState } from "@/lib/actions";

export type ProfileFormValues = {
  nickname: string;
  email: string;
  dueDate: string;
  prefecture: string;
  city: string;
  birthOrder: string;
  ageGroup: string;
  interests: string[];
  bio: string;
  wantMeetup: boolean;
  acceptCalls: boolean;
  callFromHour: number;
  callToHour: number;
};

const HOURS = Array.from({ length: 25 }, (_, i) => i);

export const EMPTY_PROFILE: ProfileFormValues = {
  nickname: "",
  email: "",
  dueDate: "",
  prefecture: "",
  city: "",
  birthOrder: "first",
  ageGroup: "30_34",
  interests: [],
  bio: "",
  wantMeetup: false,
  acceptCalls: true,
  callFromHour: 10,
  callToHour: 21,
};

export function ProfileForm({
  action,
  initial,
  submitLabel,
  mode,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  initial: ProfileFormValues;
  submitLabel: string;
  mode: "signup" | "edit";
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  const [selected, setSelected] = useState<string[]>(initial.interests);
  const [acceptCalls, setAcceptCalls] = useState(initial.acceptCalls);
  const errors = state.fieldErrors ?? {};
  const atLimit = selected.length >= MAX_INTERESTS;

  function toggleTag(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : prev.concat(id),
    );
  }

  return (
    <form action={formAction} noValidate>
      {state.message && (
        <p className={state.ok ? "notice notice-ok" : "notice notice-error"} role="status">
          {state.message}
        </p>
      )}

      <div className="field">
        <label className="label" htmlFor="nickname">
          ニックネーム
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          defaultValue={initial.nickname}
          maxLength={20}
          placeholder="みかん"
          autoComplete="off"
          required
        />
        <span className="hint">本名は使わないでください。あとから変更できます。</span>
        {errors.nickname && <span className="error">{errors.nickname}</span>}
      </div>

      {mode === "signup" && (
        <div className="field">
          <label className="label" htmlFor="email">
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={initial.email}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <span className="hint">次回ログインのための識別に使います（他の人には見えません）。</span>
          {errors.email && <span className="error">{errors.email}</span>}
        </div>
      )}

      <div className="field">
        <label className="label" htmlFor="dueDate">
          出産予定日
        </label>
        <input
          id="dueDate"
          name="dueDate"
          type="date"
          defaultValue={initial.dueDate}
          required
        />
        <span className="hint">
          他の人に見えるのは「妊娠週数」と「出産予定月」だけです。日付そのものは公開されません。
        </span>
        {errors.dueDate && <span className="error">{errors.dueDate}</span>}
      </div>

      <div className="field">
        <label className="label" htmlFor="prefecture">
          お住まいの地域
        </label>
        <select id="prefecture" name="prefecture" defaultValue={initial.prefecture} required>
          <option value="">都道府県を選択</option>
          {PREFECTURES.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        {errors.prefecture && <span className="error">{errors.prefecture}</span>}
        <input
          name="city"
          type="text"
          defaultValue={initial.city}
          placeholder="市区町村（例: 世田谷区）"
          maxLength={30}
          aria-label="市区町村"
          required
        />
        <span className="hint">
          番地やマンション名は入力しないでください。産院や自治体の話が合う相手を探すために使います。
        </span>
        {errors.city && <span className="error">{errors.city}</span>}
      </div>

      <div className="field">
        <span className="label">今回の出産は</span>
        <div className="seg">
          {BIRTH_ORDERS.map((b) => (
            <label key={b.id}>
              <input
                type="radio"
                name="birthOrder"
                value={b.id}
                defaultChecked={initial.birthOrder === b.id}
              />
              {b.label}
            </label>
          ))}
        </div>
        {errors.birthOrder && <span className="error">{errors.birthOrder}</span>}
      </div>

      <div className="field">
        <span className="label">年代</span>
        <div className="seg">
          {AGE_GROUPS.map((a) => (
            <label key={a.id}>
              <input
                type="radio"
                name="ageGroup"
                value={a.id}
                defaultChecked={initial.ageGroup === a.id}
              />
              {a.label}
            </label>
          ))}
        </div>
        {errors.ageGroup && <span className="error">{errors.ageGroup}</span>}
      </div>

      <div className="field">
        <span className="label">
          いまの気分・関心タグ
          <span className="muted" style={{ fontWeight: 600 }}>
            {" "}
            （{selected.length}/{MAX_INTERESTS}）
          </span>
        </span>
        <div className="tagpicker">
          {INTEREST_GROUPS.map((group) => (
            <div className="tagpicker-group" key={group}>
              <div className="label">{group}</div>
              <div className="wrap">
                {INTEREST_TAGS.filter((t) => t.group === group).map((tag) => {
                  const checked = selected.includes(tag.id);
                  return (
                    <label
                      key={tag.id}
                      className="tag-toggle"
                      style={!checked && atLimit ? { opacity: 0.42 } : undefined}
                    >
                      <input
                        type="checkbox"
                        name="interests"
                        value={tag.id}
                        checked={checked}
                        disabled={!checked && atLimit}
                        onChange={() => toggleTag(tag.id)}
                      />
                      {tag.label}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {errors.interests && <span className="error">{errors.interests}</span>}
      </div>

      <div className="field">
        <label className="label" htmlFor="bio">
          ひとこと自己紹介
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={initial.bio}
          maxLength={400}
          placeholder="初マタで不安だらけです。同じ時期の方とゆるく話せたら嬉しいです。"
        />
        <span className="hint">連絡先・SNS の ID・勤務先などは書かないでください。</span>
        {errors.bio && <span className="error">{errors.bio}</span>}
      </div>

      <div className="field">
        <label className="check">
          <input type="checkbox" name="wantMeetup" defaultChecked={initial.wantMeetup} />
          <span>
            体調が良ければ、近所でお茶するくらいの範囲で会ってみたい
            <br />
            <span className="hint">オンラインだけが良い方はオフのままで大丈夫です。</span>
          </span>
        </label>
      </div>

      <div className="field">
        <span className="label">アプリ内通話</span>
        <label className="check">
          <input
            type="checkbox"
            name="acceptCalls"
            checked={acceptCalls}
            onChange={(e) => setAcceptCalls(e.target.checked)}
          />
          <span>
            マッチした相手からの通話を受け付ける
            <br />
            <span className="hint">
              電話番号は交換しません。着信は「呼び出し → 応答」の2段階で、出たくないときは見送れます。
            </span>
          </span>
        </label>
        {acceptCalls && (
          <div className="filter-row" style={{ marginTop: 4 }}>
            <span className="hint">受け付ける時間帯</span>
            <select name="callFromHour" defaultValue={String(initial.callFromHour)} aria-label="通話受付の開始時刻">
              {HOURS.map((h) => (
                <option key={h} value={h}>{`${h}:00`}</option>
              ))}
            </select>
            <span className="hint">〜</span>
            <select name="callToHour" defaultValue={String(initial.callToHour)} aria-label="通話受付の終了時刻">
              {HOURS.map((h) => (
                <option key={h} value={h}>{`${h}:00`}</option>
              ))}
            </select>
          </div>
        )}
        {!acceptCalls && (
          <>
            <input type="hidden" name="callFromHour" value={initial.callFromHour} />
            <input type="hidden" name="callToHour" value={initial.callToHour} />
          </>
        )}
        {errors.callFromHour && <span className="error">{errors.callFromHour}</span>}
      </div>

      {mode === "signup" && (
        <p className="notice notice-warn">
          マタマッチは妊婦さん同士のおしゃべりの場です。医療的な判断は、必ずかかりつけの医師・助産師にご相談ください。
        </p>
      )}

      <button className="btn btn-lg btn-block" type="submit" disabled={pending}>
        {pending ? "送信中…" : submitLabel}
      </button>
    </form>
  );
}
