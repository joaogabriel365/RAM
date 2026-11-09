from . import achados, auth, face, games, presets, system

routers = [auth.router, face.router, presets.router, games.router, achados.router, system.router]
