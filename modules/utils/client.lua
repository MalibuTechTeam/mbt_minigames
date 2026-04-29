local Utils = {}

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

---@param animdict string
---@return boolean
function Utils.LoadAnimDict(animdict)
    if not DoesAnimDictExist(animdict) then
        Utils.MbtDebugger("^1Animation dictionary does not exist: " .. tostring(animdict) .. "^7")
        return false
    end

    local timeout = false
    SetTimeout(3000, function() timeout = true end)

    while (not HasAnimDictLoaded(animdict)) and not timeout do
        RequestAnimDict(animdict)
        Citizen.Wait(10)
    end
    if timeout then
        Utils.MbtDebugger("^1Failed to load animation dictionary: " .. tostring(animdict) .. "^7")
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
        Utils.MbtDebugger("^1Failed to load model: " .. tostring(model) .. "^7")
        return false
    end
    return true
end

return Utils
