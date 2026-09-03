# Max Turns Fix - Automatic Extension for Complex Tasks

## Problem
OpenClaude CLI was stopping at **50 turns** even when the agent was productively working on complex tasks like building premium websites. This prevented completion of multi-step workflows.

## Solution Implemented

### 1. Increased Default Turn Limit
- **Before:** 50 turns default
- **After:** 500 turns default (10x increase)
- **Config options updated:** [500, 1000, 2000, 5000]

### 2. Intelligent Auto-Extension
When the agent approaches the turn limit (450+ turns), the system now:
- **Detects if the agent is productive** (no repeated tool failures)
- **Automatically extends** up to 1000 turns if work is progressing
- **Stops only on actual loops** (repeated tool failures detected)

**Key logic in `src/query.ts`:**
```typescript
const isApproachingLimit = maxTurns && nextTurnCount >= AUTO_EXTEND_THRESHOLD && nextTurnCount < MAX_AUTO_EXTENDED_TURNS
const shouldAutoExtend = isApproachingLimit && !toolFailureLoopDecision.hasLoopingFailure
```

### 3. Configuration Options

**Environment Variable:**
```bash
OPENCLAUDE_MAX_TURNS=1000
```

**CLI Flag:**
```bash
openclaude --max-turns 0  # Unlimited (use with caution)
openclaude --max-turns 1000
```

**In `/config`:**
- Set via interactive config menu
- Options: 500, 1000, 2000, 5000 turns

## Files Modified

1. **`src/utils/replMaxTurns.ts`**
   - `DEFAULT_REPL_MAX_TURNS`: 50 → 500
   - Added `AUTO_EXTEND_THRESHOLD = 450`
   - Added `MAX_AUTO_EXTENDED_TURNS = 1000`
   - Updated `REPL_MAX_TURNS_OPTIONS`: [50, 100, 200, 500] → [500, 1000, 2000, 5000]
   - Enhanced CLI description with auto-extend info

2. **`src/query.ts`**
   - Imported new constants from `replMaxTurns.js`
   - Added auto-extend logic before max turns check
   - Only stops if: limit reached AND NOT auto-extended AND no summary requested

## Verification

✅ Build passes: `bun run build`
✅ Stack healthy: `node setup/verify-local-stack.mjs` → LOCAL STACK PASS
✅ All 63 skills loaded
✅ All 7 agents active
✅ qwen3.8-oc-code:27b configured with MAX 160k context

## How It Works

1. **Normal operation (turns 1-449):** No change from before
2. **Approaching limit (turns 450-499):** System checks if agent is productive
3. **Auto-extend active (turns 500-1000):** Continues if no looping detected
4. **Hard stop (1000+ turns):** Only stops here unless `--max-turns 0`

**Loop Detection:**
- Uses existing `toolFailureLoopDecision.hasLoopingFailure`
- If same tool fails repeatedly → stops immediately
- If tools succeeding → auto-extends automatically

## Benefits

- ✅ Complex website builds can complete without manual intervention
- ✅ No more "maximum number of turns at 50" errors on legitimate work
- ✅ Still protected from infinite loops (failure detection unchanged)
- ✅ Configurable for different task complexities
- ✅ Backward compatible (existing configs still work)

## For Robert's Use Case

When building the **Bobby's Tech Services gaming PC repair website** with elite visual effects:
- Three.js 3D scenes
- RGB particle fields
- PC configurator
- GSAP animations
- Multiple components

These complex tasks often require 100-300+ turns. The new 500-turn default + auto-extension ensures completion without interruption.

---
**Date:** 2026-09-03  
**Status:** ✅ Deployed in dist/cli.mjs  
**Next:** Run `run.bat` to use the fixed version
