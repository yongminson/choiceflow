param(
  [string]$SourceLogo = "",
  [string]$FeatureGraphic = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path

if ([string]::IsNullOrWhiteSpace($SourceLogo)) {
  $SourceLogo = Join-Path $projectRoot "platforms\android\assets\logo-source.png"
}
if ([string]::IsNullOrWhiteSpace($FeatureGraphic)) {
  $FeatureGraphic = Join-Path $projectRoot "platforms\android\assets\feature-source.png"
}

$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
$resRoot = Join-Path $projectRoot "platforms\android\android\app\src\main\res"
$outputRoot = Join-Path $projectRoot "platforms\android\assets\generated"
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

# The visible alpha bounds of the supplied 2048x2048 logo. Keeping this crop
# stable prevents the large transparent lower area from making the app mark tiny.
$cropWidth = 1748
$cropHeight = 980
$cropX = 150
$cropY = 534

function Get-Even([double]$value) {
  $rounded = [Math]::Max(2, [Math]::Round($value))
  if (($rounded % 2) -ne 0) { $rounded -= 1 }
  return [int]$rounded
}

function Render-LogoAsset {
  param(
    [string]$Output,
    [int]$Width,
    [int]$Height,
    [double]$ContentRatio,
    [string]$PadColor
  )

  $scale = [Math]::Min(
    ($Width * $ContentRatio) / $cropWidth,
    ($Height * $ContentRatio) / $cropHeight
  )
  $logoWidth = Get-Even ($cropWidth * $scale)
  $logoHeight = Get-Even ($cropHeight * $scale)
  # The supplied raster contains an opaque near-black rectangle between the
  # colored mark and its transparent outer canvas. Key out only that neutral
  # background before scaling; the blue/purple artwork and white letters stay.
  $logoFilter = "crop=${cropWidth}:${cropHeight}:${cropX}:${cropY},colorkey=0x000000:0.075:0.12,scale=${logoWidth}:${logoHeight}:flags=lanczos"

  if ($PadColor -eq "black@0") {
    $filter = "${logoFilter},pad=${Width}:${Height}:(ow-iw)/2:(oh-ih)/2:color=black@0,format=rgba"
    & $ffmpeg -y -hide_banner -loglevel error -i $SourceLogo -vf $filter -frames:v 1 $Output
  } else {
    $filter = "[0:v]${logoFilter}[logo];color=c=${PadColor}:s=${Width}x${Height}:d=1[bg];[bg][logo]overlay=(W-w)/2:(H-h)/2:shortest=1,format=rgba[out]"
    & $ffmpeg -y -hide_banner -loglevel error -i $SourceLogo -filter_complex $filter -map "[out]" -frames:v 1 $Output
  }
  if ($LASTEXITCODE -ne 0) { throw "Failed to render $Output" }
}

# Google Play listing icon. Keep this separate from the original source.
Render-LogoAsset `
  -Output (Join-Path $outputRoot "ChoiceFlow_app_icon_512.png") `
  -Width 512 -Height 512 -ContentRatio 0.78 -PadColor "0xF7F8FB"

# Android legacy and adaptive launcher assets at the exact generated densities.
Get-ChildItem -Path $resRoot -Recurse -Filter "ic_launcher.png" | ForEach-Object {
  Add-Type -AssemblyName System.Drawing
  $image = [System.Drawing.Image]::FromFile($_.FullName)
  $width, $height = $image.Width, $image.Height
  $image.Dispose()
  Render-LogoAsset -Output $_.FullName -Width $width -Height $height -ContentRatio 0.78 -PadColor "0xF7F8FB"
}

Get-ChildItem -Path $resRoot -Recurse -Filter "ic_launcher_round.png" | ForEach-Object {
  Add-Type -AssemblyName System.Drawing
  $image = [System.Drawing.Image]::FromFile($_.FullName)
  $width, $height = $image.Width, $image.Height
  $image.Dispose()
  Render-LogoAsset -Output $_.FullName -Width $width -Height $height -ContentRatio 0.78 -PadColor "0xF7F8FB"
}

Get-ChildItem -Path $resRoot -Recurse -Filter "ic_launcher_foreground.png" | ForEach-Object {
  Add-Type -AssemblyName System.Drawing
  $image = [System.Drawing.Image]::FromFile($_.FullName)
  $width, $height = $image.Width, $image.Height
  $image.Dispose()
  Render-LogoAsset -Output $_.FullName -Width $width -Height $height -ContentRatio 0.66 -PadColor "black@0"
}

# Native splash rasters retain their generated dimensions and use the brand mark.
Get-ChildItem -Path $resRoot -Recurse -Filter "splash.png" | ForEach-Object {
  Add-Type -AssemblyName System.Drawing
  $image = [System.Drawing.Image]::FromFile($_.FullName)
  $width, $height = $image.Width, $image.Height
  $image.Dispose()
  Render-LogoAsset -Output $_.FullName -Width $width -Height $height -ContentRatio 0.48 -PadColor "0xF7F8FB"
}

# Google Play requires an exact 1024x500 feature graphic.
$featureOutput = Join-Path $outputRoot "ChoiceFlow_feature_graphic_1024x500.png"
& $ffmpeg -y -hide_banner -loglevel error -i $FeatureGraphic -vf "scale=1024:500:flags=lanczos" -frames:v 1 $featureOutput
if ($LASTEXITCODE -ne 0) { throw "Failed to render $featureOutput" }

Write-Output "Android and store assets generated successfully."
Write-Output (Join-Path $outputRoot "ChoiceFlow_app_icon_512.png")
Write-Output $featureOutput
