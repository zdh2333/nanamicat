import Foundation

enum L10n {
    static func t(_ key: Key, locale: AppLocale) -> String {
        table[locale]?[key] ?? table[.zh]![key]!
    }

    enum Key: Hashable {
        case appName, kicker, mistakes, shuffle, clear, hint, submit, next, nextAfterComplete, share
        case leaderboard, contribute, settings, playerName, saveName, totalScore, textClears
        case intro, chooseFour, wrong, out, complete, savedScore, needsName, abstractTitle
        case leaderboardLead, contributeLead, emptyLeaderboard, submitPuzzle, puzzleTitle, contactEmail, groupName, wordsPlaceholder, savePuzzle
        case sponsorTitle, sponsorBody, rulesTitle, rulesBody, language, theme, themeFooter, recent, pendingSaved
    }

    private static let table: [AppLocale: [Key: String]] = [
        .zh: [
            .appName: "四格寻踪",
            .kicker: "每日分类谜题",
            .mistakes: "失误",
            .shuffle: "打乱",
            .clear: "取消",
            .hint: "提示",
            .submit: "提交",
            .next: "换一题",
            .nextAfterComplete: "下一题",
            .share: "分享结果",
            .leaderboard: "排行榜",
            .contribute: "贡献谜题",
            .settings: "设置",
            .playerName: "昵称",
            .saveName: "保存昵称",
            .totalScore: "总分",
            .textClears: "文字通关",
            .intro: "找出四组隐藏关联，每组四个项目。",
            .chooseFour: "请先选择 4 个项目再提交。",
            .wrong: "这四个项目不在同一组，再试一次。",
            .out: "失误次数已用完，继续尝试完成本题。",
            .complete: "四组全部找到了。",
            .savedScore: "成绩已写入排行榜。",
            .needsName: "设置昵称后会把通关写入排行榜。",
            .abstractTitle: "本题最抽象的一组",
            .leaderboardLead: "留下昵称后，通关可累计积分。",
            .contributeLead: "最少填写 1 组，每组 4 个词，投稿会先进入 pending 状态。",
            .emptyLeaderboard: "还没有成绩，先通关一题。",
            .submitPuzzle: "提交谜题",
            .puzzleTitle: "谜题标题",
            .contactEmail: "联系邮箱（可选）",
            .groupName: "组名",
            .wordsPlaceholder: "4 个词，用逗号分隔",
            .savePuzzle: "提交到后台",
            .sponsorTitle: "喜欢这个小游戏，可以请我喝杯咖啡。",
            .sponsorBody: "微信扫码赞助，支持继续做中文题库。",
            .rulesTitle: "玩法说明",
            .rulesBody: "从 16 个项目中找出 4 组，每组 4 个。选中 4 个后点提交。最多 4 次失误。",
            .language: "语言",
            .theme: "主题",
            .themeFooter: "Morandi 低饱和配色，全 App 统一生效。",
            .recent: "最近",
            .pendingSaved: "投稿已保存为待审核。"
        ],
        .en: [
            .appName: "FourFind",
            .kicker: "Daily category puzzle",
            .mistakes: "Mistakes",
            .shuffle: "Shuffle",
            .clear: "Clear",
            .hint: "Hint",
            .submit: "Submit",
            .next: "Next puzzle",
            .nextAfterComplete: "Next puzzle",
            .share: "Share",
            .leaderboard: "Leaderboard",
            .contribute: "Contribute",
            .settings: "Settings",
            .playerName: "Nickname",
            .saveName: "Save name",
            .totalScore: "Score",
            .textClears: "Text clears",
            .intro: "Find four hidden groups of four.",
            .chooseFour: "Select four items before submitting.",
            .wrong: "Those four items are not in the same group.",
            .out: "No mistakes left. Keep trying.",
            .complete: "All four groups found.",
            .savedScore: "Score saved to the leaderboard.",
            .needsName: "Set a nickname to save your score.",
            .abstractTitle: "Most abstract group",
            .leaderboardLead: "Set a nickname to save your puzzle score.",
            .contributeLead: "Submit at least one group with four words. Review status starts as pending.",
            .emptyLeaderboard: "No scores yet. Clear a puzzle first.",
            .submitPuzzle: "Submit puzzle",
            .puzzleTitle: "Puzzle title",
            .contactEmail: "Contact email (optional)",
            .groupName: "Group name",
            .wordsPlaceholder: "Four words, comma separated",
            .savePuzzle: "Submit",
            .sponsorTitle: "Enjoy the game? Buy me a coffee.",
            .sponsorBody: "Scan to sponsor via WeChat.",
            .rulesTitle: "Rules",
            .rulesBody: "Find four groups of four from sixteen items. You get four mistakes.",
            .language: "Language",
            .theme: "Theme",
            .themeFooter: "Morandi muted palettes apply across the whole app.",
            .recent: "Recent",
            .pendingSaved: "Submission saved as pending."
        ]
    ]
}
