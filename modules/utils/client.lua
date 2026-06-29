local Utils = {}

-- Logging — the canonical leveled logger lives in modules/utils/logger.lua
-- (shared_script, loaded before this). Alias it onto Utils so the existing
-- call sites keep working; new code can use Utils.Info/Warn/Error directly.
Utils.Debug = MBTLog.Debug
Utils.Info = MBTLog.Info
Utils.Warn = MBTLog.Warn
Utils.Error = MBTLog.Error
Utils.mbtDebugger = MBTLog.Debug -- back-compat alias
Utils.mbtWarn = MBTLog.Warn      -- back-compat alias
Utils.mbtError = MBTLog.Error    -- back-compat alias

---@param animdict string
---@return boolean
function Utils.LoadAnimDict(animdict)
    if not DoesAnimDictExist(animdict) then
        Utils.mbtWarn("Animation dictionary does not exist:", animdict)
        return false
    end

    local timeout = false
    SetTimeout(3000, function() timeout = true end)

    while (not HasAnimDictLoaded(animdict)) and not timeout do
        RequestAnimDict(animdict)
        Citizen.Wait(10)
    end
    if timeout then
        Utils.mbtWarn("Failed to load animation dictionary:", animdict)
        return false
    end
    return true
end

---@param model string
---@return boolean
function Utils.LoadModel(model)
    local timeout = false
    SetTimeout(5000, function() timeout = true end)

    local hashModel = GetHashKey(model)
    repeat
        RequestModel(hashModel)
        Wait(50)
    until HasModelLoaded(hashModel) or timeout

    if timeout then
        Utils.mbtWarn("Failed to load model:", model)
        return false
    end
    return true
end

return Utils
