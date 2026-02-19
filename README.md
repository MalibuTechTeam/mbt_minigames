<div id="header" align="center">
  <img src="https://r2.fivemanage.com/dPa5OqQoEubnwFkRaIgUq/Thumbanail/mbt_minigames.png?ex=66193356&is=6606be56&hm=69db0bfb88fbeae3846efd710f4997eaccf1a2e69fa04832eb343412bdf289a9&=&format=webp&quality=lossless&width=1290&height=726" width="600"/>
  
  <h1>MBT Minigames</h1>
  
  <p>
    <img src="https://img.shields.io/badge/Platform-FiveM-orange.svg" alt="FiveM"/>
    <img src="https://img.shields.io/badge/Build-Vite-blue.svg" alt="Vite"/>
    <img src="https://img.shields.io/badge/Framework-React-blue.svg" alt="React"/>
    <img src="https://img.shields.io/badge/License-Protected-red.svg" alt="Protected"/>
  </p>
</div>

---

## 🎮 Immersive Cybernetic Minigame Suite

**# MBT Minigames 👾🎮

> [!IMPORTANT]
> **Core Dependency**: This resource is a mandatory dependency for all Malibú Tech scripts. It serves as the central hub and primary library for all current and future minigames across our entire resource ecosystem.

A premium collection of high-quality minigames for FiveM, featuring immersive UI, smooth animations, and a unified laptop interface. Perfect for hacking, robbery, or maintenance tasks in your server scripts.
 Every game is built with a focus on **visual excellence**, **smooth performance**, and **maximum immersion**.

### 🌟 Featured Minigames

| 💻 [Hacking](#-hacking) | 🔌 [Wire Fix](#-wire-fix) | 🔧 [Bolt Turn](#-bolt-turn) | 📟 [Code Match](#-code-match) |
| :---: | :---: | :---: | :---: |
| Pattern decryption with CRT glitch effects. | Physics-based circuit repair. | High-pressure heat maintenance. | Rapid neural link data matching. |

---

## ✨ Core Features

> [!TIP]
> **Laptop Interface**: All games automatically launch within a premium, animated laptop SVG frame for unparalleled roleplay immersion.

- 📺 **Advanced Visuals**: Authentic CRT scanlines, digital glitch effects, and smooth 3D entry animations.
- 🎯 **Dynamic Difficulty**: Three pre-calibrated tiers (Easy, Medium, Hard) that scale perfectly with your server's needs.
- 🔊 **Soundscape**: High-fidelity audio feedback for every interaction, success, and failure.
- 🌐 **Full Internationalization**: Complete translation support via `config.lua` for global community reach.

---

## 🚀 Quick Start

### 1. Installation
1. Download the latest release from our repository.
2. Drag and drop the `mbt_minigames` folder into your `resources` directory.
3. Add `ensure mbt_minigames` to your `server.cfg`.

### 2. Basic Configuration
Open `config.lua` to customize:
- `Difficulty`: Set the base difficulty parameters.
- `Locale`: Translate headers, buttons, and status messages.
- `Debugger`: Enable for technical insights during development.

---

## 💻 Developer Integration Guide

Integrating **MBT Minigames** into your scripts is seamless via exports.

### Basic Export Usage
All exports return a boolean `true` for success and `false` for failure.

```lua
-- Simple integration example
local success = exports.mbt_minigames:startHackingSession({
    Difficulty = "Medium" -- Optional: "Easy", "Medium", "Hard"
})

if success then
    -- Your success logic here
    print("System Compromised!")
else
    -- Your failure logic here
    print("Connection Terminated.")
end
```

### Supported Exports Reference

| Export | Use Case | Parameters |
| :--- | :--- | :--- |
| `startHackingSession` | Node-based pattern hacking. | `(params)` |
| `startWireFixSession` | Drag-and-drop electrical repair. | `(params)` |
| `startBoltTurnSession` | Precision clicking and heat control. | `(params)` |
| `startCodeMatchSession` | High-speed data sequence matching. | `(params)` |

---

## 🎥 Media Showcase
Check out our high-definition showcase to see the effects in action:
- **YouTube Showcase**: [Watch Here](https://www.youtube.com/watch?v=TSCrxiJaWdg)
---
## ⚖️ Rights & Protection
![image](https://images.dmca.com/Badges/dmca_protected_sml_120m.png?ID=91018a5c-ecd2-440d-8a32-d94b2cecca80)
This digital asset is protected by **Malibu Tech**. 
Unauthorized redistribution, reselling, or modification of the core visual assets is strictly prohibited and protected by DMCA.

##### Copyright © 2026 [Malibú Tech](). All rights reserved.
