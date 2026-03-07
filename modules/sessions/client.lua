local Sessions = {}
local activeSessions = {}

function Sessions.Get(sessionId)
    return activeSessions[sessionId]
end

function Sessions.SetResponse(sessionId, response)
    if activeSessions[sessionId] then
        activeSessions[sessionId].Response = response
    end
end

function Sessions.Start(type, Utils)
    local sessionId = Utils.GenerateSessionId()
    activeSessions[sessionId] = { Active = true, Response = nil }
    return sessionId
end

function Sessions.Cleanup(sessionId)
    activeSessions[sessionId] = nil
end

return Sessions
