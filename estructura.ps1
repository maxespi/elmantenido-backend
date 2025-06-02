# Carpeta raíz (puedes cambiar esto o pasarlo como parámetro)
$root = Get-Location
$output = "$root\estructura.txt"

# Carpetas a excluir (puedes agregar más separadas por coma)
$excluded = @("node_modules", "android", "ios", "build", "dist", ".git", ".vscode", ".idea")

# Limpiar archivo de salida si existe
if (Test-Path $output) { Remove-Item $output }

# Función recursiva para generar estructura
function Escribir-Arbol {
    param (
        [string]$path,
        [int]$nivel
    )

    $indent = ' ' * ($nivel * 2)
    $items = Get-ChildItem -LiteralPath $path | Where-Object {
        -not ($excluded -contains $_.Name)
    }

    foreach ($item in $items) {
        Add-Content -Path $output -Value ("$indent|- " + $item.Name)
        if ($item.PSIsContainer) {
            Escribir-Arbol -path $item.FullName -nivel ($nivel + 1)
        }
    }
}

# Iniciar escritura desde la carpeta raíz
Add-Content -Path $output -Value ("Estructura de: " + $root)
Escribir-Arbol -path $root -nivel 0
