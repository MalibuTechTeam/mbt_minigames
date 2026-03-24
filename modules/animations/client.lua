local Animations = {}

---@param finalAnimData table
---@param ped number
---@param pedCoords vector3
---@param sceneProps table
---@param sceneFx table
---@param Utils table
function Animations.RunSequence(finalAnimData, ped, pedCoords, sceneProps, sceneFx, Utils)
    local animDict = finalAnimData.Dict
    Utils.LoadAnimDict(animDict)

    -- Ensure character is unarmed to avoid prop interference
    SetCurrentPedWeapon(ped, `WEAPON_UNARMED`, true)

    -- Pre-load ALL models upfront to prevent desync during the sequence
    Utils.MbtDebugger("RunSequence: Pre-loading assets...")
    for _, pDef in ipairs(finalAnimData.PreProps or {}) do Utils.LoadModel(pDef.Model) end
    for _, pDef in ipairs(finalAnimData.Props or {}) do Utils.LoadModel(pDef.Model) end

    -- 0. Optional Pre-Enter
    if finalAnimData.PreEnter then
        local preDict = finalAnimData.PreEnterDict or animDict
        if DoesAnimDictExist(preDict) then
            Utils.LoadAnimDict(preDict)

            -- Spawn PreProps
            local currentCoords = GetEntityCoords(ped)
            for _, pDef in ipairs(finalAnimData.PreProps or {}) do
                local mHash = GetHashKey(pDef.Model)
                local pObj = CreateObject(mHash, currentCoords.x, currentCoords.y, currentCoords.z, true, true, true)
                SetModelAsNoLongerNeeded(mHash)
                table.insert(sceneProps, pObj)
                if pDef.Bone then
                    Citizen.Wait(0)
                    local boneIndex = GetPedBoneIndex(ped, pDef.Bone)
                    local offset = pDef.Offset or vector3(0.0, 0.0, 0.0)
                    local rot = pDef.Rot or vector3(0.0, 0.0, 0.0)
                    SetEntityAsMissionEntity(pObj, true, true)
                    AttachEntityToEntity(pObj, ped, boneIndex, offset.x, offset.y, offset.z, rot.x, rot.y, rot.z,
                        false, false, false, false, 2, true)
                    Utils.MbtDebugger("RunSequence: Attached PreProp " ..
                        tostring(pDef.Model) .. " to bone " .. tostring(boneIndex))
                end
            end


            Utils.MbtDebugger("RunSequence: Playing PreEnter -> " .. tostring(finalAnimData.PreEnter))
            TaskPlayAnim(ped, preDict, finalAnimData.PreEnter, 16.0, -4.0, -1, finalAnimData.PreEnterFlag or 0, 0, false,
                false, false)
            Utils.MbtDebugger("RunSequence: Waiting PreEnterTime (" ..
                tostring(finalAnimData.PreEnterTime or 1500) .. "ms)")
            Citizen.Wait(finalAnimData.PreEnterTime or 1500)
        end
    end

    -- 1. Play Enter Animation First
    if finalAnimData.Enter then
        TaskPlayAnim(ped, animDict, finalAnimData.Enter, 8.0, -8.0, -1, finalAnimData.EnterFlag or 0, 0, false, false,
            false)
        Utils.MbtDebugger("RunSequence: Waiting EnterPropDelay (" ..
            tostring(finalAnimData.EnterPropDelay or 150) .. "ms)")
        Citizen.Wait(finalAnimData.EnterPropDelay or 150)
    elseif finalAnimData.Loop then
        TaskPlayAnim(ped, animDict, finalAnimData.Loop, 8.0, -8.0, -1, finalAnimData.LoopFlag or 1, 0, false, false,
            false)
        Utils.MbtDebugger("RunSequence: Waiting EnterPropDelay (" ..
            tostring(finalAnimData.EnterPropDelay or 150) .. "ms)")
        Citizen.Wait(finalAnimData.EnterPropDelay or 150)
    end

    -- 2. Create and attach props
    local currentCoords = GetEntityCoords(ped)
    for propIndex, pDef in ipairs(finalAnimData.Props or {}) do
        local mHash = GetHashKey(pDef.Model)
        Utils.MbtDebugger("RunSequence: Spawning Prop " .. tostring(pDef.Model) .. " (Hash: " .. tostring(mHash) .. ")")

        local pObj = CreateObject(mHash, currentCoords.x, currentCoords.y, currentCoords.z, true, true, true)
        SetModelAsNoLongerNeeded(mHash)
        SetEntityAsMissionEntity(pObj, true, true)
        table.insert(sceneProps, pObj)

        if pDef.Bone then
            Citizen.Wait(0)
            local boneIndex = GetPedBoneIndex(ped, pDef.Bone)
            local offset = pDef.Offset or vector3(0.0, 0.0, 0.0)
            local rot = pDef.Rot or vector3(0.0, 0.0, 0.0)
            AttachEntityToEntity(pObj, ped, boneIndex, offset.x, offset.y, offset.z, rot.x, rot.y, rot.z,
                false, false, false, false, 2, true)

            local attached = IsEntityAttachedToEntity(pObj, ped)
            Utils.MbtDebugger("RunSequence: Prop " ..
                tostring(pDef.Model) ..
                " attached? " .. tostring(attached) .. " handle: " .. tostring(pObj) .. " at Rot " .. tostring(rot))
        end

        -- Support PTFX anchored to the prop
        for _, fx in ipairs(finalAnimData.Particles or {}) do
            if fx.PropIndex == propIndex then
                RequestNamedPtfxAsset(fx.Asset)
                local ptTimeout = false
                SetTimeout(3000, function() ptTimeout = true end)
                while not HasNamedPtfxAssetLoaded(fx.Asset) and not ptTimeout do Wait(10) end

                if not ptTimeout then
                    UseParticleFxAssetNextCall(fx.Asset)
                    local handle = StartParticleFxLoopedOnEntity(fx.Name, pObj, fx.Offset.x, fx.Offset.y,
                        fx.Offset.z, fx.Rot.x, fx.Rot.y, fx.Rot.z, fx.Scale or 1.0, true, true, true)
                    SetParticleFxLoopedAlpha(handle, 1.0)
                    table.insert(sceneFx,
                        {
                            handle = handle,
                            asset = fx.Asset,
                            name = fx.Name,
                            obj = pObj,
                            offset = fx.Offset,
                            rot = fx.Rot,
                            scale = fx.Scale,
                            pulse = fx.Pulse,
                            lastPulse = GetGameTimer()
                        })
                end
            end
        end
    end

    -- 3. Wait for Enter to finish
    if finalAnimData.Enter then
        local remainingWait = (finalAnimData.EnterTime or 2000) - (finalAnimData.EnterPropDelay or 150)
        if remainingWait > 0 then Citizen.Wait(remainingWait) end
    end

    -- 4. Play Loop Animation
    if finalAnimData.Loop and finalAnimData.Enter then
        TaskPlayAnim(ped, animDict, finalAnimData.Loop, 8.0, -8.0, -1, finalAnimData.LoopFlag or 1, 0, false, false,
            false)
    end

    FreezeEntityPosition(ped, true)
end

---@param finalAnimData table
---@param ped number
---@param sceneProps table
---@param sceneFx table
---@param Utils table
function Animations.StopSequence(finalAnimData, ped, sceneProps, sceneFx, Utils)
    if finalAnimData.Exit then
        local exitDict = finalAnimData.ExitDict or finalAnimData.Dict
        if DoesAnimDictExist(exitDict) then
            Utils.LoadAnimDict(exitDict)
            TaskPlayAnim(ped, exitDict, finalAnimData.Exit, 8.0, -8.0, -1, finalAnimData.ExitFlag or 0, 0, false,
                false, false)
            Citizen.Wait(finalAnimData.ExitTime or 2000)
        end
    end
    ClearPedTasks(ped)

    for _, pObj in ipairs(sceneProps) do
        DeleteObject(pObj)
    end
    for _, fx in ipairs(sceneFx) do
        StopParticleFxLooped(fx.handle, false)
        RemoveNamedPtfxAsset(fx.asset)
    end
end

function Animations.UpdatePtfxPulse(sceneFx)
    local now = GetGameTimer()
    for _, fx in ipairs(sceneFx) do
        if fx.pulse and (now - fx.lastPulse > fx.pulse) then
            StopParticleFxLooped(fx.handle, false)
            UseParticleFxAssetNextCall(fx.asset)
            fx.handle = StartParticleFxLoopedOnEntity(fx.name, fx.obj, fx.offset.x, fx.offset.y, fx.offset.z,
                fx.rot.x, fx.rot.y, fx.rot.z, fx.scale or 1.0, true, true, true)
            SetParticleFxLoopedAlpha(fx.handle, 1.0)
            fx.lastPulse = now
        end
    end
end

return Animations
