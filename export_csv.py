#!/usr/bin/env python3
"""関東集計をスプレッドシート向けCSVに書き出す（UTF-8 BOM）。
開拓優先度スコア（入札×需要の合成）を付与し、ランキング順シートも出力。
出力:
  out/kanto_priority.csv    開拓優先度ランキング（スコア順・主役）
  out/kanto_tidy.csv        縦持ち（スコア列付き、ピボット用）
  out/kanto_bid_matrix.csv  入札(高)マトリクス
  out/kanto_vol_matrix.csv  月間検索計マトリクス
"""
import os, csv
from analyze_bids import read_csv, aggregate

KANTO = [("ibaraki","茨城"),("tochigi","栃木"),("gunma","群馬"),
         ("saitama","埼玉"),("chiba","千葉"),("tokyo","東京"),("kanagawa","神奈川")]
SEGMENTS = ["害虫","シロアリ","ハチ","害獣","ねずみ","水漏れ","雨漏り","ガラス","カギ"]
GROUP = {"害虫":"害虫","シロアリ":"害虫","ハチ":"害虫","害獣":"害獣","ねずみ":"害獣",
         "水漏れ":"水回り","雨漏り":"水回り","ガラス":"住まい","カギ":"住まい"}

def load():
    data = {}
    for fn, jp in KANTO:
        p = f"data/kwp_{fn}.csv"
        if os.path.exists(p):
            data[jp] = aggregate(read_csv(p))
    return data

def w(path, rows):
    os.makedirs("out", exist_ok=True)
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        csv.writer(f).writerows(rows)
    print("wrote", path, f"({len(rows)-1} rows)")

def bar(score, width=20):
    n = round(score / 100 * width)
    return "█" * n + "·" * (width - n)

def main():
    data = load()
    regions = list(data.keys())

    # --- レコード化＋スコア計算 ---
    recs = []
    for r in regions:
        for seg in SEGMENTS:
            d = data[r].get(seg, {})
            bid = d.get("wbid_hi") or 0
            vol = d.get("vol") or 0
            ms = bid * vol  # 推定市場規模(円/月)
            recs.append({"group": GROUP[seg], "seg": seg, "region": r,
                         "bid_hi": bid, "bid_lo": d.get("wbid_lo") or 0,
                         "vol": vol, "kw_n": d.get("kw_n") or 0, "ms": ms})
    max_ms = max(x["ms"] for x in recs) or 1
    for x in recs:
        x["score"] = round(x["ms"] / max_ms * 100)
    # セグメント内順位
    for seg in SEGMENTS:
        sub = sorted([x for x in recs if x["seg"] == seg], key=lambda x: x["score"], reverse=True)
        for i, x in enumerate(sub, 1):
            x["seg_rank"] = i

    # 1) 開拓優先度ランキング（スコア順・主役）
    ranked = sorted(recs, key=lambda x: x["score"], reverse=True)
    pr = [["全体順位","開拓優先度スコア","スコア(視覚)","大分類","セグメント","地域",
           "入札高(円)","月間検索計","推定市場規模(円/月)","セグメント内順位"]]
    for i, x in enumerate(ranked, 1):
        pr.append([i, x["score"], bar(x["score"]), x["group"], x["seg"], x["region"],
                   x["bid_hi"], x["vol"], x["ms"], x["seg_rank"]])
    w("out/kanto_priority.csv", pr)

    # 2) tidy（縦持ち・スコア列付き）
    tidy = [["大分類","セグメント","地域","入札高(円)","入札低(円)","月間検索計",
             "推定市場規模(円/月)","開拓優先度スコア","セグメント内順位","KW数"]]
    for r in regions:
        for seg in SEGMENTS:
            x = next(v for v in recs if v["region"] == r and v["seg"] == seg)
            tidy.append([x["group"], x["seg"], x["region"], x["bid_hi"], x["bid_lo"],
                         x["vol"], x["ms"], x["score"], x["seg_rank"], x["kw_n"]])
    w("out/kanto_tidy.csv", tidy)

    # 3) 入札(高)マトリクス
    bid = [["セグメント"] + regions + ["関東平均"]]
    for seg in SEGMENTS:
        num = sum((data[r].get(seg,{}).get("wbid_hi") or 0)*(data[r].get(seg,{}).get("vol") or 0) for r in regions)
        den = sum((data[r].get(seg,{}).get("vol") or 0) for r in regions)
        avg = round(num/den) if den else 0
        bid.append([seg]+[data[r].get(seg,{}).get("wbid_hi") or 0 for r in regions]+[avg])
    w("out/kanto_bid_matrix.csv", bid)

    # 4) 検索計マトリクス
    vol = [["セグメント"] + regions + ["関東計"]]
    for seg in SEGMENTS:
        vals = [data[r].get(seg,{}).get("vol") or 0 for r in regions]
        vol.append([seg]+vals+[sum(vals)])
    w("out/kanto_vol_matrix.csv", vol)

if __name__ == "__main__":
    main()
