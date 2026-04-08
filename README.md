<div align="center">

<img src="https://r2.fivemanage.com/dPa5OqQoEubnwFkRaIgUq/ScreenShot/thumb_mbt_minigames.png" width="100%"/>

<h1>mbt_minigames</h1>

<p>A collection of four unique, skill-based minigames for FiveM</p>

<p>
  <img src="https://img.shields.io/badge/version-2.0.0-00f2ff?style=flat-square"/>
  <img src="https://img.shields.io/badge/FiveM-GTA%20V-orange?style=flat-square"/>
  <img src="https://img.shields.io/badge/Lua-5.4-blueviolet?style=flat-square"/>
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square"/>
</p>

</div>

---

## ⚠️ Version Compatibility

> This resource is a **required dependency** for all Malibù Tech scripts.
> Make sure you are using the correct version for your other MBT resources.

| MBT Resource | Required version |
|---|---|
| **mbt_elevator v3** (and later) | `mbt_minigames v2.x` ← this version |
| **mbt_elevator v2** (and earlier) | `mbt_minigames v1.x` |

Mixing incompatible versions will cause minigames to not trigger correctly.

---

## Overview

`mbt_minigames` replaces repetitive progress bars with four distinct, skill-based interactions. Each game runs inside a cyberpunk terminal UI, plays a custom character animation with props, and returns a simple `true`/`false` outcome to the calling resource via exports.

**YouTube showcase:** [Watch Here](https://www.youtube.com/watch?v=TSCrxiJaWdg)

---

## Minigames

| Game | Type | Description |
|---|---|---|
| 💻 **Hacking** | Sequence matching | Identify and click hex codes in the correct order before time runs out. Includes a terminal boot sequence and synchronised laptop + bag props. |
| ⚡ **Wire Fix** | Pipe puzzle | Rotate tiles on a grid to connect the power source to the endpoint. Grid size and complexity scale with difficulty. Welding animation with torch and mask props + electrical particles. |
| 🔩 **Bolt Turn** | Tension mechanic | Hold a key to build torque on each bolt and release it inside a moving sweet spot. Overheat causes mistakes. Drilling animation with drill prop. |
| 📟 **Code Match** | Timing / rhythm | A stream of codes scrolls down the screen — press Space when the target code aligns with the scanner bracket. Tablet animation. |

---

## Installation

1. Download the latest release and drop the `mbt_minigames` folder into your `resources` directory
2. Add `ensure mbt_minigames` to your `server.cfg` **before** any resource that depends on it
3. Restart the server

---

## Usage

All games are started via exports. Both return `true` (won) or `false` (lost / timed out).

### Hacking

```lua
local outcome = exports['mbt_minigames']:startHackingSession({
    difficulty = "Medium",  -- "Easy" | "Medium" | "Hard"  (optional)
    time       = 40,        -- override time limit in seconds (optional)
    params     = {},        -- override specific difficulty params (optional)
    onSuccess  = function() print("Access granted!") end,
    onFail     = function() print("Access denied.") end,
})
```

### Wire Fix, Bolt Turn, Code Match

```lua
local outcome = exports['mbt_minigames']:startRepairSession({
    type       = "wire_fix",  -- "wire_fix" | "bolt_turn" | "code_match"
    difficulty = "Hard",
    time       = 60,
    params     = { wireCount = 6 },
    onSuccess  = function() print("Repair complete!") end,
    onFail     = function() print("Repair failed.") end,
})
```

### Animation override

Any session accepts a custom `animation` table to replace the default animation:

```lua
exports['mbt_minigames']:startRepairSession({
    type = "bolt_turn",
    animation = {
        Type           = "Sequence",
        Dict           = "anim@heists@fleeca_bank@drilling",
        Enter          = "drill_straight_start",
        Loop           = "drill_straight_idle",
        EnterTime      = 1200,
        EnterPropDelay = 0,
        Props = {
            {
                Model  = "hei_prop_heist_drill",
                Bone   = 28422,
                Offset = vector3(0.0, 0.0, 0.0),
                Rot    = vector3(180.0, 0.0, 180.0),
            }
        }
    }
})
```

---

## Configuration

Everything is controlled from `config.lua`. Each game entry has three sections:

```lua
MBT.Debug            = false   -- enable debug commands & logging
MBT.DefaultDifficulty = "Easy"

MBT.Minigames = {
    ['hacking'] = {
        locale = {
            label       = "Hacking",
            title       = "TERMINAL NODE DECRYPTION",
            -- ... all UI strings
        },
        animation = {
            Dict    = "anim@heists@ornate_bank@hack",
            Prop    = "hei_prop_hst_laptop",
            Bag     = "hei_p_m_bag_var22_arm_s",
            OffsetZ = 0.9,
        },
        difficulties = {
            Easy   = { time = 60, sequenceLength = 4, maxMistakes = 4 },
            Medium = { time = 35, sequenceLength = 6, maxMistakes = 3 },
            Hard   = { time = 20, sequenceLength = 8, maxMistakes = 2 },
        }
    },
    -- wire_fix, bolt_turn, code_match follow the same structure
}
```

### Difficulty parameters reference

| Game | Parameters |
|---|---|
| `hacking` | `time`, `sequenceLength`, `maxMistakes` |
| `wire_fix` | `time`, `wireCount`, `shuffleSpeed`, `maxMistakes` |
| `bolt_turn` | `time`, `boltCount`, `heatSpeed`, `maxMistakes` |
| `code_match` | `time`, `segmentCount`, `shiftSpeed`, `maxMistakes` |

---

## Debug Commands

Enable with `MBT.Debug = true` in `config.lua`:

| Command | Description |
|---|---|
| `/testminigame [type] [difficulty]` | Opens any minigame directly in-game |
| `/testscene [type]` | Plays the animation sequence only, without opening the UI |

---

## License

This project is licensed under the PolyForm Noncommercial License 1.0.0.

You are free to use and modify this software for noncommercial purposes only — personal use, hobby servers, research, and education. Any commercial use, redistribution for profit, or inclusion in paid products is prohibited without written permission from Malibu Tech Team.

##### Copyright © 2026 [Malibù Tech](https://github.com/MalibuTechTeam). All rights reserved.
