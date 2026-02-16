# FreeCAD Installation Guide

The backend 3D CAD conversion service requires FreeCAD to convert STEP/IGES files to GLB meshes.

## Installation Instructions

### Windows

1. **Download FreeCAD**
   - Visit: https://www.freecad.org/downloads.php
   - Download the latest stable Windows installer (e.g., `FreeCAD-0.21.2-WIN-x64-installer-1.exe`)

2. **Install FreeCAD**
   - Run the installer
   - Default installation path: `C:\Program Files\FreeCAD 0.21\`
   - Complete the installation wizard

3. **Configure Backend**
   - Create/edit the `.env` file in the `backend/` directory
   - Add the following line (adjust version number if needed):
   ```
   FREECAD_CMD=C:\Program Files\FreeCAD 0.21\bin\FreeCADCmd.exe
   ```

4. **Verify Installation**
   - Open Command Prompt
   - Run: `"C:\Program Files\FreeCAD 0.21\bin\FreeCADCmd.exe" --version`
   - You should see FreeCAD version information

### Linux (Ubuntu/Debian)

1. **Install via APT**
   ```bash
   sudo apt update
   sudo apt install freecad
   ```

2. **Verify Installation**
   ```bash
   freecad --version
   # or
   FreeCADCmd --version
   ```

3. **Configure Backend (if needed)**
   - The default `FreeCADCmd` command should work automatically
   - If using a custom installation path, add to `backend/.env`:
   ```
   FREECAD_CMD=/path/to/FreeCADCmd
   ```

### Linux (AppImage - Recommended for latest version)

1. **Download FreeCAD AppImage**
   - Visit: https://www.freecad.org/downloads.php
   - Download: `FreeCAD_x.x.x-Linux-x86_64.AppImage`

2. **Make it Executable**
   ```bash
   chmod +x FreeCAD_*.AppImage
   sudo mv FreeCAD_*.AppImage /usr/local/bin/freecad
   ```

3. **Configure Backend**
   - Edit `backend/.env`:
   ```
   FREECAD_CMD=/usr/local/bin/freecad
   ```

### macOS

1. **Install via Homebrew**
   ```bash
   brew install freecad
   ```

2. **Verify Installation**
   ```bash
   freecad --version
   ```

3. **Configure Backend (if needed)**
   - If installed via Homebrew, default `FreeCADCmd` should work
   - For manual installation, add to `backend/.env`:
   ```
   FREECAD_CMD=/Applications/FreeCAD.app/Contents/MacOS/FreeCAD
   ```

## Testing the Setup

1. **Install Python Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Start the Backend**
   ```bash
   python -m uvicorn app.main:app --reload
   ```

3. **Upload a STEP File**
   - Use the frontend file upload feature
   - Click "View 3D" on a STEP/IGES file
   - The backend will convert it to GLB using FreeCAD

4. **Check Logs**
   - If conversion fails, check the terminal for error messages
   - Common issues:
     - `FileNotFoundError: FreeCAD not found` → Wrong FREECAD_CMD path
     - `ModuleNotFoundError: No module named 'trimesh'` → Run `pip install trimesh`
     - FreeCAD conversion timeout → File might be too complex

## Troubleshooting

### Windows: "FreeCAD not found"
- Verify installation path in Program Files
- Check if FreeCADCmd.exe exists at the specified path
- Ensure .env file has the correct path with escaped backslashes or forward slashes

### Linux: "Command not found"
- Check if `freecad` or `FreeCADCmd` is in PATH: `which freecad`
- Install via package manager: `sudo apt install freecad`
- Try using full path in .env

### macOS: "Permission denied"
- Check executable permissions: `chmod +x /path/to/freecad`
- For Homebrew installation, ensure command is in PATH

### Conversion Failures
- Check file validity: Ensure STEP/IGES file is valid
- Check FreeCAD version: Some older versions may have compatibility issues
- Review backend logs for detailed error messages
- Test FreeCAD manually:
  ```bash
  # Linux/Mac
  FreeCADCmd -c "import Part; Part.read('/path/to/file.step')"
  
  # Windows
  "C:\Program Files\FreeCAD 0.21\bin\FreeCADCmd.exe" -c "import Part; Part.read('C:\\path\\to\\file.step')"
  ```

## Performance Notes

- First-time conversions can take 5-30 seconds depending on file complexity
- Subsequent loads are instant (GLB is cached in MinIO)
- Large assemblies (>100MB STEP files) may take longer
- Consider pre-generating GLB files during upload for better UX (future enhancement)

## Alternative: Using FreeCAD Docker (Advanced)

For production deployments, consider using FreeCAD in Docker:

```dockerfile
FROM ubuntu:22.04
RUN apt update && apt install -y freecad python3 python3-pip
# ... rest of your Dockerfile
```

This ensures consistent FreeCAD version across environments.
