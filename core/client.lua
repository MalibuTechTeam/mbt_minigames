local Utils = loadModule('modules.utils.client')
local Sessions = loadModule('modules.sessions.client')
local Animations = loadModule('modules.animations.client')
local Debug = loadModule('modules.debug.client')

local activeSceneProps = {}
local activeSceneFx = {}

AddEventHandler('onResourceStop', function(resourceName)
    if GetCurrentResourceName() ~= resourceName then return end
    for _, pObj in ipairs(activeSceneProps) do
        if DoesEntityExist(pObj) then DeleteObject(pObj) end
    end
    for _, fx in ipairs(activeSceneFx) do
        StopParticleFxLooped(fx.handle, false)
    end
    activeSceneProps = {}
    activeSceneFx = {}
    FreezeEntityPosition(PlayerPedId(), false)
    SetNuiFocus(false, false)
end)

---@param data table
---@return boolean
local function startHackingSession(data)
    local sessionId = Sessions.Start()
    local sState = Sessions.Get(sessionId)

    local ped = PlayerPedId()
    local pedCoords = GetEntityCoords(ped)
    local pedRotation = GetEntityRotation(ped)

    local gameConfig = MBT.Minigames['hacking'] or {}
    local animConfig = gameConfig.animation or {}
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
    SetModelAsNoLongerNeeded(GetHashKey(bagModel))
    table.insert(activeSceneProps, bag)
    NetworkAddEntityToSynchronisedScene(bag, netScene, animDict, "hack_enter_bag", 4.0, -8.0, 1)
    local laptop = CreateObject(GetHashKey(laptopModel), pedCoords.x, pedCoords.y, pedCoords.z, 1, 1, 0)
    SetModelAsNoLongerNeeded(GetHashKey(laptopModel))
    table.insert(activeSceneProps, laptop)
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
    local gameConfig = MBT.Minigames['hacking'] or {}
    local configParams = (gameConfig.difficulties or {})[diff] or {}
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
            Locale = gameConfig.locale,
            Debug = MBT.Debug
        }
    })

    SetNuiFocus(true, true)

    local hackWaitStart = GetGameTimer()
    while sState.Response == nil and (GetGameTimer() - hackWaitStart) < 120000 do
        Citizen.Wait(5)
    end

    if sState.Response == nil then
        Utils.MbtDebugger("^1Hacking session timed out! Forcing cleanup.^7")
        SetNuiFocus(false, false)
        SendNUIMessage({ Action = "handleUI", Status = false, Payload = {} })
        NetworkStopSynchronisedScene(netScene)
        NetworkStopSynchronisedScene(netScene2)
        NetworkStopSynchronisedScene(netScene3)
        DeleteObject(laptop)
        DeleteObject(bag)
        activeSceneProps = {}
        SetFollowPedCamViewMode(0)
        FreezeEntityPosition(ped, false)
        Sessions.Cleanup(sessionId)
        return false
    end

    local outcome = sState.Response
    NetworkStopSynchronisedScene(netScene2)
    NetworkStartSynchronisedScene(netScene3)
    Citizen.Wait(6000)
    DeleteObject(laptop)
    DeleteObject(bag)
    activeSceneProps = {}
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

    local gameType = data.type or data.Type or "hacking"
    if gameType == "hacking" then
        return startHackingSession(data)
    end

    local sessionId = Sessions.Start()
    local sState = Sessions.Get(sessionId)

    local ped = PlayerPedId()
    local pedCoords = GetEntityCoords(ped)

    -- Difficulty & Parameter Resolution
    local diffRaw = data.difficulty or data.Difficulty or MBT.DefaultDifficulty or "Easy"
    local diff = string.upper(string.sub(diffRaw, 1, 1)) .. string.lower(string.sub(diffRaw, 2))
    local gameConfig = MBT.Minigames[gameType] or {}
    local configParams = (gameConfig.difficulties or {})[diff] or {}
    local time = data.time or data.Time or configParams.time or 30

    -- Animation Resolve
    local baseAnimConfig = gameConfig.animation or {}
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

    local sceneProps = activeSceneProps
    local sceneFx = activeSceneFx
    local propObj = nil

    if finalAnimData.Type == "Sequence" then
        Animations.RunSequence(finalAnimData, ped, pedCoords, sceneProps, sceneFx, Utils)
    else
        Utils.LoadAnimDict(finalAnimData.Dict)
        if finalAnimData.Prop then
            Utils.LoadModel(finalAnimData.Prop)
            propObj = CreateObject(GetHashKey(finalAnimData.Prop), pedCoords.x, pedCoords.y, pedCoords.z, true,
                true, true)
            SetModelAsNoLongerNeeded(GetHashKey(finalAnimData.Prop))
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

    Utils.MbtDebugger("Starting Repair Session | Type: " .. gameType .. " | Diff: " .. diff .. " | Time: " .. time)

    SendNUIMessage({
        Action = "handleUI",
        Status = true,
        Payload = {
            Id = sessionId,
            Type = gameType,
            TimeLimit = time,
            Params = finalParams,
            Locale = gameConfig.locale,
            Debug = MBT.Debug
        }
    })

    SetNuiFocus(true, true)

    local repairWaitStart = GetGameTimer()
    while sState.Response == nil and (GetGameTimer() - repairWaitStart) < 120000 do
        Animations.UpdatePtfxPulse(sceneFx)
        Citizen.Wait(100)
    end

    if sState.Response == nil then
        Utils.MbtDebugger("^1Repair session timed out! Forcing cleanup.^7")
        if finalAnimData.Type == "Sequence" then
            Animations.StopSequence(finalAnimData, ped, sceneProps, sceneFx, Utils)
        else
            ClearPedTasks(ped)
            if propObj then DeleteObject(propObj) end
        end
        FreezeEntityPosition(ped, false)
        SetNuiFocus(false, false)
        Sessions.Cleanup(sessionId)
        SendNUIMessage({ Action = "handleUI", Status = false, Payload = {} })
        return false
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

    -- Clear module-level scene tracking after successful cleanup
    activeSceneProps = {}
    activeSceneFx = {}

    if outcome and data.onSuccess then data.onSuccess() end
    if not outcome and data.onFail then data.onFail() end

    Sessions.Cleanup(sessionId)
    return outcome
end

RegisterNUICallback("minigameEnd", function(data, cb)
    SetNuiFocus(false, false)
    if type(data.sessionId) ~= "string" or type(data.outcome) ~= "boolean" then
        Utils.MbtDebugger("^1NUI minigameEnd received invalid data — sessionId or outcome malformed^7")
        cb("invalid")
        return
    end
    Sessions.SetResponse(data.sessionId, data.outcome)
    Wait(2000)
    SendNUIMessage({ Action = "handleUI", Status = false, Payload = {} })
    cb("ok")
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

return {
    startHackingSession = startHackingSession,
    startRepairSession = startRepairSession
}
