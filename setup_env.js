const { execSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const isWin = os.platform() === 'win32';
const venvPath = path.join(__dirname, 'venv');
const reqPath = path.join(__dirname, 'requirements.txt');

try {
  console.log('Setting up Python virtual environment...');
  
  if (!fs.existsSync(venvPath)) {
    const pythonCmd = isWin ? 'python' : 'python3';
    execSync(`${pythonCmd} -m venv venv`, { stdio: 'inherit' });
  }

  const pipCmd = isWin 
    ? path.join(venvPath, 'Scripts', 'pip')
    : path.join(venvPath, 'bin', 'pip');

  console.log('Installing Python dependencies...');
  execSync(`"${pipCmd}" install -r "${reqPath}"`, { stdio: 'inherit' });
  
  console.log('Python environment setup complete!');
} catch (error) {
  console.error('Failed to setup Python environment:', error.message);
  process.exit(1);
}
