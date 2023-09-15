fx_version 'cerulean'
lua54        'yes'
game         'gta5'

name 'mbt_minigames'
author 'Malibù Tech'
version      '1.0.3'
description 'A collection of mini-games integrated into the Malibù Tech\'s scripts'

client_scripts {
	'core/client.lua'
}

server_scripts {
	'core/server.lua'
}

ui_page 'web/index.html'

files {
	'web/index.html',
	'web/index.js',
	'web/style.css',
	'web/assets/*.ogg'
}