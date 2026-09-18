# LLS club subpackage page generator (ASCII-only; Chinese only in UTF-8 JSON)
$ErrorActionPreference = 'Stop'
$root = (Get-ChildItem "c:\Users\songz\OUTPUT" -Directory -Filter "LLS*" | Select-Object -First 1).FullName
$cfg = [System.IO.File]::ReadAllText("$root\.gen\pages.json", [System.Text.Encoding]::UTF8) | ConvertFrom-Json

$utf8 = New-Object System.Text.UTF8Encoding($false)

foreach ($pack in $cfg.PSObject.Properties) {
    $packName = $pack.Name
    foreach ($page in $pack.Value) {
        $pageName = $page[0]
        $title = $page[1]
        $dir = Join-Path $root "$packName\$pageName"
        $leaf = Split-Path $pageName -Leaf
        New-Item -ItemType Directory -Force -Path $dir | Out-Null

        $js = "/* LLS club - $title */`r`nPage({`r`n  data: {},`r`n  onLoad(options) {`r`n    this.options = options || {};`r`n  }`r`n});`r`n"
        $json = "{`r`n  `"usingComponents`": {},`r`n  `"navigationBarTitleText`": `"$title`"`r`n}`r`n"
        $wxml = "<view class=`"app-container`">`r`n  <view class=`"tech-element tech-circle`"></view>`r`n  <view class=`"tech-element tech-lines`"></view>`r`n  <view class=`"stub-page`">`r`n    <view class=`"stub-icon`">L</view>`r`n    <view class=`"stub-title`">$title</view>`r`n    <view class=`"stub-desc`">LLS club | page under development</view>`r`n  </view>`r`n</view>`r`n"
        $wxss = ".stub-page {`r`n  position: relative;`r`n  z-index: 1;`r`n  display: flex;`r`n  flex-direction: column;`r`n  align-items: center;`r`n  padding-top: 30vh;`r`n}`r`n.stub-icon {`r`n  width: 120rpx;`r`n  height: 120rpx;`r`n  border-radius: 30rpx;`r`n  display: flex;`r`n  align-items: center;`r`n  justify-content: center;`r`n  font-size: 52rpx;`r`n  font-weight: 800;`r`n  color: #fff;`r`n  background: linear-gradient(135deg, #04304a, #0e7d95);`r`n  border: 2rpx solid rgba(0, 229, 255, 0.5);`r`n  box-shadow: 0 0 40rpx rgba(0, 229, 255, 0.3);`r`n}`r`n.stub-title {`r`n  margin-top: 32rpx;`r`n  font-size: 34rpx;`r`n  font-weight: 700;`r`n  color: #fff;`r`n}`r`n.stub-desc {`r`n  margin-top: 16rpx;`r`n  font-size: 24rpx;`r`n  color: #5a6b85;`r`n}`r`n"

        [System.IO.File]::WriteAllText("$dir\$leaf.js", $js, $utf8)
        [System.IO.File]::WriteAllText("$dir\$leaf.json", $json, $utf8)
        [System.IO.File]::WriteAllText("$dir\$leaf.wxml", $wxml, $utf8)
        [System.IO.File]::WriteAllText("$dir\$leaf.wxss", $wxss, $utf8)
    }
}
Write-Output "DONE"
