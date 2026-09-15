# Генерация значков приложения.
#
# Запуск: powershell -ExecutionPolicy Bypass -File tools/make-icons.ps1
#
# Зачем отдельные maskable-значки. Android обрезает значок под форму,
# принятую в системе, — круг, скруглённый квадрат, каплю. Обычный значок со
# скруглённой рамкой в круге теряет углы и выглядит обрубленным. У maskable
# фон занимает весь холст, а рисунок помещается в «безопасную зону» — круг
# в 80% ширины, который не обрежут ни при какой форме.
#
# Рисуется программно, без графических редакторов: System.Drawing входит в
# состав Windows, и повторить результат можно в любой момент.

param(
    [string]$Out = (Join-Path (Split-Path -Parent $PSScriptRoot) 'assets')
)

Add-Type -AssemblyName System.Drawing

$paper  = [System.Drawing.ColorTranslator]::FromHtml('#ffffff')
$paper2 = [System.Drawing.ColorTranslator]::FromHtml('#f2ebdf')
$line   = [System.Drawing.ColorTranslator]::FromHtml('#d9cdb8')
$accent = [System.Drawing.ColorTranslator]::FromHtml('#3f7fd8')

function New-RoundedPath {
    param($X, $Y, $W, $H, $R)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $R * 2

    if ($d -ge [Math]::Min($W, $H)) { $d = [Math]::Min($W, $H) - 1 }

    $path.AddArc($X, $Y, $d, $d, 180, 90)
    $path.AddArc($X + $W - $d, $Y, $d, $d, 270, 90)
    $path.AddArc($X + $W - $d, $Y + $H - $d, $d, $d, 0, 90)
    $path.AddArc($X, $Y + $H - $d, $d, $d, 90, 90)
    $path.CloseFigure()

    return $path
}

function New-Icon {
    param([int]$Size, [switch]$Maskable)

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $paper, $paper2, 90)

    if ($Maskable) {
        $g.FillRectangle($grad, $rect)
    } else {
        $pad = $Size * 0.06
        $tile = New-RoundedPath -X $pad -Y $pad -W ($Size - $pad*2) -H ($Size - $pad*2) -R ($Size * 0.22)
        $g.FillPath($grad, $tile)

        $pen = New-Object System.Drawing.Pen($line, [float]($Size * 0.01))
        $g.DrawPath($pen, $tile)
        $pen.Dispose()
        $tile.Dispose()
    }

    $grad.Dispose()

    <#
        Знак: нота на трёх линейках.

        Скрипичный ключ в значке узнаётся хуже, чем кажется: в сорок восемь
        точек его завиток превращается в пятно. Головка со штилем на
        линейках читается при любом размере и говорит то же самое —
        «здесь про ноты».
    #>
    $scale = if ($Maskable) { 0.62 } else { 0.74 }
    $unit = $Size * $scale

    $шаг = $unit * 0.17            # расстояние между линейками
    $centre = $Size / 2

    # Три линейки вместо пяти: пять в мелком размере сливаются в серую заливку
    $linePen = New-Object System.Drawing.Pen($line, [float]($Size * 0.022))
    $linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $x1 = $centre - $unit / 2
    $x2 = $centre + $unit / 2

    foreach ($i in -1, 0, 1) {
        $y = $centre + $i * $шаг
        $g.DrawLine($linePen, [float]$x1, [float]$y, [float]$x2, [float]$y)
    }

    $linePen.Dispose()

    # --- нота: головка на средней линейке, штиль вверх
    $accentBrush = New-Object System.Drawing.SolidBrush($accent)

    $headW = $unit * 0.34
    $headH = $unit * 0.25
    $headX = $centre - $unit * 0.30
    $headY = $centre

    $stemW = $unit * 0.075
    $stemH = $unit * 0.62
    $stemX = $headX + $headW / 2 - $stemW

    $stem = New-RoundedPath -X ($stemX) -Y ($headY - $stemH) -W $stemW -H $stemH -R ($stemW * 0.5)
    $g.FillPath($accentBrush, $stem)
    $stem.Dispose()

    # Наклон головки — тот же, что на стане в приложении: так её рисуют
    $g.TranslateTransform([float]$headX, [float]$headY)
    $g.RotateTransform(-20)
    $g.FillEllipse($accentBrush, [float](-$headW/2), [float](-$headH/2), [float]$headW, [float]$headH)
    $g.ResetTransform()

    $accentBrush.Dispose()
    $g.Dispose()

    return $bmp
}

if (-not (Test-Path $Out)) { New-Item -ItemType Directory -Path $Out | Out-Null }

$plan = @(
    @{ Size = 192; Maskable = $false; Name = 'icon-192.png' },
    @{ Size = 512; Maskable = $false; Name = 'icon-512.png' },
    @{ Size = 192; Maskable = $true;  Name = 'icon-maskable-192.png' },
    @{ Size = 512; Maskable = $true;  Name = 'icon-maskable-512.png' }
)

foreach ($item in $plan) {
    $bmp = if ($item.Maskable) { New-Icon -Size $item.Size -Maskable } else { New-Icon -Size $item.Size }
    $path = Join-Path $Out $item.Name

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    Write-Host "$($item.Name) — $($item.Size)x$($item.Size)$(if ($item.Maskable) { ', maskable' })"
}

Write-Host 'Готово. Поднимите APP_VERSION в sw.js, иначе у установленных приложений останется старый значок.' -ForegroundColor Yellow
