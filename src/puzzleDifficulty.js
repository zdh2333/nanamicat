const difficultyLabels = {
  zh: {
    label: "综合难度",
    values: {
      1: "直观分类",
      2: "常识联想",
      3: "跨域关系",
      4: "细节线索"
    }
  },
  en: {
    label: "Overall difficulty",
    values: {
      1: "Direct sets",
      2: "Familiar links",
      3: "Cross-domain",
      4: "Detail clues"
    }
  },
  ja: {
    label: "総合難易度",
    values: {
      1: "わかりやすい分類",
      2: "なじみのある連想",
      3: "分野をまたぐ関係",
      4: "細かいヒント"
    }
  }
};

function clampDifficulty(value) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(4, Math.max(1, Math.round(value)));
}

export function puzzleDifficultyLevel(puzzle) {
  const explicit = Number(puzzle?.difficulty);
  if (Number.isFinite(explicit)) return clampDifficulty(explicit);

  const levels = (puzzle?.groups || [])
    .map((group) => Number(group?.level))
    .filter(Number.isFinite);
  if (!levels.length) return 1;

  return clampDifficulty(levels.reduce((sum, level) => sum + level, 0) / levels.length);
}

export function puzzleDifficultySummary(puzzle, locale = "en") {
  const level = puzzleDifficultyLevel(puzzle);
  const labels = difficultyLabels[locale] || difficultyLabels.en;
  return {
    level,
    label: labels.label,
    value: labels.values[level]
  };
}
