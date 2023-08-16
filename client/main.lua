local session = {}
local bh = false

RegisterNUICallback("hackingEnd", function (data, cb)
    bh = false
    SetNuiFocus(false, false)
    session[data.sessionId].Response = data.outcome

    Wait(2000)

    SendNUI({
        Action = "handleUI",
        Status = false,
        Payload = {}
    })

    cb("ok")
end)

local function SendNUI(data)
    SendNUIMessage(data)
end

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

function startHackingSession(data)
    local sessionId = generateSessionId()
    session[sessionId] = {Active = true, Response = nil}
    

    local ped = PlayerPedId()
    local pedCoords = GetEntityCoords(ped)
    local pedRotation= GetEntityRotation(ped)
	local animDict = "anim@heists@ornate_bank@hack"

    loadAnimDict(animDict)
	loadModel("hei_prop_hst_laptop")
	loadModel("hei_p_m_bag_var22_arm_s")
	
	SetFollowPedCamViewMode(4)
	
	local animPos = GetAnimInitialOffsetPosition(animDict, "hack_enter", pedCoords[1], pedCoords[2], pedCoords[3]+0.3, pedCoords, 0, 2) 
	local animPos2 = GetAnimInitialOffsetPosition(animDict, "hack_loop", pedCoords[1], pedCoords[2], pedCoords[3]+0.3, pedCoords, 0, 2)
	local animPos3 = GetAnimInitialOffsetPosition(animDict, "hack_exit", pedCoords[1], pedCoords[2], pedCoords[3]+0.3, pedCoords, 0, 2)

	FreezeEntityPosition(ped, true)

	local netScene = NetworkCreateSynchronisedScene(animPos.x, animPos.y, animPos.z, pedRotation.x, pedRotation.y, pedRotation.z, 2, false, false, 1065353216, 0, 1.3)
	NetworkAddPedToSynchronisedScene(ped, netScene, animDict, "hack_enter", 1.5, -4.0, 1, 16, 1148846080, 0)
	local bag = CreateObject(GetHashKey("hei_p_m_bag_var22_arm_s"), pedCoords.x, pedCoords.y, pedCoords.z, 1, 1, 0)
	NetworkAddEntityToSynchronisedScene(bag, netScene, animDict, "hack_enter_bag", 4.0, -8.0, 1)
	local laptop = CreateObject(GetHashKey("hei_prop_hst_laptop"), pedCoords.x, pedCoords.y, pedCoords.z, 1, 1, 0)
	NetworkAddEntityToSynchronisedScene(laptop, netScene, animDict, "hack_enter_laptop", 4.0, -8.0, 1)
	
	local netScene2 = NetworkCreateSynchronisedScene(animPos2.x, animPos2.y, animPos2.z, pedRotation.x, pedRotation.y, pedRotation.z, 2, true, false, 1065353216, 0, 1.3)
	NetworkAddPedToSynchronisedScene(ped, netScene2, animDict, "hack_loop", 1.5, -4.0, 1, 16, 1148846080, 0)
	NetworkAddEntityToSynchronisedScene(bag, netScene2, animDict, "hack_loop_bag", 4.0, -8.0, 1)
	NetworkAddEntityToSynchronisedScene(laptop, netScene2, animDict, "hack_loop_laptop", 4.0, -8.0, 1)

	local netScene3 = NetworkCreateSynchronisedScene(animPos3.x, animPos3.y, animPos3.z, pedRotation.x, pedRotation.y, pedRotation.z, 2, false, false, 1065353216, 0, 1.3)
	NetworkAddPedToSynchronisedScene(ped, netScene3, animDict, "hack_exit", 1.5, -4.0, 1, 16, 1148846080, 0)
	NetworkAddEntityToSynchronisedScene(bag, netScene3, animDict, "hack_exit_bag", 4.0, -8.0, 1)
	NetworkAddEntityToSynchronisedScene(laptop, netScene3, animDict, "hack_exit_laptop", 4.0, -8.0, 1)
	Citizen.Wait(500)

	NetworkStartSynchronisedScene(netScene)
	Citizen.Wait(4500) 
	NetworkStopSynchronisedScene(netScene)
	NetworkStartSynchronisedScene(netScene2)

    SendNUI({
        Action = "handleUI",
        Status = true,
        Payload = {
            Id = sessionId,
            TimeLimit = data.Time
        }
    })

    SetNuiFocus(true, true)

    while session[sessionId].Response == nil do
        Citizen.Wait(5)
    end

    local outcome = session[sessionId].Response

    NetworkStopSynchronisedScene(netScene2)

    NetworkStartSynchronisedScene(netScene3)
	Citizen.Wait(6000)
	DeleteObject(laptop)
	DeleteObject(bag)
	NetworkStopSynchronisedScene(netScene3)

    SetFollowPedCamViewMode(0)
    FreezeEntityPosition(ped, false)

    session[sessionId] = nil

    return outcome
end

function loadAnimDict(animdict)
	while(not HasAnimDictLoaded(animdict)) do
		RequestAnimDict(animdict)
		Citizen.Wait(1)
	end
end

function loadModel(model)
    local timeout = false
    SetTimeout(5000, function() timeout = true end)

    local hashModel = GetHashKey(model)
    repeat
        RequestModel(hashModel)
        Wait(50)
    until HasModelLoaded(hashModel) or timeout
end

exports('startHackingSession', function(data)
    return startHackingSession(data)
end)
