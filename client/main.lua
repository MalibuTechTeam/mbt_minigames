local session = {}
local bh = false


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

RegisterNUICallback("hackingEnd", function (data, cb)
    bh = false
    SetNuiFocus(false, false)
    print("hackingEnd, outcome ", data.outcome, data.sessionId)
    session[data.sessionId].Response = data.outcome
    cb("ok")
end)

local function SendNUI(data)
    SendNUIMessage({
        action = data.Action,
        status = data.Status,
        payload = data.Payload
    })
end

function startHackingSession()
    local sessionId = generateSessionId()
    session[sessionId] = {Active = true, Response = nil}
    
    SendNUI({
        Action = "handleUI",
        Status = true,
        Payload = {
            Id = sessionId
        }
    })

    SetNuiFocus(true, true)

    while session[sessionId].Response == nil do
        Citizen.Wait(5)
    end

    print("Response received: ", session[sessionId].Response)
    local outcome = session[sessionId].Response
    session[sessionId] = nil
    return outcome
end

RegisterCommand("tha", function (source, args, raw)
    bh = not bh
    local outcome = startHackingSession()
    print("outcome test: ", outcome)
end)

exports("startHackingSession", startHackingSession)

