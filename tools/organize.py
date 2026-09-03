#!/usr/bin/env python3
"""ダウンロード/デスクトップに溜まったファイルを案件別・種別別に仕分ける。

デフォルトはドライラン（何も動かさず、やることを表示するだけ）。
実行するときだけ --apply を付ける。全ての移動は CSV ログに残り、--undo で元に戻せる。

    python3 organize.py ~/Downloads              # 下見
    python3 organize.py ~/Downloads --apply      # 実行
    python3 organize.py --undo ~/Downloads/_整理ログ/organize_20260903_120000.csv
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import shutil
import sys
from collections import defaultdict
from pathlib import Path

# ── 仕分けルール ────────────────────────────────────────────────
# 上から順に評価し、最初に当たったものを採用する。
# 案件を増やすときはこの表にジャンル名と検出キーワードを足すだけでよい。

GENRES: list[tuple[str, tuple[str, ...]]] = [
    ("カメラ買取", ("カメラ買取", "camera")),
    ("金買取", ("金買取", "ザ・ゴールド", "大吉")),
    ("毛皮買取", ("毛皮",)),
    ("着物買取", ("着物",)),
    ("スマホ買取", ("スマホ買取", "iPhone買取")),
    ("宅食", ("宅食",)),
    ("ドッグフード", ("ドッグフード",)),
    ("低用量ピル", ("低用量ピル", "ピル", "メデリ", "スマルナ", "エニピル")),
    ("GLP-1", ("GLP-1", "GLP1", "リベルサス", "マンジャロ")),
    ("ED治療", ("ED治療", "レバクリ", "eLife")),
    ("心療内科", ("心療内科", "睡眠薬", "睡眠治療", "mentalclinic")),
    ("新電力", ("新電力",)),
    ("解体", ("解体",)),
    ("不動産投資", ("不動産投資",)),
    ("蓄電池", ("蓄電池",)),
    ("転職", ("転職",)),
]

# 成果物の種別。ジャンルが特定できたファイルはこの下に入る。
KINDS: list[tuple[str, tuple[str, ...]]] = [
    ("検索語句分析", ("検索語句", "検索クエリ", "サーチターム")),
    ("入稿物", ("入稿", "コピペ", "RSA", "AdsEditor")),
    ("除外KW", ("除外", "ネガティブ", "negative")),
    ("設計・調査", ("設計", "ペルソナ", "調査", "シミュレーション", "分析")),
    ("レポート", ("レポート", "report", "収支", "実績")),
]

# ジャンルが特定できなかったファイルは拡張子で振り分ける。
EXT_BUCKETS: dict[str, tuple[str, ...]] = {
    "表計算": (".csv", ".tsv", ".xlsx", ".xls", ".xlsm", ".numbers"),
    "文書": (".pdf", ".docx", ".doc", ".md", ".txt", ".rtf", ".pages"),
    "スライド": (".pptx", ".ppt", ".key"),
    "画像": (".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic", ".svg"),
    "動画音声": (".mp4", ".mov", ".avi", ".mp3", ".wav", ".m4a"),
    "圧縮": (".zip", ".rar", ".7z", ".tar", ".gz", ".dmg"),
    "その他": (),
}

SKIP_NAMES = {".DS_Store", "Thumbs.db", "desktop.ini", ".localized"}
LOG_DIR_NAME = "_整理ログ"
ARCHIVE_AFTER_DAYS = 365


def classify(path: Path, today: dt.date) -> Path:
    """ファイルの相対的な移動先フォルダを返す。"""
    name = path.name
    lowered = name.lower()

    for genre, keys in GENRES:
        if any(k.lower() in lowered for k in keys):
            for kind, kind_keys in KINDS:
                if any(k.lower() in lowered for k in kind_keys):
                    return Path("01_案件") / genre / kind
            return Path("01_案件") / genre / "その他"

    mtime = dt.date.fromtimestamp(path.stat().st_mtime)
    if (today - mtime).days > ARCHIVE_AFTER_DAYS:
        return Path("03_アーカイブ") / str(mtime.year)

    ext = path.suffix.lower()
    for bucket, exts in EXT_BUCKETS.items():
        if ext in exts:
            return Path("02_資料") / bucket
    return Path("02_資料") / "その他"


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def unique_destination(dest: Path) -> Path:
    """同名ファイルがあれば連番を付けて衝突を避ける。上書きは絶対にしない。"""
    if not dest.exists():
        return dest
    stem, suffix = dest.stem, dest.suffix
    for n in range(2, 1000):
        candidate = dest.with_name(f"{stem}_{n}{suffix}")
        if not candidate.exists():
            return candidate
    raise RuntimeError(f"移動先が決められません: {dest}")


def collect(root: Path) -> list[Path]:
    """ルート直下のファイルだけを対象にする。既存のフォルダの中身は触らない。"""
    files = []
    for entry in sorted(root.iterdir()):
        if entry.is_dir() or entry.name in SKIP_NAMES or entry.name.startswith("."):
            continue
        files.append(entry)
    return files


def organize(root: Path, apply: bool) -> int:
    today = dt.date.today()
    files = collect(root)
    if not files:
        print(f"{root} の直下に移動対象のファイルはありません。")
        return 0

    plan: list[tuple[Path, Path]] = []
    by_folder: dict[Path, int] = defaultdict(int)
    for f in files:
        target_dir = classify(f, today)
        plan.append((f, root / target_dir / f.name))
        by_folder[target_dir] += 1

    print(f"対象: {len(files)} 件 ({root})\n")
    print("── 移動先の内訳 " + "─" * 40)
    for folder in sorted(by_folder, key=lambda p: (-by_folder[p], str(p))):
        print(f"  {by_folder[folder]:4d} 件  {folder}")

    dupes: dict[str, list[Path]] = defaultdict(list)
    for f in files:
        try:
            if f.stat().st_size == 0:  # 空ファイル同士は「同一」でも報告する意味がない
                continue
            dupes[digest(f)].append(f)
        except OSError:
            continue
    collisions = {h: ps for h, ps in dupes.items() if len(ps) > 1}
    if collisions:
        print("\n── 中身が同一のファイル " + "─" * 32)
        print("  ※ 自動削除はしません。目視で確認してください。")
        for paths in collisions.values():
            print("  ・" + "\n    ".join(p.name for p in paths))

    if not apply:
        print("\nドライランです。実行するには --apply を付けてください。")
        return 0

    log_dir = root / LOG_DIR_NAME
    log_dir.mkdir(exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path = log_dir / f"organize_{stamp}.csv"

    moved = 0
    with log_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["from", "to"])
        for src, dest in plan:
            dest.parent.mkdir(parents=True, exist_ok=True)
            final = unique_destination(dest)
            shutil.move(str(src), str(final))
            writer.writerow([str(src), str(final)])
            moved += 1

    print(f"\n{moved} 件を移動しました。")
    print(f"元に戻す: python3 {Path(__file__).name} --undo '{log_path}'")
    return 0


def undo(log_path: Path) -> int:
    with log_path.open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))

    restored = 0
    for row in reversed(rows):
        src, dest = Path(row["from"]), Path(row["to"])
        if not dest.exists():
            print(f"見つかりません（スキップ）: {dest}")
            continue
        src.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(dest), str(unique_destination(src)))
        restored += 1

    print(f"{restored} 件を元の場所に戻しました。")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("target", nargs="?", type=Path, help="整理するフォルダ（例: ~/Downloads）")
    parser.add_argument("--apply", action="store_true", help="実際に移動する（既定はドライラン）")
    parser.add_argument("--undo", type=Path, metavar="LOG", help="実行ログのCSVを指定して移動を取り消す")
    args = parser.parse_args()

    if args.undo:
        if not args.undo.is_file():
            parser.error(f"ログが見つかりません: {args.undo}")
        return undo(args.undo)

    if not args.target:
        parser.error("整理するフォルダを指定してください（--undo を使う場合を除く）")
    root = args.target.expanduser().resolve()
    if not root.is_dir():
        parser.error(f"フォルダが見つかりません: {root}")
    return organize(root, args.apply)


if __name__ == "__main__":
    sys.exit(main())
