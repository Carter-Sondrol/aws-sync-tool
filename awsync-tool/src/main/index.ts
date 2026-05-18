import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { readFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { parse } from 'ini'

// ─── AWS Config Detection ──────────────────────────────────────────────────

interface AWSProfile {
  source: string
  profileName: string
  region?: string
  roleArn?: string
  sourceProfile?: string
  ssoStartUrl?: string
  error?: string
}

function parseAwsProfiles(): AWSProfile[] {
  const profiles: AWSProfile[] = []
  const home = homedir()
  const credentialsPath = join(home, '.aws', 'credentials')
  const configPath = join(home, '.aws', 'config')

  // Parse credentials file
  const credentialsMap = new Map<string, Record<string, string>>()
  if (existsSync(credentialsPath)) {
    try {
      const credentialsContent = readFileSync(credentialsPath, 'utf-8')
      const credentials = parse(credentialsContent) as Record<string, Record<string, string>>
      for (const [profile, data] of Object.entries(credentials)) {
        credentialsMap.set(profile, data)
      }
    } catch (err) {
      console.error('Failed to parse AWS credentials file:', err)
    }
  }

  // Parse config file
  const configMap = new Map<string, Record<string, string>>()
  if (existsSync(configPath)) {
    try {
      const configContent = readFileSync(configPath, 'utf-8')
      const config = parse(configContent) as Record<string, Record<string, string>>
      for (const [key, data] of Object.entries(config)) {
        // Config file uses "profile NAME" as keys, strip that prefix
        const profileName = key.replace(/^profile\s+/, '')
        configMap.set(profileName, data)
      }
    } catch (err) {
      console.error('Failed to parse AWS config file:', err)
    }
  }

  // Merge and create profile list
  const allProfiles = new Set([...credentialsMap.keys(), ...configMap.keys()])

  for (const profileName of allProfiles) {
    const creds = credentialsMap.get(profileName) || {}
    const config = configMap.get(profileName) || {}

    // Check if profile has valid credentials
    if (!creds.aws_access_key_id && !config.sso_start_url) {
      continue // Skip profiles without credentials or SSO
    }

    profiles.push({
      source: 'aws-cli',
      profileName,
      region: config.region || 'us-east-1',
      roleArn: config.role_arn,
      sourceProfile: config.source_profile,
      ssoStartUrl: config.sso_start_url,
    })
  }

  return profiles
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

ipcMain.handle('aws:detect-profiles', async (): Promise<AWSProfile[]> => {
  try {
    return parseAwsProfiles()
  } catch (err) {
    console.error('Error detecting AWS profiles:', err)
    return []
  }
})

// ─── Window Creation ───────────────────────────────────────────────────────

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
