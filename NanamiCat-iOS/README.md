# NanamiCat iOS（喵格谜 / MeowGrid）

Native SwiftUI client for MeowGrid — the NanamiCat daily category puzzle.

## Open in Xcode

```bash
open NanamiCat-iOS/NanamiCat.xcodeproj
```

Regenerate the project file after adding Swift or resource files:

```bash
python3 NanamiCat-iOS/generate_xcodeproj.py
```

## Requirements

- Xcode 16+
- iOS 17+ deployment target
- Backend: `https://nanamicat.com`

## Structure

- `NanamiCat/App` — entry, splash gate, tab shell
- `NanamiCat/Features` — Game, Leaderboard, Contribute, Settings
- `NanamiCat/Core` — puzzle engine, API, persistence, ads (splash prep)
- `NanamiCat/DesignSystem` — palette, haptics, copy
- `NanamiCat/Resources` — `puzzle-data.json`, Assets

## Splash ads (future)

Cold start flows through `SplashGateView` → `SplashAdCoordinator`.

1. Implement `SplashAdServing` for your network (e.g. Google AdMob app open ad).
2. Set `SplashAdConfiguration.current` to `enabled: true` and the matching `provider`.
3. Add SDK via SPM, `GADApplicationIdentifier` / SKAdNetwork IDs in Info.plist, and call `ATTrackingManager.requestTrackingAuthorization` before loading if required.

Until then, users see a ~1s brand splash (Nanami + app name) with no third-party ads.

## Docs

- [docs/ios-requirements.md](../docs/ios-requirements.md)
- [docs/DESIGN.md](../docs/DESIGN.md)
- [docs/puzzle-port-spec.md](../docs/puzzle-port-spec.md)
- Prototypes: [docs/prototypes/](../docs/prototypes/)

## Puzzle data sync

When Web `src/main.jsx` puzzle banks change:

```bash
node scripts/export-puzzle-data.mjs
node scripts/export-puzzle-port-spec.mjs
python3 NanamiCat-iOS/generate_xcodeproj.py
```

## TestFlight checklist

- [ ] Set Development Team in Xcode signing
- [ ] App Icon in Assets.xcassets
- [ ] Privacy policy URL for App Store Connect
- [ ] Screenshots from direction C (Soft Geometry) or chosen design
