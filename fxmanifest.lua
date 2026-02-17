fx_version 'cerulean'
lua54 'yes'
game 'gta5'

name 'mbt_minigames'
author 'Malibù Tech'
version '1.0.3'
description 'A collection of mini-games integrated into the Malibù Tech\'s scripts'

client_scripts {
	'config.lua',
	'core/client.lua'
}

server_scripts {
	'core/server.lua'
}

ui_page 'web/dist/index.html'

files {
	'web/dist/index.html',
	'web/dist/assets/*.js',
	'web/dist/assets/*.css',
	'web/dist/assets/*.ogg', -- If copied successfully
	'web/public/assets/*.ogg', -- Fallback if vite copies them differently
	'web/dist/assets/*.svg',
	'web/public/assets/*.svg',
	'web/dist/assets/*.png',
	'web/public/assets/*.png'
}
