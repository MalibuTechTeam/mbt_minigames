MBT = {}

MBT.Debug = false
MBT.DefaultDifficulty = "Easy"

MBT.Minigames = {
	['hacking'] = {
		locale = {
			label         = "Hacking",
			title         = "TERMINAL NODE DECRYPTION",
			instruction   = "IDENTIFY SEQUENCE PATTERN IN DESIGNATED ORDER",
			target_label  = "TARGET SEQUENCE",
			errors_label  = "ERRORS",
			granted       = "ACCESS GRANTED",
			granted_sub   = "SYSTEM OVERRIDE COMPLETE",
			denied        = "ACCESS DENIED",
			denied_sub    = "SECURITY PROTOCOL TRIGGERED",
			boot_lines    = {
				"[ KERNEL ] LOADING NEURAL MODULES...",
				"[ MEMORY ] INTEG_CHECK: 0x5F3A... PASS",
				"[ NET ] BYPASSING FIREWALL (PORT 8080)...",
				"[ SEC ] DECRYPTING NODES: 0x4F2A, 0xBC12...",
				"[ SYSTEM ] INITIALIZING INTERFACE...",
				"[ READY ] SYSTEM OVERRIDE ACTIVE."
			}
		},
		animation = {
			Dict    = "anim@heists@ornate_bank@hack",
			Prop    = "hei_prop_hst_laptop",
			Bag     = "hei_p_m_bag_var22_arm_s",
			OffsetZ = 0.9
		},
		difficulties = {
			Easy   = { time = 60, sequenceLength = 4, maxMistakes = 4 },
			Medium = { time = 35, sequenceLength = 6, maxMistakes = 3 },
			Hard   = { time = 20, sequenceLength = 8, maxMistakes = 2 }
		}
	},

	['wire_fix'] = {
		locale = {
			label        = "Electrical Repair",
			title        = "NEURAL LINK RESTORATION",
			errors_label = "SIGNAL ERRORS",
			warning      = "CAUTION: NEURAL SYNC UNSTABLE. PORTS ARE SHIFTING.",
			won          = "LINK ESTABLISHED",
			won_sub      = "SYSTEMS STABILIZED",
			lost         = "NEURAL COLLAPSE",
			lost_sub     = "CONNECTION TERMINATED"
		},
		animation = {
			Type           = "Sequence",
			Dict           = "amb@world_human_welding@male@base",
			Loop           = "base",
			EnterPropDelay = 0,
			Props = {
				{
					Model  = "prop_weld_torch",
					Bone   = 28422,
					Offset = vector3(0.0, 0.0, 0.0),
					Rot    = vector3(0.0, 0.0, 0.0)
				},
				{
					Model  = "prop_welding_mask_01",
					Bone   = 31086,
					Offset = vector3(0.12, 0.0, 0.0),
					Rot    = vector3(0.0, 90.0, 180.0)
				}
			},
			Particles = {
				{
					PropIndex = 1,
					Asset     = "core",
					Name      = "ent_dst_electrical",
					Offset    = vector3(0.0, 0.35, 0.0),
					Rot       = vector3(0.0, 0.0, 0.0),
					Scale     = 2.0,
					Pulse     = 400
				}
			}
		},
		difficulties = {
			Easy   = { time = 45, wireCount = 4, shuffleSpeed = 6000, maxMistakes = 4 },
			Medium = { time = 55, wireCount = 5, shuffleSpeed = 4000, maxMistakes = 3 },
			Hard   = { time = 70, wireCount = 6, shuffleSpeed = 2000, maxMistakes = 2 }
		}
	},

	['bolt_turn'] = {
		locale = {
			label             = "Mechanical Repair",
			title             = "PRESSURE CONTROL SYSTEM",
			valves_label      = "VALVES STATE",
			neural_load       = "NEURAL LOAD",
			stability         = "STABILITY",
			adjust            = "ADJUST",
			optimal           = "OPTIMAL",
			warning_heat      = "WARNING: HEAT",
			critical_heat     = "CRITICAL TEMP!",
			log_header        = "ERROR_LOG_INTERNAL",
			log_empty         = "NO ERRORS DETECTED",
			log_overheat      = "CRITICAL OVERHEAT: VALVE #%s SHUTDOWN",
			log_restored      = "SYSTEM RESTORED: VALVE #%s ONLINE",
			won               = "SYSTEM RESTORED",
			won_sub           = "Pressure stabilized at 101.3 kPa",
			lost              = "MECHANICAL FAILURE",
			lost_sub_meltdown = "CRITICAL ENGINE MELTDOWN",
			lost_sub_time     = "TIME EXPIRED"
		},
		animation = {
			Type           = "Sequence",
			PreEnterDict   = "anim@heists@ornate_bank@hack",
			PreEnter       = "hack_enter",
			PreEnterTime   = 2000,
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
					Rot    = vector3(180.0, 0.0, 180.0)
				}
			}
		},
		difficulties = {
			Easy   = { time = 40, boltCount = 3, heatSpeed = 0.8, maxMistakes = 4 },
			Medium = { time = 50, boltCount = 4, heatSpeed = 1.2, maxMistakes = 3 },
			Hard   = { time = 65, boltCount = 5, heatSpeed = 1.6, maxMistakes = 2 }
		}
	},

	['code_match'] = {
		locale = {
			label  = "System Override",
			title  = "DATA STREAM SYNC",
			locate = "LOCATE SEQUENCE",
			won    = "DATA SYNCED",
			lost   = "STREAM CORRUPTED"
		},
		animation = {
			Type           = "Sequence",
			Dict           = "amb@code_human_in_bus_passenger_idles@female@tablet@base",
			Loop           = "base",
			LoopFlag       = 49,
			EnterPropDelay = 0,
			Props = {
				{
					Model  = "prop_cs_tablet",
					Bone   = 60309, -- PH_L_Hand
					Offset = vector3(0.03, 0.002, -0.0),
					Rot    = vector3(10.0, 160.0, 0.0)
				}
			}
		},
		difficulties = {
			Easy   = { time = 30, segmentCount = 4, shiftSpeed = 1200, maxMistakes = 4 },
			Medium = { time = 35, segmentCount = 6, shiftSpeed = 900,  maxMistakes = 3 },
			Hard   = { time = 25, segmentCount = 8, shiftSpeed = 600,  maxMistakes = 2 }
		}
	}
}
