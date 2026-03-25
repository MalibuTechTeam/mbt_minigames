local Sessions = {}
local activeSessions = {}

local function generateId()
    local s = ""
    for i = 1, 20 do
        s = s .. string.char(math.random(97, 122))
    end
    return s
end

function Sessions.Get(sessionId)
    return activeSessions[sessionId]
end

function Sessions.SetResponse(sessionId, response)
    if activeSessions[sessionId] then
        activeSessions[sessionId].Response = response
    end
end

function Sessions.Start()
    local sessionId = generateId()
    activeSessions[sessionId] = { Active = true, Response = nil }
    return sessionId
end

function Sessions.Cleanup(sessionId)
    activeSessions[sessionId] = nil
end

return Sessions
