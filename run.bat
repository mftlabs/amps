setlocal
FOR /F "tokens=* eol=#" %%i in ('type env') do SET %%i
"./_build/prod/rel/amps/bin/amps" start
endlocal
pause