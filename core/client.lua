local Utils = loadModule('modules.utils.client')
local Sessions = loadModule('modules.sessions.client')
local Animations = loadModule('modules.animations.client')
local Debug = loadModule('modules.debug.client')

---@param data table
---@return boolean
local function startHackingSession(data)
    local sessionId = Sessions.Start("hacking", Utils)
    local sState = Sessions.Get(sessionId)

    local ped = PlayerPedId()
    local pedCoords = GetEntityCoords(ped)
    local pedRotation = GetEntityRotation(ped)

    local animConfig = MBT.Animations['hacking'] or {}
    local animDict = animConfig.Dict or "anim@heists@ornate_bank@hack"
    local laptopModel = animConfig.Prop or "hei_prop_hst_laptop"
    local bagModel = animConfig.Bag or "hei_p_m_bag_var22_arm_s"

    Utils.LoadAnimDict(animDict)
    Utils.LoadModel(laptopModel)
    Utils.LoadModel(bagModel)

    SetFollowPedCamViewMode(4)

    local animOffsetX = 0.0
    local animOffsetY = 0.0
    local animOffsetZ = animConfig.OffsetZ or 0.9

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
    local bag = CreateObject(GetHashKey(bagModel), pedCoords.x, pedCoords.y, pedCoords.z, 1, 1, 0)
    NetworkAddEntityToSynchronisedScene(bag, netScene, animDict, "hack_enter_bag", 4.0, -8.0, 1)
    local laptop = CreateObject(GetHashKey(laptopModel), pedCoords.x, pedCoords.y, pedCoords.z, 1, 1, 0)
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

    local finalParams = {}
    for k, v in pairs(configParams) do finalParams[k] = v end
    local extraParams = data.params or data.Params or {}
    for k, v in pairs(extraParams) do finalParams[k] = v end

    Utils.MbtDebugger("Starting Hacking Session | Diff: " .. diff .. " | Time: " .. timeLimit)

    SendNUIMessage({
        Action = "handleUI",
        Status = true,
        Payload = {
            Id = sessionId,
            Type = "hacking",
            TimeLimit = timeLimit,
            Params = finalParams,
            Locale = MBT.Locale,
            Debug = MBT.Debug
        }
    })

    SetNuiFocus(true, true)

    while sState.Response == nil do
        Citizen.Wait(5)
    end

    local outcome = sState.Response
    NetworkStopSynchronisedScene(netScene2)
    NetworkStartSynchronisedScene(netScene3)
    Citizen.Wait(6000)
    DeleteObject(laptop)
    DeleteObject(bag)
    NetworkStopSynchronisedScene(netScene3)

    SetFollowPedCamViewMode(0)
    FreezeEntityPosition(ped, false)
    Sessions.Cleanup(sessionId)

    return outcome
end

---@param data table
---@return boolean
local function startRepairSession(data)
    -- Safety wait to ensure previous UI/Animations (like ox_lib progressbar)
    Citizen.Wait(100)

    local type = data.type or "hacking"
    if type == "hacking" then
        return startHackingSession(data)
    end

    local sessionId = Sessions.Start(type, Utils)
    local sState = Sessions.Get(sessionId)

    local ped = PlayerPedId()
    local pedCoords = GetEntityCoords(ped)

    -- Difficulty & Parameter Resolution
    local diffRaw = data.difficulty or data.Difficulty or MBT.DefaultDifficulty or "Easy"
    local diff = string.upper(string.sub(diffRaw, 1, 1)) .. string.lower(string.sub(diffRaw, 2))
    local configParams = (MBT.Difficulties and MBT.Difficulties[diff] and MBT.Difficulties[diff][type]) or {}
    local time = data.time or data.Time or configParams.time or 30

    -- Animation Resolve
    local baseAnimConfig = MBT.Animations[type] or {}
    local callerAnimOverrides = data.animation or {}
    local finalAnimData = {
        Type = (callerAnimOverrides.Type or baseAnimConfig.Type) == "Scene" and "Sequence" or
            (callerAnimOverrides.Type or baseAnimConfig.Type),
        Dict = callerAnimOverrides.Dict or baseAnimConfig.Dict or "anim@amb@clubhouse@tutorial@bkr_tut_ig3@",
        Name = callerAnimOverrides.Name or callerAnimOverrides.Loop or baseAnimConfig.Name or baseAnimConfig.Loop or
            "machinic_loop_me_mechanic",
        Enter = callerAnimOverrides.Enter or baseAnimConfig.Enter,
        Loop = callerAnimOverrides.Loop or callerAnimOverrides.Name or baseAnimConfig.Loop or baseAnimConfig.Name,
        Exit = callerAnimOverrides.Exit or baseAnimConfig.Exit,
        EnterTime = callerAnimOverrides.EnterTime or baseAnimConfig.EnterTime or 2000,
        ExitTime = callerAnimOverrides.ExitTime or baseAnimConfig.ExitTime or 2000,
        Props = callerAnimOverrides.Props or baseAnimConfig.Props,
        Prop = callerAnimOverrides.Prop or baseAnimConfig.Prop,
        Bone = callerAnimOverrides.Bone or baseAnimConfig.Bone or 28422,
        Offset = callerAnimOverrides.Offset or baseAnimConfig.Offset or vector3(0.0, 0.0, 0.0),
        OffsetZ = callerAnimOverrides.OffsetZ or baseAnimConfig.OffsetZ or 0.0,
        Rot = callerAnimOverrides.Rot or baseAnimConfig.Rot or vector3(0.0, 0.0, 0.0),
        Particles = callerAnimOverrides.Particles or baseAnimConfig.Particles,
        EnterFlag = callerAnimOverrides.EnterFlag or baseAnimConfig.EnterFlag or 0,
        LoopFlag = callerAnimOverrides.LoopFlag or baseAnimConfig.LoopFlag or 1,
        ExitFlag = callerAnimOverrides.ExitFlag or baseAnimConfig.ExitFlag or 0,
        -- Sequence/Scene Mapping
        PreEnter = callerAnimOverrides.PreEnter or baseAnimConfig.PreEnter,
        PreEnterDict = callerAnimOverrides.PreEnterDict or baseAnimConfig.PreEnterDict,
        PreEnterTime = callerAnimOverrides.PreEnterTime or baseAnimConfig.PreEnterTime,
        PreProps = callerAnimOverrides.PreProps or baseAnimConfig.PreProps,
        EnterPropDelay = callerAnimOverrides.EnterPropDelay or baseAnimConfig.EnterPropDelay,
        EnterDict = callerAnimOverrides.EnterDict or baseAnimConfig.EnterDict,
        LoopDict = callerAnimOverrides.LoopDict or baseAnimConfig.LoopDict,
        ExitDict = callerAnimOverrides.ExitDict or baseAnimConfig.ExitDict,
        PreEnterFlag = callerAnimOverrides.PreEnterFlag or baseAnimConfig.PreEnterFlag
    }

    local sceneProps = {}
    local sceneFx = {}
    local propObj = nil

    if finalAnimData.Type == "Sequence" then
        Animations.RunSequence(finalAnimData, ped, pedCoords, sceneProps, sceneFx, Utils)
    else
        Utils.LoadAnimDict(finalAnimData.Dict)
        if finalAnimData.Prop then
            Utils.LoadModel(finalAnimData.Prop)
            propObj = CreateObject(GetHashKey(finalAnimData.Prop), pedCoords.x, pedCoords.y, pedCoords.z, true,
                true, true)
            SetEntityAsMissionEntity(propObj, true, true)
            AttachEntityToEntity(propObj, ped, GetPedBoneIndex(ped, finalAnimData.Bone), finalAnimData.Offset.x,
                finalAnimData.Offset.y, finalAnimData.Offset.z, finalAnimData.Rot.x, finalAnimData.Rot.y,
                finalAnimData.Rot.z, true, true, false, false, 0, true)
        end
        if not IsEntityPlayingAnim(ped, finalAnimData.Dict, finalAnimData.Name, 3) then
            TaskPlayAnim(ped, finalAnimData.Dict, finalAnimData.Name, 16.0, -8.0, -1, 1, 0, false, false, false)
        end
        FreezeEntityPosition(ped, true)
    end

    local finalParams = {}
    for k, v in pairs(configParams) do finalParams[k] = v end
    local extraParams = data.params or data.Params or {}
    for k, v in pairs(extraParams) do finalParams[k] = v end

    Utils.MbtDebugger("Starting Repair Session | Type: " .. type .. " | Diff: " .. diff .. " | Time: " .. time)

    SendNUIMessage({
        Action = "handleUI",
        Status = true,
        Payload = {
            Id = sessionId,
            Type = type,
            TimeLimit = time,
            Params = finalParams,
            Locale = MBT.Locale,
            Debug = MBT.Debug
        }
    })

    SetNuiFocus(true, true)

    while sState.Response == nil do
        Animations.UpdatePtfxPulse(sceneFx)
        Citizen.Wait(100)
    end

    local outcome = sState.Response

    if finalAnimData.Type == "Sequence" then
        Animations.StopSequence(finalAnimData, ped, sceneProps, sceneFx, Utils)
    else
        ClearPedTasks(ped)
        if propObj then DeleteObject(propObj) end
    end

    FreezeEntityPosition(ped, false)
    SetNuiFocus(false, false)

    if outcome and data.onSuccess then data.onSuccess() end
    if not outcome and data.onFail then data.onFail() end

    Sessions.Cleanup(sessionId)
    return outcome
end

RegisterNUICallback("hackingEnd", function(data, cb)
    local _source = source
    SetNuiFocus(false, false)
    Sessions.SetResponse(data.sessionId, data.outcome)
    cb("ok")

    -- Allow some time for animations/sounds to finish before hiding UI overlay
    Wait(2000)
    SendNUIMessage({ Action = "handleUI", Status = false, Payload = {} })
end)

exports('startHackingSession', function(data)
    return startHackingSession(data)
end)

exports('startRepairSession', function(data)
    return startRepairSession(data)
end)


-- Debug/Init Module Initialization
if Debug then
    Debug.Initialize({
        startHackingSession = startHackingSession,
        startRepairSession = startRepairSession
    })
end
