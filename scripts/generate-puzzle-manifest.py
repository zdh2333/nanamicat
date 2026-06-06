#!/usr/bin/env python3
"""
按 docs/puzzle-generation-spec.md v2 规则生成 NanamiCat 100 道文字题。

输入：现有 puzzle-data.json（40 组，无 id）
输出：v2 完整 manifest JSON（带 id 的 bank + 100 条 manifest）

使用：
    python3 scripts/generate-puzzle-manifest.py \
        --input NanamiCat-iOS/NanamiCat/Resources/puzzle-data.json \
        --output /tmp/text-puzzle-manifest-v2.json
"""

import argparse
import json
import sys
from pathlib import Path


# 40 个组的 slug（与现网 name 一一对应，按 manifest 顺序）
SLUG_FOR_NAME = {
    # Level 1
    "早餐主食": "breakfast-staples",
    "火锅食材": "hotpot-ingredients",
    "传统节日": "traditional-festivals",
    "中国城市": "chinese-cities",
    "出行方式": "travel-modes",
    "厨房工具": "kitchen-tools",
    "校园空间": "campus-spaces",
    "水果": "fruits",
    "颜色": "colors",
    "衣物": "clothing",
    "运动项目": "sports",
    "乐器": "musical-instruments",
    # Level 2
    "古代书写材料": "ancient-writing-materials",
    "网络互动": "social-interactions",
    "电影镜头": "film-shots",
    "项目流程": "project-workflow",
    "系统状态": "system-states",
    "安全动作": "security-actions",
    "叙事结构": "narrative-structure",
    "城市设施": "urban-fixtures",
    # Level 3
    "不可见成本": "hidden-costs",
    "反馈类型": "feedback-types",
    "边界动作": "boundary-actions",
    "秩序形成": "order-formation",
    "连接两端": "bridges-between",
    "容器与被容纳": "containers-and-contents",
    "镜像与对称": "mirror-symmetry",
    "身份凭证": "identity-credentials",
    "压缩的信息": "compressed-information",
    "表面隐藏结构": "surface-hides-structure",
    # Level 4
    "以限制制造自由": "limits-create-freedom",
    "把连续切成离散": "divide-continuum-into-discrete",
    "先承诺后兑现": "promise-then-deliver",
    "自身也是地图": "map-of-itself",
    "用失败校准成功": "calibrate-via-failure",
    "把关系伪装成物": "relations-as-objects",
    "被观看改变自身": "observed-changes-self",
    "用重复制造差异": "repetition-creates-difference",
    "局部代表整体": "parts-represent-whole",
    "秩序依赖例外": "order-needs-exceptions",
}


def assign_ids(bank):
    """为每个组补 id 字段（用 SLUG_FOR_NAME 映射）。"""
    seen = set()
    out = []
    for g in bank:
        slug = SLUG_FOR_NAME.get(g["name"])
        if not slug:
            print(f"WARN: 无 slug 映射：{g['name']}", file=sys.stderr)
            slug = g["name"]
        if slug in seen:
            raise ValueError(f"slug 冲突: {slug}")
        seen.add(slug)
        out.append({**g, "id": slug})
    return out


def select_manifest(bank, themes, herrings, per_difficulty=25):
    """按 §3.5-3.6 算法生成 manifest。

    在保证规范约束（unique canonicalKey / level ≤ D / D≥2 含 high level）的前提下，
    采用「**枚举所有合法 4-组合，优先选 usage 总和最小且未用过的 key**」策略，
    让 40 个组被引用的次数尽量均匀，避免某组在所有档位题里都被优先选中。
    """
    import itertools

    bank_by_id = {g["id"]: g for g in bank}
    used_keys = set()
    manifest = []
    usage = {g["id"]: 0 for g in bank}  # 记录每组被引用次数

    for D in range(1, 5):
        if D == 1:
            pool_ids = sorted([g["id"] for g in bank if g["level"] == 1])
            need_high = False
        else:
            pool_ids = sorted([g["id"] for g in bank if g["level"] <= D])
            need_high = True

        # 软约束：保证难度递进平滑（D=2/D=3 必须含至少 1 个「比 high 更低 level」的锚点组）
        # D=1 全具象 / D=2 至少 1 个 level-1 / D=3 至少 1 个 level-1 或 level-2 / D=4 自由
        if D == 1:
            soft_max_level = 1
        elif D == 2:
            soft_max_level = 1
        elif D == 3:
            soft_max_level = 2
        else:
            soft_max_level = D  # D=4 不加约束

        # 预先枚举所有 4-组合，过滤硬约束 + 软约束
        all_combos = list(itertools.combinations(pool_ids, 4))
        valid_combos = []
        for combo in all_combos:
            if need_high and not any(bank_by_id[g]["level"] == D for g in combo):
                continue
            if not any(bank_by_id[g]["level"] <= soft_max_level for g in combo):
                continue
            valid_combos.append(combo)

        picked_this_d = 0

        for _ in range(per_difficulty):
            # 在所有未用 key 中选 usage 总和最小的一个
            best_key = None
            best_ids = None
            best_total = float("inf")
            for combo in valid_combos:
                sorted_ids = sorted(combo, key=lambda i: (bank_by_id[i]["level"], i))
                key = "|".join(sorted_ids)
                if key in used_keys:
                    continue
                total = sum(usage[g] for g in combo)
                if total < best_total:
                    best_total = total
                    best_key = key
                    best_ids = sorted_ids
                    if total == 0:
                        # 4 个组全 0 引用，理想选择；直接 break
                        pass
            if best_ids is None:
                raise RuntimeError(
                    f"D={D} 已无未用合法组合（picked={picked_this_d}/{per_difficulty}）。"
                )

            used_keys.add(best_key)
            for g in best_ids:
                usage[g] += 1
            manifest.append({
                "difficulty": D,
                "theme": themes[len(manifest) % len(themes)],
                "redHerring": herrings[len(manifest) % len(herrings)],
                "groupIds": best_ids,
            })
            picked_this_d += 1

    return manifest


def validate(manifest, bank):
    """复刻 spec §5 检查清单。"""
    bank_by_id = {g["id"]: g for g in bank}
    errors = []

    # bank 自检
    bank_ids = set()
    for g in bank:
        if g["id"] in bank_ids:
            errors.append(f"bank id 重复: {g['id']}")
        bank_ids.add(g["id"])
        if not (1 <= g["level"] <= 4):
            errors.append(f"{g['id']}: level 越界 {g['level']}")
        if len(g["words"]) != 4:
            errors.append(f"{g['id']}: words 非 4 个")
        if any(w.endswith(("甲", "乙", "丙", "丁")) for w in g["words"]):
            errors.append(f"{g['id']}: 词尾带甲乙丙丁")

    # manifest 自检
    if len(manifest) != 100:
        errors.append(f"manifest 长度 {len(manifest)} != 100")

    used_keys = set()
    for i, entry in enumerate(manifest):
        n = i + 1
        expected_d = min(4, (i // 25) + 1)
        if entry["difficulty"] != expected_d:
            errors.append(f"text-{n:03d}: difficulty {entry['difficulty']} != {expected_d}")
        if len(entry["groupIds"]) != 4:
            errors.append(f"text-{n:03d}: groupIds 非 4 个")
        if len(set(entry["groupIds"])) != 4:
            errors.append(f"text-{n:03d}: groupIds 含重复")
        for gid in entry["groupIds"]:
            if gid not in bank_by_id:
                errors.append(f"text-{n:03d}: 未知 group {gid}")
            elif bank_by_id[gid]["level"] > entry["difficulty"]:
                errors.append(f"text-{n:03d}: group {gid} level {bank_by_id[gid]['level']} > D {entry['difficulty']}")
        if entry["difficulty"] >= 2:
            high = {g["id"] for g in bank if g["level"] == entry["difficulty"]}
            if not any(g in high for g in entry["groupIds"]):
                errors.append(f"text-{n:03d}: D={entry['difficulty']} 缺 level-{entry['difficulty']} 组")
        key = "|".join(sorted(entry["groupIds"]))
        if key in used_keys:
            errors.append(f"text-{n:03d}: 重复 canonicalKey {key}")
        used_keys.add(key)

    return errors


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="原 puzzle-data.json")
    ap.add_argument("--output", required=True, help="输出 v2 JSON 路径")
    args = ap.parse_args()

    src = json.loads(Path(args.input).read_text(encoding="utf-8"))
    bank = assign_ids(src["textGroupBank"])
    themes = src.get("puzzleThemes") or ["默认主题"]
    herrings = src.get("redHerringNotes") or ["默认提示"]

    print(f"题组数: {len(bank)}（按 level: 1={sum(1 for g in bank if g['level']==1)}, "
          f"2={sum(1 for g in bank if g['level']==2)}, "
          f"3={sum(1 for g in bank if g['level']==3)}, "
          f"4={sum(1 for g in bank if g['level']==4)}）")
    print(f"themes: {len(themes)}, redHerrings: {len(herrings)}")

    manifest = select_manifest(bank, themes, herrings)

    errors = validate(manifest, bank)
    if errors:
        print("VALIDATION FAILED:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        sys.exit(1)

    print(f"OK: 100 道题全部生成且唯一")

    # 输出：保留原文件所有顶层字段，把 bank 替换为带 id 的版本，
    # 添加 textPuzzleManifest，移除旧的 puzzles: []
    out = {
        **src,
        "textGroupBank": bank,
        "textPuzzleManifest": manifest,
    }
    out.pop("puzzles", None)

    Path(args.output).write_text(
        json.dumps(out, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"已写入 {args.output}")


if __name__ == "__main__":
    main()
