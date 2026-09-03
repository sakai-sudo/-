/**
 * マイナポータル 自己情報取得API から受け取る、妊婦健診まわりの情報。
 *
 * 実際のレスポンスは中間標準レイアウトに沿った、もっと項目の多い構造だが、
 * このアプリが必要とするのは「いま妊娠中か」と「分娩予定日」だけなので、
 * ここまで削いだ形に正規化してから使う。取り込む項目を最小に保つこと自体が
 * プライバシー設計の一部（docs/verification.md）。
 */
export type MaternityCheckup = {
  /** 受診日 */
  examinedOn: Date;
  /** 妊娠週数（記録があれば） */
  gestationalWeeks?: number;
};

export type MaternitySelfInfo = {
  /** 分娩予定日。自治体の記録にあれば入る */
  expectedBirthDate: Date | null;
  /** 妊婦健診の受診記録（新しい順とは限らないので、使う側で並べ替える） */
  checkups: MaternityCheckup[];
  /**
   * 住んでいる自治体が母子保健（妊婦健診）情報連携に対応しているか。
   * 未対応なら「データがない」のではなく「そもそも引けない」ので、案内を変える。
   */
  municipalitySupported: boolean;
};

export type MynaTokens = {
  accessToken: string;
  expiresAt: Date;
};
