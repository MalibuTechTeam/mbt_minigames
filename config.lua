MBT = {}

MBT.Debug = false

MBT.Locale = {
    ['hacking'] = {
        label = "Hacking",
        title = "TERMINAL NODE DECRYPTION",
        instruction = "IDENTIFY SEQUENCE PATTERN IN DESIGNATED ORDER",
        target_label = "TARGET SEQUENCE",
        errors_label = "ERRORS",
        granted = "ACCESS GRANTED",
        granted_sub = "SYSTEM OVERRIDE COMPLETE",
        denied = "ACCESS DENIED",
        denied_sub = "SECURITY PROTOCOL TRIGGERED",
        boot_lines = {
            "[ KERNEL ] LOADING NEURAL MODULES...",
            "[ MEMORY ] INTEG_CHECK: 0x5F3A... PASS",
            "[ NET ] BYPASSING FIREWALL (PORT 8080)...",
            "[ SEC ] DECRYPTING NODES: 0x4F2A, 0xBC12...",
            "[ SYSTEM ] INITIALIZING INTERFACE...",
            "[ READY ] SYSTEM OVERRIDE ACTIVE."
        }
    },
    ['wire_fix'] = {
        label = "Electrical Repair",
        title = "NEURAL LINK RESTORATION",
        errors_label = "SIGNAL ERRORS",
        warning = "CAUTION: NEURAL SYNC UNSTABLE. PORTS ARE SHIFTING.",
        won = "LINK ESTABLISHED",
        won_sub = "SYSTEMS STABILIZED",
        lost = "NEURAL COLLAPSE",
        lost_sub = "CONNECTION TERMINATED"
    },
    ['bolt_turn'] = {
        label = "Mechanical Repair",
        title = "PRESSURE CONTROL SYSTEM",
        valves_label = "VALVES STATE",
        neural_load = "NEURAL LOAD",
        stability = "STABILITY",
        adjust = "ADJUST",
        optimal = "OPTIMAL",
        warning_heat = "WARNING: HEAT",
        critical_heat = "CRITICAL TEMP!",
        log_header = "ERROR_LOG_INTERNAL",
        log_empty = "NO ERRORS DETECTED",
        log_overheat = "CRITICAL OVERHEAT: VALVE #%s SHUTDOWN",
        log_restored = "SYSTEM RESTORED: VALVE #%s ONLINE",
        won = "SYSTEM RESTORED",
        won_sub = "Pressure stabilized at 101.3 kPa",
        lost = "MECHANICAL FAILURE",
        lost_sub_meltdown = "CRITICAL ENGINE MELTDOWN",
        lost_sub_time = "TIME EXPIRED"
    },
    ['code_match'] = {
        label = "System Override",
        title = "DATA STREAM SYNC",
        locate = "LOCATE SEQUENCE",
        won = "DATA SYNCED",
        lost = "STREAM CORRUPTED"
    }
}

-- Minigame Difficulty Configuration
MBT.DefaultDifficulty = "Easy"
MBT.Difficulties = {
    ["Easy"] = {
        ['hacking'] = {
            time = 60,
            sequenceLength = 4,
            maxMistakes = 4,
        },
        ['wire_fix'] = {
            time = 60,
            wireCount = 4,
            shuffleSpeed = 6000,
            maxMistakes = 4,
        },
        ['bolt_turn'] = {
            time = 60,
            boltCount = 4,
            heatSpeed = 1.0,
            maxMistakes = 4,
        },
        ['code_match'] = {
            time = 80,
            segmentCount = 4,
            shiftSpeed = 1200,
            maxMistakes = 4,
        }
    },
    ["Medium"] = {
        ['hacking'] = {
            time = 35,
            sequenceLength = 6,
            maxMistakes = 3,
        },
        ['wire_fix'] = {
            time = 30,
            wireCount = 5,
            shuffleSpeed = 4000,
            maxMistakes = 3,
        },
        ['bolt_turn'] = {
            time = 45,
            boltCount = 6,
            heatSpeed = 1.5,
            maxMistakes = 3,
        },
        ['code_match'] = {
            time = 45,
            segmentCount = 6,
            shiftSpeed = 900,
            maxMistakes = 3,
        }
    },
    ["Hard"] = {
        ['hacking'] = {
            time = 20,
            sequenceLength = 8,
            maxMistakes = 2,
        },
        ['wire_fix'] = {
            time = 15,
            wireCount = 6,
            shuffleSpeed = 2000,
            maxMistakes = 2,
        },
        ['bolt_turn'] = {
            time = 25,
            boltCount = 8,
            heatSpeed = 2.0,
            maxMistakes = 2,
        },
        ['code_match'] = {
            time = 25,
            segmentCount = 8,
            shiftSpeed = 600,
            maxMistakes = 2,
        }
    }
}
