#!/usr/bin/env python3
"""関東集計を色付きHTMLダッシュボードに出力（ブラウザで閲覧）。"""
import os
from analyze_bids import read_csv, aggregate

KANTO = [("ibaraki","茨城"),("tochigi","栃木"),("gunma","群馬"),
         ("saitama","埼玉"),("chiba","千葉"),("tokyo","東京"),("kanagawa","神奈川")]
SEGMENTS = ["害虫","シロアリ","ハチ","害獣","ねずみ","水漏れ","雨漏り","ガラス","カギ"]
GROUP = {"害虫":"害虫系","シロアリ":"害虫系","ハチ":"害虫系","害獣":"害獣系","ねずみ":"害獣系",
         "水漏れ":"水回り","雨漏り":"水回り","ガラス":"住まい","カギ":"住まい"}

def load():
    data = {}
    for fn, jp in KANTO:
        p = f"data/kwp_{fn}.csv"
        if os.path.exists(p):
            data[jp] = aggregate(read_csv(p))
    return data

def heat(t):  # t in [0,1] -> 白→濃緑 の背景色 + 文字色
    t = max(0.0, min(1.0, t))
    r = int(232 - t * (232 - 22)); g = int(245 - t * (245 - 120)); b = int(233 - t * (233 - 60))
    fg = "#fff" if t > 0.55 else "#1a3320"
    return f"background:rgb({r},{g},{b});color:{fg}"

def main():
    data = load()
    regions = list(data.keys())

    # スコア計算
    recs = []
    for r in regions:
        for seg in SEGMENTS:
            d = data[r].get(seg, {})
            bid = d.get("wbid_hi") or 0; vol = d.get("vol") or 0
            recs.append({"seg": seg, "region": r, "bid": bid, "vol": vol,
                         "blo": d.get("wbid_lo") or 0, "ms": bid*vol})
    max_ms = max(x["ms"] for x in recs) or 1
    for x in recs:
        x["score"] = round(x["ms"]/max_ms*100)
    cell = {(x["region"], x["seg"]): x for x in recs}

    def row_minmax(key):
        mm = {}
        for seg in SEGMENTS:
            vals = [cell[(r, seg)][key] for r in regions]
            mm[seg] = (min(vals), max(vals))
        return mm

    h = []
    A = h.append
    A("<!doctype html><html lang='ja'><head><meta charset='utf-8'>")
    A("<meta name='viewport' content='width=device-width,initial-scale=1'>")
    A("<title>関東 開拓優先度ダッシュボード</title>")
    A("""<style>
    body{font-family:-apple-system,'Hiragino Kaku Gothic ProN','Noto Sans JP',Meiryo,sans-serif;
         margin:0;padding:24px;background:#f6f8fa;color:#24292f;}
    h1{font-size:22px;margin:0 0 4px} .sub{color:#57606a;font-size:13px;margin-bottom:20px}
    h2{font-size:17px;margin:28px 0 10px;border-left:4px solid #22a058;padding-left:8px}
    table{border-collapse:collapse;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08);font-size:13px}
    th,td{border:1px solid #e3e6ea;padding:6px 10px;text-align:center;white-space:nowrap}
    th{background:#22543d;color:#fff;font-weight:600} td.lbl{text-align:left;font-weight:600;background:#f0f3f5}
    td.grp{writing-mode:vertical-rl;background:#eef6f0;color:#22543d;font-weight:700;font-size:12px}
    .rank td{font-size:13px}.rank .bar{font-family:monospace;letter-spacing:-1px}
    .note{color:#57606a;font-size:12px;margin:6px 0 0}
    .pill{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:700;color:#fff}
    </style></head><body>""")
    A("<h1>関東7都県 開拓優先度ダッシュボード</h1>")
    A("<div class='sub'>データ：Googleキーワードプランナー（2025/5–2026/4・地域別）／指標：入札(高)＝加重平均CPC、検索計＝月間需要、スコア＝入札×需要を0–100正規化。<b>濃いマスほど開拓妙味が大</b>。</div>")

    # --- 1. 優先度ランキング TOP20 ---
    A("<h2>① 開拓優先度ランキング TOP20（スコア＝入札×需要）</h2>")
    A("<table class='rank'><tr><th>順位</th><th>スコア</th><th>ヒート</th><th>分類</th><th>セグメント</th><th>地域</th><th>入札(高)</th><th>月間検索計</th></tr>")
    ranked = sorted(recs, key=lambda x: x["score"], reverse=True)[:20]
    for i, x in enumerate(ranked, 1):
        t = x["score"]/100
        bars = "█"*round(t*16)
        A(f"<tr><td>{i}</td><td style='{heat(t)};font-weight:700'>{x['score']}</td>"
          f"<td class='bar' style='color:#22a058'>{bars}</td><td>{GROUP[x['seg']]}</td>"
          f"<td class='lbl'>{x['seg']}</td><td>{x['region']}</td>"
          f"<td>{x['bid']:,}円</td><td>{x['vol']:,}</td></tr>")
    A("</table>")

    # --- 2. 入札(高) ヒートマップ ---
    A("<h2>② 入札(高) ヒートマップ（円・セグメント内で色分け）</h2>")
    bmm = row_minmax("bid")
    A("<table><tr><th>分類</th><th>セグメント</th>"+"".join(f"<th>{r}</th>" for r in regions)+"<th>関東平均</th></tr>")
    prev_g = None
    for seg in SEGMENTS:
        g = GROUP[seg]
        A("<tr>")
        if g != prev_g:
            span = sum(1 for s in SEGMENTS if GROUP[s]==g)
            A(f"<td class='grp' rowspan='{span}'>{g}</td>"); prev_g = g
        A(f"<td class='lbl'>{seg}</td>")
        lo, hi = bmm[seg]; vals=[]
        for r in regions:
            v = cell[(r,seg)]["bid"]; vals.append(v)
            t = (v-lo)/(hi-lo) if hi>lo else 0
            A(f"<td style='{heat(t)}'>{v:,}</td>")
        num=sum(cell[(r,seg)]["bid"]*cell[(r,seg)]["vol"] for r in regions)
        den=sum(cell[(r,seg)]["vol"] for r in regions)
        A(f"<td class='lbl'>{round(num/den) if den else 0:,}</td></tr>")
    A("</table>")
    A("<div class='note'>各行（セグメント）内で最安=白〜最高=濃緑。行内の濃いマス＝そのセグメントで最も入札が積まれている＝高単価業者が多い県。</div>")

    # --- 3. 月間検索計 ヒートマップ ---
    A("<h2>③ 月間検索計 ヒートマップ（需要規模・セグメント内で色分け）</h2>")
    vmm = row_minmax("vol")
    A("<table><tr><th>分類</th><th>セグメント</th>"+"".join(f"<th>{r}</th>" for r in regions)+"<th>関東計</th></tr>")
    prev_g=None
    for seg in SEGMENTS:
        g=GROUP[seg]; A("<tr>")
        if g!=prev_g:
            span=sum(1 for s in SEGMENTS if GROUP[s]==g)
            A(f"<td class='grp' rowspan='{span}'>{g}</td>"); prev_g=g
        A(f"<td class='lbl'>{seg}</td>")
        lo,hi=vmm[seg]; tot=0
        for r in regions:
            v=cell[(r,seg)]["vol"]; tot+=v
            t=(v-lo)/(hi-lo) if hi>lo else 0
            A(f"<td style='{heat(t)}'>{v:,}</td>")
        A(f"<td class='lbl'>{tot:,}</td></tr>")
    A("</table>")

    # --- 4. 穴場 ---
    A("<h2>④ 穴場（需要は中央値以上 × 入札が最安）</h2>")
    import statistics
    A("<table><tr><th>セグメント</th><th>穴場の県</th><th>入札(高)</th><th>月間検索計</th><th>最高入札県との差</th></tr>")
    for seg in SEGMENTS:
        vs=[(r,cell[(r,seg)]["vol"],cell[(r,seg)]["bid"]) for r in regions]
        med=statistics.median([v for _,v,_ in vs])
        cand=[(r,v,b) for r,v,b in vs if v>=med and b>0]
        if not cand: continue
        a=min(cand,key=lambda x:x[2]); top=max(b for _,_,b in vs)
        A(f"<tr><td class='lbl'>{seg}</td><td>{a[0]}</td><td>{a[2]:,}円</td>"
          f"<td>{a[1]:,}</td><td style='color:#c00'>-{top-a[2]:,}円</td></tr>")
    A("</table>")
    A("<div class='note'>関東は都市部が大きいため穴場も相対評価。全国（四国・高知等）を入れると低単価×高需要がより明確に。</div>")
    A("<p class='sub' style='margin-top:24px'>生成：make_dashboard.py　／　集計：analyze_bids.py</p>")
    A("</body></html>")

    open("out/kanto_dashboard.html","w",encoding="utf-8").write("\n".join(h))
    print("wrote out/kanto_dashboard.html")

if __name__ == "__main__":
    main()
