local session = {}
local bh = false

Utils = {}

function Utils.MbtDebugger(...)
    if MBT.Debug then
        local arg = { ... }
        local printResult = "[" .. GetCurrentResourceName() .. "] | "
        for _, v in ipairs(arg) do
            printResult = printResult .. tostring(v) .. "\t"
        end
        printResult = printResult .. "\n"
        print(printResult)
    end
end

-- Debug: Check if config loaded
Citizen.CreateThread(function()
    Wait(1000)
    if MBT and MBT.Locale then
        Utils.MbtDebugger("Locale system and Difficulty profiles loaded.")
        Utils.MbtDebugger("Configuration loaded successfully.")
    else
        Utils.MbtDebugger("^1ERROR: Configuration table 'MBT.Locale' not found!^7")
    end
end)

---@param data table
local function SendNUI(data)
    SendNUIMessage(data)
end

local function generateSessionId()
    local randomStr = ""
    for i = 1, 20 do
        randomStr = randomStr .. string.char(math.random(97, 122))
    end
    if session[randomStr] ~= nil then
        return generateSessionId()
    end

    return randomStr
end

---@param animdict string
local function loadAnimDict(animdict)
    while (not HasAnimDictLoaded(animdict)) do
        RequestAnimDict(animdict)
        Citizen.Wait(1)
    end
end

---@param model string
local function loadModel(model)
    local timeout = false
    SetTimeout(5000, function() timeout = true end)

    local hashModel = GetHashKey(model)
    repeat
        RequestModel(hashModel)
        Wait(50)
    until HasModelLoaded(hashModel) or timeout
end

---@param data table
---@return boolean
local function startHackingSession(data)
    local sessionId = generateSessionId()
    session[sessionId] = { Active = true, Response = nil }

    local ped = PlayerPedId()
    local pedCoords = GetEntityCoords(ped)
    local pedRotation = GetEntityRotation(ped)
    local animDict = "anim@heists@ornate_bank@hack"

    loadAnimDict(animDict)
    loadModel("hei_prop_hst_laptop")
    loadModel("hei_p_m_bag_var22_arm_s")

    SetFollowPedCamViewMode(4)

    local animOffsetX = 0.0
    local animOffsetY = 0.0
    local animOffsetZ = 0.9 -- Adjust this value to prevent the player from going through the ground

    local animPos = GetAnimInitialOffsetPosition(animDict, "hack_enter", pedCoords.x + animOffsetX,
        pedCoords.y + animOffsetY, pedCoords.z + animOffsetZ, pedRotation.x, pedRotation.y, pedRotation.z, 2)
    local animPos2 = GetAnimInitialOffsetPosition(animDict, "hack_loop", pedCoords.x + animOffsetX,
        pedCoords.y + animOffsetY, pedCoords.z + animOffsetZ, pedRotation.x, pedRotation.y, pedRotation.z, 2)
    local animPos3 = GetAnimInitialOffsetPosition(animDict, "hack_exit", pedCoords.x + animOffsetX,
        pedCoords.y + animOffsetY, pedCoords.z + animOffsetZ, pedRotation.x, pedRotation.y, pedRotation.z, 2)

    FreezeEntityPosition(ped, true)

    local netScene = NetworkCreateSynchronisedScene(animPos.x, animPos.y, animPos.z, pedRotation.x, pedRotation.y,
        pedRotation.z, 2, false, false, 1065353216, 0, 1.3)
    NetworkAddPedToSynchronisedScene(ped, netScene, animDict, "hack_enter", 1.5, -4.0, 1, 16, 1148846080, 0)
    local bag = CreateObject(GetHashKey("hei_p_m_bag_var22_arm_s"), pedCoords.x, pedCoords.y, pedCoords.z, 1, 1, 0)
    NetworkAddEntityToSynchronisedScene(bag, netScene, animDict, "hack_enter_bag", 4.0, -8.0, 1)
    local laptop = CreateObject(GetHashKey("hei_prop_hst_laptop"), pedCoords.x, pedCoords.y, pedCoords.z, 1, 1, 0)
    NetworkAddEntityToSynchronisedScene(laptop, netScene, animDict, "hack_enter_laptop", 4.0, -8.0, 1)

    local netScene2 = NetworkCreateSynchronisedScene(animPos2.x, animPos2.y, animPos2.z, pedRotation.x, pedRotation.y,
        pedRotation.z, 2, true, false, 1065353216, 0, 1.3)
    NetworkAddPedToSynchronisedScene(ped, netScene2, animDict, "hack_loop", 1.5, -4.0, 1, 16, 1148846080, 0)
    NetworkAddEntityToSynchronisedScene(bag, netScene2, animDict, "hack_loop_bag", 4.0, -8.0, 1)
    NetworkAddEntityToSynchronisedScene(laptop, netScene2, animDict, "hack_loop_laptop", 4.0, -8.0, 1)

    local netScene3 = NetworkCreateSynchronisedScene(animPos3.x, animPos3.y, animPos3.z, pedRotation.x, pedRotation.y,
        pedRotation.z, 2, false, false, 1065353216, 0, 1.3)
    NetworkAddPedToSynchronisedScene(ped, netScene3, animDict, "hack_exit", 1.5, -4.0, 1, 16, 1148846080, 0)
    NetworkAddEntityToSynchronisedScene(bag, netScene3, animDict, "hack_exit_bag", 4.0, -8.0, 1)
    NetworkAddEntityToSynchronisedScene(laptop, netScene3, animDict, "hack_exit_laptop", 4.0, -8.0, 1)
    Citizen.Wait(500)

    NetworkStartSynchronisedScene(netScene)
    Citizen.Wait(4500)
    NetworkStopSynchronisedScene(netScene)
    NetworkStartSynchronisedScene(netScene2)

    -- Difficulty & Parameter Resolution
    local diffRaw = data.difficulty or data.Difficulty or MBT.DefaultDifficulty or "Easy"
    local diff = string.upper(string.sub(diffRaw, 1, 1)) .. string.lower(string.sub(diffRaw, 2))

    local configParams = (MBT.Difficulties and MBT.Difficulties[diff] and MBT.Difficulties[diff]['hacking']) or {}

    local timeLimit = data.Time or data.time or configParams.time or 30

    -- Merge parameters (Caller override > Config difficulty > Defaults)
    local finalParams = {}
    for k, v in pairs(configParams) do finalParams[k] = v end
    local extraParams = data.params or data.Params or {}
    for k, v in pairs(extraParams) do finalParams[k] = v end

    Utils.MbtDebugger("Starting Hacking Session | Diff: " .. diff .. " | Time: " .. timeLimit)

    SendNUI({
        Action = "handleUI",
        Status = true,
        Payload = {
            Id = sessionId,
            Type = "hacking",
            TimeLimit = timeLimit,
            Params = finalParams,
            Locale = MBT.Locale
        }
    })

    SetNuiFocus(true, true)

    while session[sessionId].Response == nil do
        Citizen.Wait(5)
    end

    local outcome = session[sessionId].Response

    NetworkStopSynchronisedScene(netScene2)

    NetworkStartSynchronisedScene(netScene3)
    Citizen.Wait(6000)
    DeleteObject(laptop)
    DeleteObject(bag)
    NetworkStopSynchronisedScene(netScene3)

    SetFollowPedCamViewMode(0)
    FreezeEntityPosition(ped, false)

    session[sessionId] = nil

    return outcome
end

---@param data table
---@return boolean
local function startRepairSession(data)
    local sessionId = generateSessionId()
    session[sessionId] = { Active = true, Response = nil }

    local ped = PlayerPedId()
    local pedCoords = GetEntityCoords(ped)
    local type = data.type or "hacking"

    -- Difficulty & Parameter Resolution
    local diffRaw = data.difficulty or data.Difficulty or MBT.DefaultDifficulty or "Easy"
    local diff = string.upper(string.sub(diffRaw, 1, 1)) .. string.lower(string.sub(diffRaw, 2))

    local configParams = (MBT.Difficulties and MBT.Difficulties[diff] and MBT.Difficulties[diff][type]) or {}

    local time = data.time or data.Time or configParams.time or 30

    if type == "hacking" then
        return startHackingSession(data) -- Keep original complex animation for hacking
    end

    -- For code_match or other types, use a more professional repair animation
    local animData = data.animation or {}

    -- Ensure code_match has a default PC prop if not provided
    if type == "code_match" and not animData.Prop then
        animData.Prop = "prop_laptop_01a"
        animData.Bone = 60309 -- Left Hand
        animData.Offset = vector3(0.12, 0.0, 0.0)
        animData.Rot = vector3(0.0, 0.0, 0.0)
    end
    local animDict = animData.Dict or "anim@amb@clubhouse@tutorial@bkr_tut_ig3@"
    local animName = animData.Name or "machinic_loop_me_mechanic"

    loadAnimDict(animDict)
    ClearPedTasks(ped)

    -- Handle Prop (Standalone logic)
    local propObj = nil
    if animData.Prop then
        local propName = animData.Prop
        local bone = animData.Bone or 28422
        local offset = animData.Offset or vector3(0.0, 0.0, 0.0)
        local rot = animData.Rot or vector3(0.0, 0.0, 0.0)

        loadModel(propName)
        propObj = CreateObject(GetHashKey(propName), pedCoords.x, pedCoords.y, pedCoords.z + 0.2, true, true, true)
        AttachEntityToEntity(propObj, ped, GetPedBoneIndex(ped, bone), offset.x, offset.y, offset.z, rot.x, rot.y, rot.z,
            true, true, false, true, 1, true)
    end

    -- Persistent animation check: only play if not already playing to avoid flicker
    if not IsEntityPlayingAnim(ped, animDict, animName, 3) then
        TaskPlayAnim(ped, animDict, animName, 8.0, -8.0, -1, 1, 0, false, false, false)
    end
    FreezeEntityPosition(ped, true)

    -- Merge parameters (Caller override > Config difficulty > Defaults)
    local finalParams = {}
    for k, v in pairs(configParams) do finalParams[k] = v end
    local extraParams = data.params or data.Params or {}
    for k, v in pairs(extraParams) do finalParams[k] = v end

    Utils.MbtDebugger("Starting Repair Session | Type: " .. type .. " | Diff: " .. diff .. " | Time: " .. time)

    SendNUI({
        Action = "handleUI",
        Status = true,
        Payload = {
            Id = sessionId,
            Type = type,
            TimeLimit = time,
            Params = finalParams,
            Locale = MBT.Locale
        }
    })

    SetNuiFocus(true, true)

    while session[sessionId].Response == nil do
        Citizen.Wait(100)
    end

    local outcome = session[sessionId].Response

    ClearPedTasks(ped)
    FreezeEntityPosition(ped, false)
    SetNuiFocus(false, false)

    if propObj then
        DeleteObject(propObj)
    end

    -- Support for callbacks if used
    if outcome and data.onSuccess then data.onSuccess() end
    if not outcome and data.onFail then data.onFail() end

    session[sessionId] = nil

    return outcome
end

RegisterNUICallback("hackingEnd", function(data, cb)
    bh = false
    SetNuiFocus(false, false)
    if session[data.sessionId] then
        session[data.sessionId].Response = data.outcome
    end

    Wait(2000)

    SendNUI({
        Action = "handleUI",
        Status = false,
        Payload = {}
    })

    cb("ok")
end)

exports('startHackingSession', function(data)
    return startHackingSession(data)
end)

exports('startRepairSession', function(data)
    return startRepairSession(data)
end)

-- Debug Command
RegisterCommand("testminigame", function(source, args)
    local type = args[1] or "code_match"
    local diff = args[2] or "Easy"
    Utils.MbtDebugger("Debug Command: Testing " .. type .. " on " .. diff)
    local outcome = startRepairSession({
        type = type,
        difficulty = diff
    })
    Utils.MbtDebugger("Debug Result: " .. tostring(outcome))
end, false)
