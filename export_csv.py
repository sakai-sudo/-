#!/usr/bin/env python3
"""関東集計をスプレッドシート向けCSVに書き出す（UTF-8 BOM）。
出力:
  out/kanto_tidy.csv        縦持ち（地域×セグメント、ピボット用）
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

def main():
    data = load()
    regions = list(data.keys())

    # 1) tidy（縦持ち）
    tidy = [["大分類","セグメント","地域","入札高(円)","入札低(円)","月間検索計","KW数"]]
    for r in regions:
        for seg in SEGMENTS:
            d = data[r].get(seg, {})
            tidy.append([GROUP[seg], seg, r, d.get("wbid_hi") or "", d.get("wbid_lo") or "",
                         d.get("vol") or 0, d.get("kw_n") or 0])
    w("out/kanto_tidy.csv", tidy)

    # 2) 入札(高)マトリクス
    bid = [["セグメント"] + regions + ["関東平均"]]
    for seg in SEGMENTS:
        num = sum((data[r].get(seg,{}).get("wbid_hi") or 0)*(data[r].get(seg,{}).get("vol") or 0) for r in regions)
        den = sum((data[r].get(seg,{}).get("vol") or 0) for r in regions)
        avg = round(num/den) if den else 0
        bid.append([seg]+[data[r].get(seg,{}).get("wbid_hi") or 0 for r in regions]+[avg])
    w("out/kanto_bid_matrix.csv", bid)

    # 3) 検索計マトリクス
    vol = [["セグメント"] + regions + ["関東計"]]
    for seg in SEGMENTS:
        vals = [data[r].get(seg,{}).get("vol") or 0 for r in regions]
        vol.append([seg]+vals+[sum(vals)])
    w("out/kanto_vol_matrix.csv", vol)

if __name__ == "__main__":
    main()
