local Utils = loadModule('modules.utils.client')

local Debug = {}

function Debug.Initialize(actions)
    if MBT.Debug then
        RegisterCommand("testminigame", function(source, args)
            local gameType = args[1] or "code_match"
            local diff = args[2] or "Easy"
            Utils.MbtDebugger("Debug Command: Testing " .. gameType .. " on " .. diff)
            if actions and actions.startRepairSession then
                local outcome = actions.startRepairSession({ type = gameType, difficulty = diff })
                Utils.MbtDebugger("Debug Result: " .. tostring(outcome))
            else
                Utils.MbtDebugger("^1ERROR: startRepairSession not provided to debug module!^7")
            end
        end, false)

        RegisterCommand("testscene", function(source, args)
            local gameType = args[1] or "bolt_turn"
            local gameConfig = MBT.Minigames and MBT.Minigames[gameType]
            local finalAnimData = gameConfig and gameConfig.animation
            if not finalAnimData then
                Utils.MbtDebugger("No scene configuration found for type: " .. gameType)
                return
            end

            local ped = PlayerPedId()
            SetCurrentPedWeapon(ped, GetHashKey("WEAPON_UNARMED"), true)
            local pedCoords = GetEntityCoords(ped)
            Utils.MbtDebugger("Testing Scene: " .. gameType .. " | Dict: " .. tostring(finalAnimData.Dict))

            if not DoesAnimDictExist(finalAnimData.Dict) then
                Utils.MbtDebugger("Animation Dictionary does not exist: " .. tostring(finalAnimData.Dict))
                return
            end

            local Animations = loadModule('modules.animations.client')
            local sceneProps = {}
            local sceneFx = {}
            Animations.RunSequence(finalAnimData, ped, pedCoords, sceneProps, sceneFx, Utils)

            local testStarted = GetGameTimer()
            while GetGameTimer() - testStarted < 15000 do
                Animations.UpdatePtfxPulse(sceneFx)
                Citizen.Wait(100)
            end

            Animations.StopSequence(finalAnimData, ped, sceneProps, sceneFx, Utils)
            FreezeEntityPosition(ped, false)
            Utils.MbtDebugger("Scene Test Finished.")
        end, false)

        AddEventHandler('onClientResourceStart', function(resourceName)
            if GetCurrentResourceName() ~= resourceName then return end

            if MBT and MBT.Minigames then
                Utils.MbtDebugger("Minigames configuration loaded successfully.")
            else
                Utils.MbtDebugger("^1ERROR: Configuration table 'MBT.Minigames' not found!^7")
            end
        end)
    end
end

return Debug
