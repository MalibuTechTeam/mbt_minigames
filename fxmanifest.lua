fx_version 'cerulean'
lua54 'yes'
game 'gta5'

name 'mbt_minigames'
author 'Malibù Tech'
version      '2.0.0-rc.3'
description 'A collection of mini-games integrated into the Malibù Tech\'s scripts'

shared_scripts {
	'modules/module.lua',
	'config.lua'
}

client_scripts {
	'modules/**/client.lua',
	'core/client.lua'
}

server_scripts {
	'core/server.lua'
}

ui_page 'web/dist/index.html'

files {
	'web/dist/index.html',
	'web/dist/assets/**'
}
