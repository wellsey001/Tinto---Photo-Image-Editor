# Tinto's "Updating" screen on Windows. Tinto has to close completely while its installer runs,
# so this small window keeps the animated Tinto splash on screen until the new version opens.
# Started by Tinto (main.js) just before it closes to install an update.
param(
  [Parameter(Mandatory = $true)][string]$Gif,
  [int]$OldPid = 0,
  [string]$ExeName = 'Tinto',
  [int]$TimeoutSec = 180
)
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type -Namespace TintoUpd -Name Win -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool ShowWindow(System.IntPtr hWnd, int nCmdShow);
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(System.IntPtr hWnd);
'@
[System.Windows.Forms.Application]::EnableVisualStyles()

$img = [System.Drawing.Image]::FromFile($Gif)
$w = $img.Width; $h = $img.Height
$form = New-Object System.Windows.Forms.Form
$form.FormBorderStyle = 'None'
$form.StartPosition = 'CenterScreen'
$form.ShowInTaskbar = $false
$form.TopMost = $true
$form.Text = 'Updating Tinto'
$form.BackColor = [System.Drawing.Color]::FromArgb(18, 19, 22)
$form.ClientSize = New-Object System.Drawing.Size($w, $h)
$pic = New-Object System.Windows.Forms.PictureBox
$pic.Dock = 'Fill'
$pic.Image = $img
$form.Controls.Add($pic)

# rounded corners, like the splash in the app
$r = 26
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc(0, 0, 2 * $r, 2 * $r, 180, 90)
$path.AddArc($w - 2 * $r, 0, 2 * $r, 2 * $r, 270, 90)
$path.AddArc($w - 2 * $r, $h - 2 * $r, 2 * $r, 2 * $r, 0, 90)
$path.AddArc(0, $h - 2 * $r, 2 * $r, 2 * $r, 90, 90)
$path.CloseFigure()
$form.Region = New-Object System.Drawing.Region($path)

$script:start = Get-Date
$script:oldGone = ($OldPid -le 0)
$script:seenNew = $null
$script:ticks = 0
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 400
$timer.Add_Tick({
  $script:ticks++
  if ($script:ticks -le 2) {
    # make sure the window really shows, even when started with a hidden window style
    [TintoUpd.Win]::ShowWindow($form.Handle, 5) | Out-Null
    [TintoUpd.Win]::SetForegroundWindow($form.Handle) | Out-Null
  }
  if (-not $script:oldGone) {
    if (-not (Get-Process -Id $OldPid -ErrorAction SilentlyContinue)) { $script:oldGone = $true }
  } else {
    # the new version has started: give it a moment to show its own splash, then hand over
    $new = Get-Process -Name $ExeName -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -gt $script:start }
    if ($new) {
      if (-not $script:seenNew) { $script:seenNew = Get-Date }
      elseif (((Get-Date) - $script:seenNew).TotalSeconds -gt 1.2) { $timer.Stop(); $form.Close() }
    }
  }
  if (((Get-Date) - $script:start).TotalSeconds -gt $TimeoutSec) { $timer.Stop(); $form.Close() }
})
$timer.Start()
[System.Windows.Forms.Application]::Run($form)
$img.Dispose()
