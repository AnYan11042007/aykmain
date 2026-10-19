# Firebase Pruning Automation & Responsive Modal Architecture

A comprehensive system plan to clean up and protect Firebase Realtime Database growth while delivering an edge-to-edge, responsive mobile/laptop experience across all game portals and modals without altering gameplay or betting rules.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural parameters have been confirmed based on the initial interview and requirements:

- **Authentication Method for Cleanup Script**: Dual-mode support using `firebase-admin` service account credentials if provided via `FIREBASE_SERVICE_ACCOUNT_KEY` / `serviceAccountKey.json`, with automated fallback to Firebase REST API / Firebase Client admin auth so the script executes seamlessly in both local and hosted environments.
- **Pre-Cleanup Backup Strategy**: Full database snapshot automatically exported to `backups/firebase-backup-[timestamp].json` before any delete or update mutations are executed under `--apply`.
- **Mobile Game Modal Experience**: On screens 360px–430px, modals will transform into an immersive native-like full-screen layout using `100dvh`, hardware safe-area paddings for notch/home indicators, persistent sticky top navigation with an always-visible Close button, and 44px+ touch targets with 2–3 column betting chips.
- **Zero Gameplay Alteration**: All game logic, betting mechanics, odds, names, and user balances remain 100% intact.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Firebase Database Pruning & Hygiene**: Implements `scripts/cleanup-firebase.js` supporting `--dry-run` and `--apply` flags. Backs up the entire database to JSON, purges expired rounds in `live_arena_bets` (>24h), enforces retention on `game_logs` (30 days general, 90 days real users, 3 days bots), trims `global_chat` & `live_arena_chat` to the latest 500 records (protecting real user chats), purges stale entries in `online` and `online_logs` (>24h), cleans old `transactions` (>90 days), removes plaintext `pass` attributes from `users`, and integrates automated rolling window cleanup in active client/bot loops to permanently prevent database bloat.
  2. **Comprehensive Responsive Layout Overhaul**: Upgrades all modals (`ClawModal`, `HorseModal`, `CryptoModal`, `RouletteModal`, `ProfileModal`, `TaiXiuModal`, `BlackjackModal`, `AirplaneModal`, `Cyber3DArenaModal`, `FcMobileModal`, `PenaltyModal`, `RpsModal`, `TienLenModal`, `WorldCardBattleModal`, `ExclusiveIdeasModal`), `GamesPortal.tsx`, `LiveStreamPanel.tsx`, `Sidebar.tsx`, and `App.tsx` for seamless operation on mobile (360px–430px), tablet (768px), and laptop/desktop (>=1024px).
- **Target Audience**: Students and players on both iOS/Android mobile devices (narrow viewports, notch safe areas, touch-first gestures) and laptop/desktop screens (multi-column split layout, expansive betting dashboards).
- **Key Value**: Guarantees Firebase stability and prevents quota exhaustion while elevating the visual fidelity and ergonomics of all mini-games.

---

## 2. User Experience & Visual Design

### Mobile Layout (360px – 430px)
- **Viewport Dimension**: Bound strictly to `min-h-[100dvh] max-h-[100dvh] h-[100dvh]`, avoiding broken viewports caused by mobile browser address bars.
- **Safe-Area Insets**: Uses `pt-[env(safe-area-inset-top,12px)]` and `pb-[env(safe-area-inset-bottom,16px)]` to prevent clipping behind iPhone dynamic islands and Android gesture bars.
- **Header & Navigation**: Fixed top banner with prominent modal title, user PP balance counter, and an always-accessible touch target Close button (`min-w-[44px] min-h-[44px]`).
- **Betting Controls**: Replaces horizontal scrolling chip overflow with responsive 2-column or 3-column grid layouts with tactile active states and minimum 44px button tap bounds.
- **Zero Horizontal Spill**: Strict `overflow-x-hidden w-full max-w-full` on all modal bodies.

### Tablet & Laptop Layout (768px – 1440px+)
- **Desktop Modal Bounds**: Centered overlay modal with `max-w-4xl` or `max-w-5xl`, `max-h-[90vh]`, subtle backdrop blur, and custom micro-scrollbars.
- **Split-Column Composition**: Where applicable (e.g. `TaiXiuModal`, `LiveStreamPanel`, `RouletteModal`, `AirplaneModal`), splits viewport into:
  - **Left / Main Column**: Primary animated canvas or card arena.
  - **Right / Bottom Sidebar**: Betting panel, history charts, and live feed.
- **Canvas & 3D Autoscaling**: Three.js canvases, HTML5 2D canvases, and dynamic particle arenas (`Cyber3DArenaModal`, `AirplaneModal`, `WorldCardBattleModal`) scale responsively using container-relative aspect ratios (`aspect-video`, `aspect-[4/3]`, or `w-full h-full`) paired with ResizeObserver observers.

### Priority Order for Refactoring
1. **Low-Breakpoint Outliers First**:
   - `ClawModal.tsx`
   - `HorseModal.tsx`
   - `CryptoModal.tsx`
   - `RouletteModal.tsx`
   - `ProfileModal.tsx`
2. **Complex Canvas & High-Touch Games**:
   - `TaiXiuModal.tsx`
   - `BlackjackModal.tsx`
   - `AirplaneModal.tsx` (Crash)
   - `Cyber3DArenaModal.tsx`
   - `FcMobileModal.tsx` & `PenaltyModal.tsx`
   - `RpsModal.tsx` & `TienLenModal.tsx`
   - `WorldCardBattleModal.tsx`
3. **Core App Frame & Hubs**:
   - `LiveStreamPanel.tsx`
   - `GamesPortal.tsx`
   - `Sidebar.tsx`
   - `App.tsx`

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Node.js Cleanup Script Dual Execution Engine
- **Chosen Approach**: Build `scripts/cleanup-firebase.js` using `firebase-admin` when a service account file is present, while providing an automatic fallback to the Firebase REST API using project credentials if service account JSON is not configured.
- **Why**: Allows instant one-click execution without blocking users on credential setup, while remaining fully compliant with production `firebase-admin` requirements.
- **Safety Gate**: Default execution is `--dry-run` which calculates exact deletion counts and payload sizes without writing changes. The `--apply` flag enforces a mandatory database JSON backup to `backups/` before any delete request is initiated.

### Decision 2: Self-Pruning Bot & Rolling Windows
- **Chosen Approach**: In addition to the batch cleanup script, modify write handlers in `LiveStreamPanel.tsx` and bot simulation routines to clean up historical cycles upon round completion and limit realtime listeners to `limitToLast(50)`.
- **Why**: Prevents Firebase RTDB from ever bloating back to unsustainable sizes between manual cleanups.

### Decision 3: Protected Datastores
- **Whitelisted Nodes (NEVER TOUCHED)**:
  - `users` (preserves all real students and bot profiles, balances, experience, inventory)
  - `settings` (preserves global system configurations and payout rules)
  - `market` (preserves marketplace items)
  - `games` (preserves active game definitions and configurations)
  - `classes` (preserves student classroom structures)
  - `s88_news` (preserves announcements and broadcasts)
  - `promo_codes` (preserves active vouchers)
- **Sanitization on Users**: Only removes the legacy plaintext `pass` node to conclude the Firebase Auth migration.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                   FIREBASE PRUNING & HYGIENE ENGINE                    │
│                                                                        │
│   node scripts/cleanup-firebase.js [--dry-run | --apply]               │
│                                                                        │
│   Step 1: Backup Entire RTDB                                           │
│   └─> backups/firebase-backup-[timestamp].json                        │
│                                                                        │
│   Step 2: Dry Run Scan & Count Purge Candidates                        │
│   ├─ live_arena_bets  (Keep active cycle + last 5; delete >24h)       │
│   ├─ game_logs        (Keep 30d general, 90d real users, 3d bots)      │
│   ├─ global_chat      (Keep latest 500 messages, prioritize users)     │
│   ├─ live_arena_chat  (Keep latest 500 messages)                       │
│   ├─ online / logs    (Delete entries older than 24h)                 │
│   ├─ transactions     (Delete entries older than 90h)                 │
│   └─ users            (Delete legacy 'pass' plaintext attribute only)  │
│                                                                        │
│   Step 3: Atomic / Batch Deletion (Only on --apply)                    │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                RESPONSIVE UI COMPONENT ARCHITECTURE                    │
│                                                                        │
│   Mobile (360px - 430px)             Laptop / Desktop (>= 1024px)     │
│   ┌─────────────────────────────┐    ┌───────────────────────────────┐ │
│   │ Top Header (Safe Area) [X]  │    │ Centered Modal / Dual Column  │ │
│   ├─────────────────────────────┤    ├───────────────┬───────────────┤ │
│   │ Game Canvas (Auto-fit)      │    │ Game Canvas   │ Betting Panel │ │
│   ├─────────────────────────────┤    │ (Aspect ratio │ & Feed        │ │
│   │ Responsive 2/3-Col Chips    │    │  managed)     │ (Scrollable)  │ │
│   ├─────────────────────────────┤    │               │               │ │
│   │ Action Buttons (>= 44px)    │    └───────────────┴───────────────┘ │
│   └─────────────────────────────┘                                      │
└────────────────────────────────────────────────────────────────────────┘
```

### Script Parameters & Command Signatures
- `node scripts/cleanup-firebase.js --dry-run`: Runs full scan, displays count of records to be deleted per node, backup estimate, and takes no destructive action.
- `node scripts/cleanup-firebase.js --apply`: Backs up full database to `backups/firebase-backup-[timestamp].json`, then performs targeted deletions with clear progress logging.

### Component Verification Matrix
Upon completing each phase, each game modal will be verified and documented across three viewport tiers:
1. **375px** (Mobile Safari / Chrome, portrait, notch safe-area)
2. **768px** (Tablet / iPad, portrait/landscape transition)
3. **1280px** (Laptop / Desktop, wide aspect ratio)
