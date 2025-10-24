# Instalación de FFmpeg

## Windows

### Opción 1: Usando Chocolatey (Recomendado)
```powershell
choco install ffmpeg
```

### Opción 2: Descarga Manual
1. Ve a https://www.gyan.dev/ffmpeg/builds/
2. Descarga "ffmpeg-release-full.zip"
3. Extrae el archivo
4. Agrega la carpeta `bin` al PATH de Windows

### Verificar Instalación
```powershell
ffmpeg -version
```

## Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install ffmpeg
```

## macOS
```bash
brew install ffmpeg
```

## Verificar que esté instalado

Después de instalar ffmpeg, verifica que esté en el PATH:

```bash
ffmpeg -version
```

Si ves información de versión, está bien instalado.

## Solución de Problemas

Si ffmpeg no se encuentra:
- Verifica que esté en el PATH
- Reinicia el servidor después de instalar
- En Windows, puede que necesites reiniciar PowerShell/CMD

