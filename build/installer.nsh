!macro customUnInit
  ; Run the app with the --deactivate-on-uninstall flag before uninstallation proceeds
  ; This allows the Electron app to send a deactivation request to the server
  DetailPrint "Menghapus lisensi dari server (jika terhubung)..."
  ExecWait '"$INSTDIR\CalendarQ.exe" --deactivate-on-uninstall'
!macroend
