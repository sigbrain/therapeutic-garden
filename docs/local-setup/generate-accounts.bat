@echo off
setlocal
rem Run from the project root in a terminal. Passwords are never command arguments.
if not exist "gradlew.bat" (
    echo Run this script from the project root.
    exit /b 1
)
set "TG_CLASSPATH="
for /f "usebackq delims=" %%A in (`call gradlew.bat -q participantPasswordResetClasspath`) do set "TG_CLASSPATH=%%A"
if not defined TG_CLASSPATH exit /b 1
set "TG_JAVA="
for /f "usebackq delims=" %%A in (`call gradlew.bat -q participantPasswordResetJavaExecutable`) do set "TG_JAVA=%%A"
if not defined TG_JAVA exit /b 1
"%TG_JAVA%" --class-path "%TG_CLASSPATH%" docs/local-setup/GenerateAccounts.java
exit /b %ERRORLEVEL%
