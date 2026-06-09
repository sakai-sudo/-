#!/usr/bin/env python3
"""Google Keyword Planner 地域別CSVを読み、セグメント別に集計する。

入力: data/kwp_<地域>.csv (UTF-16, タブ区切り, 先頭2行はタイトル/期間)
使い方: python3 analyze_bids.py
"""
import csv, glob, os, re, sys

# --- セグメント分類ルール（上から順に判定。具体的なものを先に） ---
SEGMENT_RULES = [
    ("シロアリ", [r"シロアリ", r"白あり", r"白蟻"]),
    ("ハチ",     [r"ハチ", r"蜂", r"スズメバチ", r"すずめばち", r"アシナガ", r"ミツバチ", r"くまばち", r"クマバチ"]),
    ("ねずみ",   [r"ねずみ", r"ネズミ", r"鼠"]),
    ("害獣",     [r"害獣", r"害鳥", r"イタチ", r"いたち", r"ハクビシン", r"はくびしん", r"アライグマ", r"あらいぐま",
                  r"コウモリ", r"こうもり", r"アナグマ", r"テン", r"モグラ", r"もぐら", r"猿", r"サル", r"鹿",
                  r"イノシシ", r"タヌキ", r"狸", r"鳩", r"ハト"]),
    ("害虫",     [r"害虫", r"ゴキブリ", r"ごきぶり", r"トコジラミ", r"南京虫", r"ダニ", r"ムカデ", r"むかで",
                  r"アリ", r"蟻", r"コバエ", r"ハエ", r"蚊", r"カメムシ", r"クモ", r"ノミ", r"羽アリ", r"羽蟻",
                  r"毛虫", r"イモムシ", r"幼虫", r"虫"]),
    ("水漏れ",   [r"水漏れ", r"水もれ", r"漏水", r"水道.*水漏", r"蛇口", r"トイレ.*水", r"配管.*漏"]),
    ("雨漏り",   [r"雨漏り", r"雨漏れ", r"あまもり", r"雨もり"]),
    ("ガラス",   [r"ガラス", r"窓ガラス", r"硝子"]),
    ("カギ",     [r"鍵", r"カギ", r"かぎ", r"鍵開け", r"鍵交換", r"スマートロック", r"シリンダー", r"ディンプル"]),
]
COMPILED = [(seg, [re.compile(p) for p in pats]) for seg, pats in SEGMENT_RULES]

def classify(kw):
    for seg, pats in COMPILED:
        for p in pats:
            if p.search(kw):
                return seg
    return "未分類"

def to_int(s):
    if not s: return None
    s = s.replace(",", "").strip()
    try:
        return int(float(s))
    except ValueError:
        return None

def read_csv(path):
    raw = open(path, encoding="utf-16").read()
    lines = raw.splitlines()
    # タイトル2行をスキップ。ヘッダー行を探す
    hdr_idx = next(i for i, l in enumerate(lines) if l.startswith("Keyword\t"))
    reader = csv.DictReader(lines[hdr_idx:], delimiter="\t")
    rows = []
    for r in reader:
        kw = (r.get("Keyword") or "").strip()
        if not kw:
            continue
        rows.append({
            "kw": kw,
            "vol": to_int(r.get("Avg. monthly searches")),
            "bid_low": to_int(r.get("Top of page bid (low range)")),
            "bid_high": to_int(r.get("Top of page bid (high range)")),
            "comp": (r.get("Competition") or "").strip(),
        })
    return rows

def region_from_path(p):
    m = re.search(r"kwp_(.+?)\.csv", os.path.basename(p))
    return m.group(1) if m else os.path.basename(p)

def aggregate(rows):
    """セグメント別に集計。入札はボリューム加重平均。"""
    agg = {}
    for r in rows:
        seg = classify(r["kw"])
        d = agg.setdefault(seg, {"kw_n": 0, "vol": 0, "wbid_hi_num": 0.0, "wbid_lo_num": 0.0,
                                  "wbid_den": 0, "max_hi": 0, "max_hi_kw": ""})
        d["kw_n"] += 1
        v = r["vol"] or 0
        d["vol"] += v
        if r["bid_high"] is not None and v > 0:
            d["wbid_hi_num"] += r["bid_high"] * v
            d["wbid_lo_num"] += (r["bid_low"] or 0) * v
            d["wbid_den"] += v
        if r["bid_high"] and r["bid_high"] > d["max_hi"]:
            d["max_hi"] = r["bid_high"]; d["max_hi_kw"] = r["kw"]
    out = {}
    for seg, d in agg.items():
        wbid_hi = round(d["wbid_hi_num"] / d["wbid_den"]) if d["wbid_den"] else None
        wbid_lo = round(d["wbid_lo_num"] / d["wbid_den"]) if d["wbid_den"] else None
        out[seg] = {"kw_n": d["kw_n"], "vol": d["vol"], "wbid_hi": wbid_hi,
                    "wbid_lo": wbid_lo, "max_hi": d["max_hi"], "max_hi_kw": d["max_hi_kw"]}
    return out

SEG_ORDER = ["害虫","シロアリ","ハチ","害獣","ねずみ","水漏れ","雨漏り","ガラス","カギ","未分類"]

def main():
    files = sorted(glob.glob("data/kwp_*.csv"))
    if not files:
        print("data/kwp_*.csv が見つかりません"); sys.exit(1)
    for f in files:
        region = region_from_path(f)
        rows = read_csv(f)
        agg = aggregate(rows)
        print(f"\n=== {region}  (総KW {len(rows):,}) ===")
        print(f"{'セグメント':<8}{'KW数':>7}{'月間検索計':>12}{'加重入札(高)':>14}{'加重入札(低)':>14}{'最高入札KW'}")
        for seg in SEG_ORDER:
            if seg not in agg: continue
            d = agg[seg]
            hi = f"{d['wbid_hi']:>10,}円" if d['wbid_hi'] is not None else " " * 11
            lo = f"{d['wbid_lo']:>10,}円" if d['wbid_lo'] is not None else " " * 11
            print(f"{seg:<8}{d['kw_n']:>7,}{d['vol']:>12,}{hi:>14}{lo:>14}  {d['max_hi']:,}円 ({d['max_hi_kw']})")

if __name__ == "__main__":
    main()
