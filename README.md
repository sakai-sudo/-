# 運用ドキュメント置き場

リスティング広告（Google / Yahoo!）運用の分析レポート・入稿物を案件ごとに置くリポジトリ。

## 構成

| パス | 中身 |
|---|---|
| [`projects/`](projects/) | 案件（ジャンル）ごとの成果物 |
| [`docs/`](docs/) | 案件横断の規約・ナレッジ |
| [`tools/`](tools/) | 整理スクリプトなど |

ファイル名とフォルダの決め方は [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) を参照。

## ローカルPCの整理

ダウンロード / デスクトップに溜まったファイルを、上の規約と同じ考え方で案件別に仕分けるスクリプト。
既定はドライランで、`--apply` を付けたときだけ動く。移動は CSV に記録され `--undo` で全て戻せる。

```sh
python3 tools/organize.py ~/Downloads           # 下見（何も動かない）
python3 tools/organize.py ~/Downloads --apply   # 実行
python3 tools/organize.py --undo ~/Downloads/_整理ログ/organize_XXXXXXXX_XXXXXX.csv
```

Windows は `python3` を `py` に読み替える。案件を増やすときは `tools/organize.py` 冒頭の `GENRES` に1行足す。

## 案件一覧

### カメラ買取 (`projects/camera-kaitori/`)

| 日付 | 成果物 |
|---|---|
| 2026-05-29 | [検索語句分析レポート](projects/camera-kaitori/2026-05-29_search-query-report.md)（Yahoo!広告 / CPA 23,288円・CV0コスト148万円の指摘） |
| 2026-05-29 | [除外キーワード案](projects/camera-kaitori/2026-05-29_negative-keywords.csv)（28語・推定削減 約16万円） |
