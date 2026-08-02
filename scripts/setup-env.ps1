# Automates setting up Android SDK and Java JDK environment variables on Windows

param (
    [string]$sdkPath = "D:\Android\Sdk",
    [string]$jdkPath = "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"
)

$platformTools = "$sdkPath\platform-tools"
$emulatorPath = "$sdkPath\emulator"
$jdkBinPath = "$jdkPath\bin"

Write-Host "--- Android & Java Environment Setup Helper ---" -ForegroundColor Cyan

# 1. Check if Android SDK directory exists
if (-not (Test-Path $sdkPath)) {
    Write-Host "Warning: Android SDK folder not found at '$sdkPath'." -ForegroundColor Yellow
    Write-Host "Please make sure you have opened Android Studio and completed the initial setup wizard first (selecting '$sdkPath' as your SDK location)." -ForegroundColor Yellow
} else {
    Write-Host "Found Android SDK at: $sdkPath" -ForegroundColor Green
}

# 2. Check if JDK directory exists
if (-not (Test-Path $jdkPath)) {
    Write-Host "Warning: JDK folder not found at '$jdkPath'." -ForegroundColor Yellow
} else {
    Write-Host "Found Java JDK at: $jdkPath" -ForegroundColor Green
}

# 3. Set ANDROID_HOME and JAVA_HOME User variables
Write-Host "Setting environment variables..." -ForegroundColor Cyan
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkPath, "User")
[Environment]::SetEnvironmentVariable("JAVA_HOME", $jdkPath, "User")
Write-Host "ANDROID_HOME has been set to: $sdkPath" -ForegroundColor Green
Write-Host "JAVA_HOME has been set to: $jdkPath" -ForegroundColor Green

# 4. Add SDK tools and Java Bin to User PATH
Write-Host "Adding tools to your User Path..." -ForegroundColor Cyan
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pathUpdated = $false

$entriesToAdd = @($platformTools, $emulatorPath, $jdkBinPath)
foreach ($entry in $entriesToAdd) {
    if ($currentPath -split ';' -notcontains $entry) {
        $currentPath = "$currentPath;$entry"
        $pathUpdated = $true
        Write-Host "Added to Path: $entry" -ForegroundColor Green
    } else {
        Write-Host "Already in Path: $entry" -ForegroundColor Yellow
    }
}

if ($pathUpdated) {
    [Environment]::SetEnvironmentVariable("Path", $currentPath, "User")
    Write-Host "User PATH variable updated successfully!" -ForegroundColor Green
} else {
    Write-Host "No changes needed for PATH." -ForegroundColor Green
}

Write-Host "`nSetup complete! PLEASE RESTART YOUR TERMINAL (and IDE) for the environment variables to reload." -ForegroundColor Cyan
