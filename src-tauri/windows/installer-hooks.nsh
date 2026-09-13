; Remove proxy profiles created by Antigravity Patcher.
; Keep the Antigravity application and all unrelated user files intact.
!macro NSIS_HOOK_PREUNINSTALL
  Delete "$LOCALAPPDATA\Programs\Antigravity\ide\config.json"
  Delete "$LOCALAPPDATA\Programs\Antigravity\cli\config.json"
  RMDir "$LOCALAPPDATA\Programs\Antigravity\ide"
  RMDir "$LOCALAPPDATA\Programs\Antigravity\cli"

  Delete "$LOCALAPPDATA\Antigravity\ide\config.json"
  Delete "$LOCALAPPDATA\Antigravity\cli\config.json"
  RMDir "$LOCALAPPDATA\Antigravity\ide"
  RMDir "$LOCALAPPDATA\Antigravity\cli"

  Delete "$PROGRAMFILES\Antigravity\ide\config.json"
  Delete "$PROGRAMFILES\Antigravity\cli\config.json"
  RMDir "$PROGRAMFILES\Antigravity\ide"
  RMDir "$PROGRAMFILES\Antigravity\cli"

  Delete "$PROGRAMFILES32\Antigravity\ide\config.json"
  Delete "$PROGRAMFILES32\Antigravity\cli\config.json"
  RMDir "$PROGRAMFILES32\Antigravity\ide"
  RMDir "$PROGRAMFILES32\Antigravity\cli"

  Delete "$PROGRAMFILES64\Antigravity\ide\config.json"
  Delete "$PROGRAMFILES64\Antigravity\cli\config.json"
  RMDir "$PROGRAMFILES64\Antigravity\ide"
  RMDir "$PROGRAMFILES64\Antigravity\cli"
!macroend
