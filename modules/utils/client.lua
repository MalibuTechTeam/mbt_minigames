local Utils = {}

local _resName = GetCurrentResourceName()

local function _prettyTable(t, indent)
    indent = indent or 1
    local pad = string.rep("  ", indent)
    local lines = {}
    for k, v in pairs(t) do
        local key = type(k) == "number" and ("[" .. k .. "]") or tostring(k)
        if type(v) == "table" then
            lines[#lines + 1] = pad .. key .. " = " .. _prettyTable(v, indent + 1)
        else
            lines[#lines + 1] = pad .. key .. " = " .. tostring(v)
        end
    end
    return "{\n" .. table.concat(lines, ",\n") .. "\n" .. string.rep("  ", indent - 1) .. "}"
end

local function _serialize(v)
    if type(v) == "table" then return _prettyTable(v) end
    return tostring(v)
end

local function _callerLoc(level)
    local info = debug.getinfo(level, "Sl")
    if not info then return "?" end
    local src = info.short_src:gsub("^@@?[^/\\]+[/\\]", "")
    return src .. ":" .. (info.currentline or "?")
end

local function _parts(...)
    local t = {}
    for i = 1, select("#", ...) do t[i] = _serialize(select(i, ...)) end
    return table.concat(t, " ")
end

---@param ... any
function Utils.mbtDebugger(...)
    if not MBT.Debug then return end
    print(("^2[%s]^7 ^3%s^7 \xc2\xbb %s^0"):format(_resName, _callerLoc(3), _parts(...)))
end

---@param ... any
function Utils.mbtWarn(...)
    print(("^2[%s]^7 ^3[WARN] %s^7 \xc2\xbb %s^0"):format(_resName, _callerLoc(3), _parts(...)))
end

---@param ... any
function Utils.mbtError(...)
    print(("^2[%s]^7 ^1[ERROR] %s^7 \xc2\xbb %s^0"):format(_resName, _callerLoc(3), _parts(...)))
end

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
