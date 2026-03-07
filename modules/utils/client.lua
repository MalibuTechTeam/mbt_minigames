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

function Utils.GenerateSessionId()
    local randomStr = ""
    for i = 1, 20 do
        randomStr = randomStr .. string.char(math.random(97, 122))
    end
    return randomStr
end

---@param animdict string
function Utils.LoadAnimDict(animdict)
    if not DoesAnimDictExist(animdict) then return end

    local timeout = false
    SetTimeout(3000, function() timeout = true end)

    while (not HasAnimDictLoaded(animdict)) and not timeout do
        RequestAnimDict(animdict)
        Citizen.Wait(10)
    end
    if timeout then
        Utils.MbtDebugger("Failed to load animation dictionary: " .. tostring(animdict))
    end
end

---@param model string
function Utils.LoadModel(model)
    local timeout = false
    SetTimeout(5000, function() timeout = true end)

    local hashModel = GetHashKey(model)
    repeat
        RequestModel(hashModel)
        Wait(50)
    until HasModelLoaded(hashModel) or timeout
end

return Utils
