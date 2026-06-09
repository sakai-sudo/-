#!/usr/bin/env python3
"""関東7都県の地域別レポートをMarkdownで生成する。
analyze_bids.py の読み取り/集計ロジックを再利用。
使い方: python3 make_kanto_report.py > kanto_report.md
"""
import os, statistics
from analyze_bids import read_csv, aggregate, SEG_ORDER

# 関東7都県 (ファイル名 -> 表示名)。北→南でおおよそ並べる
KANTO = [
    ("ibaraki", "茨城"), ("tochigi", "栃木"), ("gunma", "群馬"),
    ("saitama", "埼玉"), ("chiba", "千葉"), ("tokyo", "東京"), ("kanagawa", "神奈川"),
]
SEGMENTS = ["害虫", "シロアリ", "ハチ", "害獣", "ねずみ", "水漏れ", "雨漏り", "ガラス", "カギ"]

def load():
    data = {}  # region_jp -> {seg: aggdict}
    for fn, jp in KANTO:
        path = f"data/kwp_{fn}.csv"
        if not os.path.exists(path):
            continue
        data[jp] = aggregate(read_csv(path))
    return data

def yen(v):
    return f"{v:,}円" if v is not None else "—"

def main():
    data = load()
    regions = list(data.keys())
    out = []
    P = out.append

    P("# 関東7都県 検索広告 入札・需要分析レポート（開拓優先度）\n")
    P("- **作成日**: 2026年6月9日")
    P("- **データ**: Google キーワードプランナー（地域＝都県別に取得）")
    P("- **対象期間**: 2025年5月〜2026年4月（月間平均検索ボリューム）")
    P("- **対象**: 関東7都県 × 9セグメント（害虫/シロアリ/ハチ/害獣/ねずみ/水漏れ/雨漏り/ガラス/カギ）")
    P("")
    P("**指標の定義**")
    P("")
    P("| 指標 | 意味 |")
    P("|---|---|")
    P("| 入札(高) | 「ページ上部入札単価・高額帯」を月間検索数で加重平均したCPC。**競争＝商圏の旨味の大きさ**を表す |")
    P("| 入札(低) | 同・低額帯の加重平均CPC |")
    P("| 月間検索計 | セグメント関連KWの月間検索数合計。**ニーズ規模（CL見込み）**の代理指標 |")
    P("")
    P("> 開拓優先度の基本方針：**入札(高)が高い地域＝広告費が積まれている＝受注単価の取れる業者が多い商圏**とみなし、優先的に開拓。加えて「ニーズ大なのに入札が安い＝穴場」も別枠で抽出。")
    P("\n---\n")

    # ---- 1. エグゼクティブサマリ ----
    # 各セグメントの最高入札県を拾う
    top_by_seg = {}
    for seg in SEGMENTS:
        ranked = sorted(((r, data[r].get(seg, {}).get("wbid_hi")) for r in regions),
                        key=lambda x: (x[1] is not None, x[1] or 0), reverse=True)
        top_by_seg[seg] = ranked[0]

    P("## 1. エグゼクティブサマリ\n")
    P("**関東で“入札が最も高い＝優先開拓”の組み合わせ（セグメント別トップ県）**\n")
    P("| セグメント | 最高入札の県 | 入札(高) |")
    P("|---|---|---:|")
    for seg in SEGMENTS:
        r, b = top_by_seg[seg]
        P(f"| {seg} | {r} | {yen(b)} |")
    P("")
    # セグメント横断の単価感
    seg_kanto_bid = {}
    seg_kanto_vol = {}
    for seg in SEGMENTS:
        num = sum((data[r].get(seg, {}).get("wbid_hi") or 0) * (data[r].get(seg, {}).get("vol") or 0) for r in regions)
        den = sum((data[r].get(seg, {}).get("vol") or 0) for r in regions)
        seg_kanto_bid[seg] = round(num / den) if den else 0
        seg_kanto_vol[seg] = den
    hi_seg = sorted(SEGMENTS, key=lambda s: seg_kanto_bid[s], reverse=True)
    P(f"- **高単価セグメント（関東平均CPC順）**: " +
      " ＞ ".join(f"{s}({seg_kanto_bid[s]:,}円)" for s in hi_seg[:4]) + " …")
    P(f"- **需要規模セグメント（関東月間検索計順）**: " +
      " ＞ ".join(f"{s}({seg_kanto_vol[s]:,})" for s in sorted(SEGMENTS, key=lambda s: seg_kanto_vol[s], reverse=True)[:4]) + " …")
    P("- 全般に **東京・神奈川が高単価**、北関東（茨城・栃木・群馬）は単価が安い。**雨漏り・水漏れ・ねずみ**は単価/需要とも大きく開拓妙味が高い。")
    P("\n---\n")

    # ---- 2. セグメント別 開拓優先度ランキング ----
    P("## 2. セグメント別 開拓優先度ランキング（入札・高い順）\n")
    P("各セグメントで入札(高)が高い県＝優先開拓。検索計も併記。\n")
    for seg in SEGMENTS:
        P(f"### {seg}\n")
        P("| 順位 | 県 | 入札(高) | 入札(低) | 月間検索計 |")
        P("|---:|---|---:|---:|---:|")
        ranked = sorted(regions, key=lambda r: (data[r].get(seg, {}).get("wbid_hi") or 0), reverse=True)
        for i, r in enumerate(ranked, 1):
            d = data[r].get(seg, {})
            P(f"| {i} | {r} | {yen(d.get('wbid_hi'))} | {yen(d.get('wbid_lo'))} | {(d.get('vol') or 0):,} |")
        P("")
    P("---\n")

    # ---- 3. 入札マトリクス ----
    P("## 3. 入札(高)マトリクス（セグメント × 県）\n")
    P("単位:円。色の濃淡＝開拓妙味。\n")
    P("| セグメント | " + " | ".join(regions) + " | 関東平均 |")
    P("|---|" + "---:|" * (len(regions) + 1))
    for seg in SEGMENTS:
        cells = " | ".join(str((data[r].get(seg, {}).get("wbid_hi") or 0)) for r in regions)
        P(f"| **{seg}** | {cells} | {seg_kanto_bid[seg]:,} |")
    P("\n---\n")

    # ---- 4. 需要規模マトリクス ----
    P("## 4. 月間検索計マトリクス（セグメント × 県）\n")
    P("ニーズ規模（CL見込み）。\n")
    P("| セグメント | " + " | ".join(regions) + " | 関東計 |")
    P("|---|" + "---:|" * (len(regions) + 1))
    for seg in SEGMENTS:
        cells = " | ".join(f"{(data[r].get(seg, {}).get('vol') or 0):,}" for r in regions)
        P(f"| **{seg}** | {cells} | {seg_kanto_vol[seg]:,} |")
    P("\n---\n")

    # ---- 5. 穴場（ニーズ大×入札低） ----
    P("## 5. 穴場リスト（ニーズあり × 入札が安い）\n")
    P("各セグメントで「検索計が中央値以上」かつ「その中で入札が最安」の県＝**ニーズはあるのに競争が緩い＝先行開拓メリット大**。\n")
    P("| セグメント | 穴場の県 | 入札(高) | 月間検索計 | 同セグ最高入札県との単価差 |")
    P("|---|---|---:|---:|---:|")
    for seg in SEGMENTS:
        vols = [(r, data[r].get(seg, {}).get("vol") or 0, data[r].get(seg, {}).get("wbid_hi") or 0) for r in regions]
        med = statistics.median([v for _, v, _ in vols])
        cands = [(r, v, b) for r, v, b in vols if v >= med and b > 0]
        if not cands:
            continue
        ana = min(cands, key=lambda x: x[2])  # 検索計中央値以上で入札最安
        top_bid = max(b for _, _, b in vols)
        P(f"| {seg} | {ana[0]} | {yen(ana[2])} | {ana[1]:,} | 最高比 -{top_bid - ana[2]:,}円 |")
    P("")
    P("> 注：関東は都市部が大きいため“穴場”も相対評価。全国（四国・高知等）を入れると、より明確な低単価×高ニーズ地域が見えてきます。")
    P("\n---\n")
    P("## 付録\n")
    P("- 入札・検索数はキーワードプランナーの推定値。期間は2025/5〜2026/4の月間平均。")
    P("- セグメント分類はKWの自動マッチによる簡易分類（`analyze_bids.py`）。「未分類」（水回りつまり・リフォーム等の周辺KW）は本レポート対象外。")
    P("- 入札(高/低)は月間検索数で加重平均。ブランド指名等の外れ値は加重平均で平準化。")

    print("\n".join(out))

if __name__ == "__main__":
    main()
