local Utils = loadModule('modules.utils.client')

local Debug = {}

function Debug.Initialize(actions)
    if MBT.Debug then
        RegisterCommand("testminigame", function(source, args)
            local type = args[1] or "code_match"
            local diff = args[2] or "Easy"
            Utils.MbtDebugger("Debug Command: Testing " .. type .. " on " .. diff)
            if actions and actions.startRepairSession then
                local outcome = actions.startRepairSession({ type = type, difficulty = diff })
                Utils.MbtDebugger("Debug Result: " .. tostring(outcome))
            else
                Utils.MbtDebugger("^1ERROR: startRepairSession not provided to debug module!^7")
            end
        end, false)

        RegisterCommand("testscene", function(source, args)
            local type = args[1] or "bolt_turn"
            local finalAnimData = MBT.Animations[type]
            if not finalAnimData then
                Utils.MbtDebugger("No scene configuration found for type: " .. type)
                return
            end

            local ped = PlayerPedId()
            SetCurrentPedWeapon(ped, GetHashKey("WEAPON_UNARMED"), true)
            local pedCoords = GetEntityCoords(ped)
            Utils.MbtDebugger("Testing Scene: " .. type .. " | Dict: " .. tostring(finalAnimData.Dict))

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
    end

    AddEventHandler('onClientResourceStart', function(resourceName)
        if GetCurrentResourceName() ~= resourceName then return end

        if MBT and MBT.Locale then
            Utils.MbtDebugger("Locale system and Difficulty profiles loaded.")
            Utils.MbtDebugger("Configuration loaded successfully.")
        else
            Utils.MbtDebugger("^1ERROR: Configuration table 'MBT.Locale' not found!^7")
        end
    end)
end

return Debug
