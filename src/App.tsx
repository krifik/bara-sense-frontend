import React, { useState, useEffect, Fragment } from 'react'

interface Device {
  id: string
  name: string
  status: boolean
  power?: number
  allowed_roles?: string
  priority?: number
  voltage_volts?: number | string
  current_amps?: number | string
}

interface DeviceBreakdown {
  id: string
  name: string
  power_watt: number
  voltage_volts: string
  current_amps: string
  status: boolean
  kwh_today: string
  cost_idr: string
  cost_today_idr?: string
  daily_estimated_kwh?: string
  daily_estimated_cost_idr?: string
  monthly_estimated_cost_idr?: string
  percentage: string
}

interface HourlyUsage {
  hour: string
  kwh: number
  cost: number
}

interface DailyUsage {
  day: string
  date: string
  date_raw?: string
  kwh: number
  cost: number
}

interface DailyHistoryDeviceItem {
  device_id: string
  device_name: string
  kwh: number
  cost_idr: number
  avg_power_watt: number
  peak_power_watt: number
  power_watt?: number
}

interface DailyHistoryItem {
  date_raw: string
  date: string
  full_date: string
  day: string
  is_today: boolean
  kwh: number
  cost: number
  avg_power_watt: number
  peak_power_watt: number
  status_efficiency: string
  devices: DailyHistoryDeviceItem[]
  device_count: number
}

interface DailyHistorySummary {
  total_kwh: number
  total_cost_idr: number
  avg_daily_kwh: number
  avg_daily_cost_idr: number
  highest_day?: DailyHistoryItem
  lowest_day?: DailyHistoryItem
}

interface Schedule {
  id: number
  device_id: string
  device_name: string
  action: 'ON' | 'OFF'
  time_target: string
  days: string
  is_active: boolean
  created_at?: string
}

interface DeviceTimer {
  device_id: string
  device_name: string
  target_action: string
  expires_at: string
  duration_minutes: number
  remaining_seconds: number
}

interface SceneAction {
  device_id: string
  status: boolean
}

interface Scene {
  id: string
  name: string
  icon: string
  description: string
  actions: SceneAction[]
  is_preset: boolean
  created_at?: string
}

interface PowerGuardConfig {
  max_watt_limit: number
  is_enabled: boolean
  cutoff_duration_sec: number
  last_triggered_at: string
  current_total_watts: number
  is_overloaded: boolean
  load_percentage: string
}

interface BudgetSettings {
  monthly_budget_idr: number
  warning_threshold_pct: number
  current_month_cost_idr: number
  current_month_kwh: number
  usage_pct: string
  projected_month_cost_idr: number
  is_near_limit: boolean
  is_exceeded: boolean
}

interface ScannedDeviceItem {
  id: string
  name: string
  product_name: string
  model: string
  category: string
  category_label: string
  category_icon: string
  online: boolean
  ip: string
  status: boolean
  power_watt: number
  voltage_volts: number
  current_amps: number
  already_registered: boolean
  registered_name: string
  registered_priority: number
  discovery_source: string
}

interface ScanResult {
  status: string
  cloud_connected: boolean
  total_discovered: number
  new_devices_count: number
  registered_count: number
  devices: ScannedDeviceItem[]
  scanned_at: string
  message?: string
}

interface TelegramConfig {
  is_enabled: boolean
  chat_id: string
  masked_bot_token: string
  has_token: boolean
  notify_on_overload: boolean
  notify_on_leak: boolean
  daily_digest_time: string
}

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  title?: string
}

interface PlnTariffOption {
  code: string
  name: string
  power_category: string
  rate_per_kwh: number
  description: string
}

interface AnalyticsData {
  total_active_power_watts: number
  total_kwh_today: string
  estimated_cost_today_idr: string
  estimated_cost_month_idr: string
  predicted_kwh_month: string
  predicted_cost_month_idr: string
  efficiency_score: number
  overload_risk: string
  peak_usage_hour: string
  selected_tariff_code: string
  selected_tariff_rate: number
  tariff_options: PlnTariffOption[]
  recommendations: string[]
  tariff_rate_per_kwh: number
  device_breakdown: DeviceBreakdown[]
  hourly_usage: HourlyUsage[]
  daily_usage: DailyUsage[]
}

interface User {
  id: number
  username: string
  name: string
  role: 'admin' | 'operator' | 'viewer'
}

const DEFAULT_USERS: User[] = [
  { id: 1, username: 'admin', name: 'System Administrator', role: 'admin' },
  { id: 2, username: 'operator', name: 'Anggota Keluarga / Operator', role: 'operator' },
  { id: 3, username: 'guest', name: 'Pengunjung / Tamu', role: 'viewer' },
]

interface PermissionItem {
  id: string
  feature: string
  desc: string
  admin: boolean
  operator: boolean
  viewer: boolean
}

const DEFAULT_PERMISSIONS: PermissionItem[] = [
  {
    id: 'read_telemetry',
    feature: 'Membaca Perangkat & Telemetri Analitik',
    desc: 'Melihat status saklar, daya (Watt), tegangan (V), dan arus (A) secara live',
    admin: true,
    operator: true,
    viewer: true,
  },
  {
    id: 'switch_control',
    feature: 'Saklar Kontrol ON/OFF Perangkat',
    desc: 'Mengontrol saklar dan memantau daya perangkat pintar',
    admin: true,
    operator: true,
    viewer: false,
  },
  {
    id: 'change_tariff',
    feature: 'Ubah Preferensi Golongan Tarif PLN',
    desc: 'Mengubah tarif subsidi/non-subsidi PLN untuk estimasi biaya',
    admin: true,
    operator: true,
    viewer: false,
  },
  {
    id: 'register_device',
    feature: 'Daftarkan Perangkat Baru',
    desc: 'Menambahkan ID perangkat baru & konfigurasinya ke sistem',
    admin: true,
    operator: false,
    viewer: false,
  },
  {
    id: 'delete_device',
    feature: 'Hapus Perangkat & Riwayat Daya',
    desc: 'Menghapus perangkat fisik beserta riwayat log daya dari database',
    admin: true,
    operator: false,
    viewer: false,
  },
  {
    id: 'manage_rbac',
    feature: 'Pengaturan RBAC & Hak Akses User',
    desc: 'Mengubah peran (Admin, Operator, Viewer) pada pengguna terdaftar & matriks hak akses',
    admin: true,
    operator: false,
    viewer: false,
  },
]

const APP_NAME = import.meta.env.VITE_APP_NAME || 'BARA-Sense'
const APP_TAGLINE = import.meta.env.VITE_APP_TAGLINE || 'Building Automation & Realtime Analytics'
const DEFAULT_CONFIG_TARIFF = import.meta.env.VITE_DEFAULT_TARIFF || '1300-2200VA'
const DEFAULT_CONFIG_HISTORY_DAYS = parseInt(import.meta.env.VITE_DEFAULT_HISTORY_DAYS || '7', 10) || 7
const POLL_INTERVAL_MS = parseInt(import.meta.env.VITE_POLL_INTERVAL_MS || '10000', 10) || 10000

const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')
  }
  if (typeof window !== 'undefined') {
    if (window.location.port === '5173') {
      return 'http://localhost:3000'
    }
    return window.location.origin
  }
  return 'http://localhost:3000'
}

const API_BASE = getApiBase()

const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.port === '5173' ? 'localhost:3000' : window.location.host
    return `${protocol}//${host}/ws`
  }
  return 'ws://localhost:3000/ws'
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'quick' | 'dashboard' | 'devices' | 'analytics' | 'settings'>(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768
      const isGuest = localStorage.getItem('home_auth_user') === null
      if (isMobile || isGuest) return 'quick'
    }
    return 'quick'
  })
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [cloudStatus, setCloudStatus] = useState<string>('Checking...')
  const [toggleLoading, setToggleLoading] = useState<Record<string, boolean>>({})

  // Toast Notification System
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev.slice(-4), { id, type, message, title }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4500)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const notify = {
    success: (msg: string, title: string = 'Berhasil') => addToast(msg, 'success', title),
    error: (msg: string, title: string = 'Terjadi Kesalahan') => addToast(msg, 'error', title),
    warning: (msg: string, title: string = 'Peringatan') => addToast(msg, 'warning', title),
    info: (msg: string, title: string = 'Informasi') => addToast(msg, 'info', title),
  }

  // Authentikasi State & Persistence (Default: Pengunjung / Review Mode)
  const DEFAULT_GUEST_USER: User = { id: 3, username: 'guest', name: 'Pengunjung (Review Mode)', role: 'viewer' }
  const DEFAULT_GUEST_TOKEN = 'token_3_viewer_guest'

  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem('home_auth_token') || DEFAULT_GUEST_TOKEN)
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('home_auth_user')
    if (saved) {
      try { return JSON.parse(saved) } catch (e) {}
    }
    return DEFAULT_GUEST_USER
  })

  // Modal Login Overlay
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [systemLogs, setSystemLogs] = useState<string[]>([])
  const [isFetchingLogs, setIsFetchingLogs] = useState(false)

  const fetchSystemLogs = async () => {
    setIsFetchingLogs(true)
    try {
      const res = await fetch(`${API_BASE}/api/system/logs`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
      const data = await res.json()
      if (res.ok && data.status === 'success') {
        setSystemLogs(data.logs || [])
        setShowLogsModal(true)
      } else {
        notify.error('Gagal mengambil log: ' + (data.error || 'Unknown error'))
      }
    } catch (err: any) {
      notify.error('Error mengambil log: ' + err.message)
    } finally {
      setIsFetchingLogs(false)
    }
  }

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('admin')
  const [loginPassword, setLoginPassword] = useState('admin')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Change Password State
  const [showChangePassModal, setShowChangePassModal] = useState(false)
  const [passTargetUser, setPassTargetUser] = useState<User | null>(null)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changePassLoading, setChangePassLoading] = useState(false)
  const [changePassError, setChangePassError] = useState('')
  const [changePassSuccess, setChangePassSuccess] = useState('')

  // RBAC & User Access Control State
  const [usersList, setUsersList] = useState<User[]>(DEFAULT_USERS)
  const [showRbacModal, setShowRbacModal] = useState(false)
  const [rbacActiveTab, setRbacActiveTab] = useState<'matrix' | 'users' | 'devices' | 'telegram'>('matrix')
  const [rbacAlert, setRbacAlert] = useState<string | null>(null)
  const [roleUpdateLoading, setRoleUpdateLoading] = useState<Record<number, boolean>>({})

  // Matriks Hak Akses RBAC State (Configurable oleh Admin)
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionItem[]>(DEFAULT_PERMISSIONS)
  const [saveMatrixLoading, setSaveMatrixLoading] = useState(false)
  const [saveMatrixMsg, setSaveMatrixMsg] = useState('')

  // Smart Schedules & Countdown Timers State
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [deviceTimers, setDeviceTimers] = useState<Record<string, DeviceTimer>>({})
  const [timerModalDeviceId, setTimerModalDeviceId] = useState<string | null>(null)
  const [timerDuration, setTimerDuration] = useState<number>(30)
  const [timerAction, setTimerAction] = useState<'OFF' | 'ON'>('OFF')
  const [timerLoading, setTimerLoading] = useState(false)
  
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [schedDeviceId, setSchedDeviceId] = useState<string>('')
  const [schedAction, setSchedAction] = useState<'ON' | 'OFF'>('ON')
  const [schedTime, setSchedTime] = useState<string>('06:00')
  const [schedDays, setSchedDays] = useState<string>('ALL')
  const [schedLoading, setSchedLoading] = useState(false)
  const [schedMsg, setSchedMsg] = useState('')

  // Scenes State
  const [scenes, setScenes] = useState<Scene[]>([])
  const [executingSceneId, setExecutingSceneId] = useState<string | null>(null)
  const [sceneSuccessMsg, setSceneSuccessMsg] = useState('')

  // Power Guard State
  const [powerGuard, setPowerGuard] = useState<PowerGuardConfig | null>(null)
  const [powerLimitInput, setPowerLimitInput] = useState<number>(1150)
  const [savingPowerGuard, setSavingPowerGuard] = useState(false)

  // Budget State
  const [budget, setBudget] = useState<BudgetSettings | null>(null)
  const [budgetInput, setBudgetInput] = useState<number>(750000)
  const [savingBudget, setSavingBudget] = useState(false)
  const [budgetMsg, setBudgetMsg] = useState('')

  // Telegram State
  const [telegram, setTelegram] = useState<TelegramConfig | null>(null)
  const [tgTokenInput, setTgTokenInput] = useState('')
  const [tgChatIdInput, setTgChatIdInput] = useState('')
  const [tgEnabledInput, setTgEnabledInput] = useState(false)
  const [savingTelegram, setSavingTelegram] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [telegramMsg, setTelegramMsg] = useState('')

  const fetchPermissions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/permissions`)
      if (res.ok) {
        const data = await res.json()
        if (data.permissions && Array.isArray(data.permissions) && data.permissions.length > 0) {
          setPermissionMatrix(data.permissions)
        }
      }
    } catch (e) {
      console.error('Gagal mengambil matriks izin RBAC:', e)
    }
  }

  useEffect(() => {
    fetchPermissions()
  }, [])

  const checkPermission = (permId: string): boolean => {
    if (!currentUser) return false
    const item = permissionMatrix.find(p => p.id === permId)
    if (!item) return currentUser.role === 'admin'
    return item[currentUser.role]
  }

  const handleSavePermissions = async () => {
    if (currentUser?.role !== 'admin') {
      setRbacAlert('Akses Ditolak: Hanya pengguna dengan peran Admin yang diizinkan memperbarui Matriks Hak Akses RBAC.')
      return
    }

    setSaveMatrixLoading(true)
    setSaveMatrixMsg('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        },
        body: JSON.stringify({ permissions: permissionMatrix })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Gagal menyimpan matriks hak akses')
      }

      setSaveMatrixMsg('✓ Matriks Hak Akses RBAC berhasil disimpan di database!')
      notify.success('Matriks Hak Akses RBAC berhasil disimpan di database!', 'Pengaturan Tersimpan')
      setTimeout(() => setSaveMatrixMsg(''), 4000)
    } catch (err: any) {
      notify.error(err.message, 'Gagal Menyimpan Matriks')
    } finally {
      setSaveMatrixLoading(false)
    }
  }

  const togglePermissionCell = (id: string, roleKey: 'admin' | 'operator' | 'viewer') => {
    if (currentUser?.role !== 'admin') return
    setPermissionMatrix(prev =>
      prev.map(p => (p.id === id ? { ...p, [roleKey]: !p[roleKey] } : p))
    )
  }

  // Handler Per-Device RBAC (Ubah Peran Diizinkan per Perangkat)
  const handleUpdateDeviceRbac = async (deviceId: string, newAllowedRoles: string) => {
    if (currentUser?.role !== 'admin') {
      const msg = 'Akses Ditolak: Hanya pengguna dengan peran Admin yang dapat mengubah hak akses khusus perangkat.'
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/devices/${deviceId}/rbac`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        },
        body: JSON.stringify({ allowed_roles: newAllowedRoles })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Gagal memperbarui hak akses perangkat')
      }

      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, allowed_roles: newAllowedRoles } : d))
      notify.success('Hak akses perangkat berhasil diperbarui!', 'Perizinan Diperbarui')
    } catch (err: any) {
      notify.error(err.message, 'Gagal Ubah Hak Akses')
    }
  }

  const handleUpdateDevicePriority = async (deviceId: string, priority: number) => {
    if (currentUser?.role !== 'admin') {
      const msg = 'Akses Ditolak: Hanya pengguna dengan peran Admin yang dapat mengubah prioritas beban perangkat.'
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/devices/${deviceId}/priority`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        },
        body: JSON.stringify({ priority })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Gagal memperbarui prioritas perangkat')
      }

      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, priority } : d))
      notify.success('Prioritas proteksi beban perangkat berhasil diperbarui!', 'Prioritas Diperbarui')
    } catch (err: any) {
      notify.error(err.message, 'Gagal Ubah Prioritas')
    }
  }

  // Analitik & Tarif PLN State
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [chartTimeframe, setChartTimeframe] = useState<'hourly' | 'daily'>('daily')
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null)
  const [selectedTariff, setSelectedTariff] = useState<string>(DEFAULT_CONFIG_TARIFF)

  // Daily Usage History State
  const [dailyHistoryList, setDailyHistoryList] = useState<DailyHistoryItem[]>([])
  const [dailyHistorySummary, setDailyHistorySummary] = useState<DailyHistorySummary | null>(null)
  const [dailyHistoryDays, setDailyHistoryDays] = useState<number>(DEFAULT_CONFIG_HISTORY_DAYS)
  const [dailyHistoryLoading, setDailyHistoryLoading] = useState<boolean>(false)
  const [dailyHistoryDeviceFilter, setDailyHistoryDeviceFilter] = useState<string>('')
  const [expandedDayDate, setExpandedDayDate] = useState<string | null>(null)
  const [exportingDailyCsv, setExportingDailyCsv] = useState<boolean>(false)

  // Tuya Hardware Energy Validation State
  const [tuyaValidationData, setTuyaValidationData] = useState<any>(null)
  const [tuyaValidationLoading, setTuyaValidationLoading] = useState<boolean>(false)
  const [tuyaCalibrating, setTuyaCalibrating] = useState<boolean>(false)

  // WebSocket Telemetry State
  const [wsConnected, setWsConnected] = useState(false)
  const [wsSocket, setWsSocket] = useState<WebSocket | null>(null)
  const [simDeviceId, setSimDeviceId] = useState<string>('')
  const [simPower, setSimPower] = useState<number>(500)
  const [simStatus, setSimStatus] = useState<boolean>(true)

  // Form Tambah Device Baru
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [newPower, setNewPower] = useState<number>(60)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [fetchingCloud, setFetchingCloud] = useState(false)
  const [cloudMsg, setCloudMsg] = useState('')

  // State Tuya Device Scanner (Smart Discovery ala Tuya Smart App)
  const [showScanModal, setShowScanModal] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [isImportingAll, setIsImportingAll] = useState(false)
  const [isSyncingAll, setIsSyncingAll] = useState(false)

  // Web Bluetooth Pairing & Direct Provisioning State
  const [showWebBleModal, setShowWebBleModal] = useState<boolean>(false)
  const [bleSsid, setBleSsid] = useState<string>('')
  const [blePassword, setBlePassword] = useState<string>('')
  const [bleStatus, setBleStatus] = useState<string>('')
  const [bleLoading, setBleLoading] = useState<boolean>(false)
  const [bleStep, setBleStep] = useState<number>(1)
  const [bleDeviceName, setBleDeviceName] = useState<string>('')
  const [pairingToken, setPairingToken] = useState<string>('')

  // Handler Login User ke API Backend
  const handleLogin = async (usernameInput?: string, passwordInput?: string) => {
    const userToLogin = usernameInput || loginUsername
    const passToLogin = passwordInput || loginPassword

    if (!userToLogin.trim() || !passToLogin.trim()) {
      setLoginError('Username dan password wajib diisi!')
      return
    }

    setLoginLoading(true)
    setLoginError('')

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userToLogin.trim(),
          password: passToLogin.trim()
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Username atau password salah!')
      }

      setAuthToken(data.token)
      setCurrentUser(data.user)
      localStorage.setItem('home_auth_token', data.token)
      localStorage.setItem('home_auth_user', JSON.stringify(data.user))
      setShowLoginModal(false)
      notify.success(`Selamat datang kembali, ${data.user.name}!`, 'Login Berhasil')
    } catch (err: any) {
      setLoginError(err.message || 'Gagal melakukan login!')
      notify.error(err.message || 'Username atau password salah!', 'Gagal Login')
    } finally {
      setLoginLoading(false)
    }
  }

  // Handler Logout User -> Kembalikan ke Mode Pengunjung (Guest / Review)
  const handleLogout = () => {
    setAuthToken(DEFAULT_GUEST_TOKEN)
    setCurrentUser(DEFAULT_GUEST_USER)
    localStorage.removeItem('home_auth_token')
    localStorage.removeItem('home_auth_user')
    notify.info('Anda telah kembali ke Mode Pengunjung (Review)', 'Logout')
  }

  // Form & Management Tambah User Baru
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newNameUser, setNewNameUser] = useState('')
  const [newPasswordUser, setNewPasswordUser] = useState('')
  const [newRoleUser, setNewRoleUser] = useState<'admin' | 'operator' | 'viewer'>('operator')
  const [addUserLoading, setAddUserLoading] = useState(false)
  const [addUserError, setAddUserError] = useState('')
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deleteUserLoading, setDeleteUserLoading] = useState(false)

  // Handler Tambah User Baru
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || currentUser.role !== 'admin') {
      setRbacAlert('Akses Ditolak: Hanya Admin yang dapat mendaftarkan pengguna baru.')
      return
    }

    if (!newUsername.trim() || !newNameUser.trim() || !newPasswordUser.trim()) {
      setAddUserError('Username, Nama Lengkap, dan Password wajib diisi!')
      return
    }

    setAddUserLoading(true)
    setAddUserError('')

    try {
      const res = await fetch(`${API_BASE}/api/auth/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          name: newNameUser.trim(),
          password: newPasswordUser.trim(),
          role: newRoleUser
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menambahkan pengguna baru')
      }

      const createdUsername = newUsername.trim()
      setNewUsername('')
      setNewNameUser('')
      setNewPasswordUser('')
      setNewRoleUser('operator')
      setShowAddUserModal(false)
      await fetchUsers()
      notify.success(`Pengguna @${createdUsername} berhasil dibuat!`, 'Pengguna Baru')
    } catch (err: any) {
      setAddUserError(err.message || 'Gagal membuat pengguna baru!')
      notify.error(err.message || 'Gagal membuat pengguna baru!', 'Gagal Tambah User')
    } finally {
      setAddUserLoading(false)
    }
  }

  // Handler Hapus User
  const handleDeleteUser = async () => {
    if (!userToDelete) return
    if (!currentUser || currentUser.role !== 'admin') {
      const msg = 'Akses Ditolak: Hanya Admin yang dapat menghapus pengguna.'
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }

    if (userToDelete.id === currentUser.id) {
      notify.warning('Anda tidak dapat menghapus akun Anda sendiri yang sedang digunakan!', 'Peringatan')
      return
    }

    const targetUsername = userToDelete.username
    setDeleteUserLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus pengguna')
      }

      setUserToDelete(null)
      await fetchUsers()
      notify.info(`Pengguna @${targetUsername} berhasil dihapus dari sistem`, 'Pengguna Dihapus')
    } catch (err: any) {
      notify.error(err.message, 'Gagal Menghapus Pengguna')
    } finally {
      setDeleteUserLoading(false)
    }
  }

  // Handler Ubah Password (Self atau Reset oleh Admin)
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangePassError('')
    setChangePassSuccess('')

    if (newPassword !== confirmPassword) {
      setChangePassError('Konfirmasi password baru tidak cocok!')
      return
    }

    if (!newPassword || newPassword.length < 3) {
      setChangePassError('Password baru minimal 3 karakter!')
      return
    }

    setChangePassLoading(true)

    try {
      if (passTargetUser) {
        // Admin reset target user's password
        const res = await fetch(`${API_BASE}/api/auth/users/${passTargetUser.id}/password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken || ''}`,
            'X-User-Role': currentUser.role,
            'X-Username': currentUser.username
          },
          body: JSON.stringify({
            new_password: newPassword.trim()
          })
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Gagal merubah password pengguna')
        }

        setChangePassSuccess(`Password untuk @${passTargetUser.username} berhasil diperbarui!`)
        notify.success(`Password untuk @${passTargetUser.username} berhasil diperbarui!`, 'Password Diperbarui')
        setTimeout(() => {
          setShowChangePassModal(false)
          setPassTargetUser(null)
          setOldPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setChangePassSuccess('')
        }, 1500)
      } else {
        // Self password change
        if (!oldPassword) {
          setChangePassError('Password lama wajib diisi!')
          notify.warning('Password lama wajib diisi!')
          setChangePassLoading(false)
          return
        }

        const res = await fetch(`${API_BASE}/api/auth/change-password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken || ''}`,
            'X-User-Role': currentUser.role,
            'X-Username': currentUser.username
          },
          body: JSON.stringify({
            old_password: oldPassword.trim(),
            new_password: newPassword.trim()
          })
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Gagal mengubah password')
        }

        setChangePassSuccess('Password Anda berhasil diubah!')
        notify.success('Password Anda berhasil diubah!', 'Password Diperbarui')
        setTimeout(() => {
          setShowChangePassModal(false)
          setOldPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setChangePassSuccess('')
        }, 1500)
      }
    } catch (err: any) {
      setChangePassError(err.message || 'Terjadi kesalahan saat mengubah password')
      notify.error(err.message || 'Terjadi kesalahan saat mengubah password', 'Gagal Ganti Password')
    } finally {
      setChangePassLoading(false)
    }
  }

  // Fetch Users List dari backend API /api/auth/users
  const fetchUsers = async () => {
    if (!currentUser) return
    try {
      const res = await fetch(`${API_BASE}/api/auth/users`, {
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.users && Array.isArray(data.users)) {
          setUsersList(data.users)
        }
      }
    } catch (e) {
      console.error('Gagal mengambil daftar pengguna RBAC:', e)
    }
  }

  useEffect(() => {
    if (currentUser) {
      fetchUsers()
    }
  }, [currentUser])

  // Admin Handler untuk mengubah peran pengguna lain
  const handleUpdateUserRole = async (userId: number, newRole: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      const msg = 'Akses Ditolak: Hanya pengguna dengan peran Admin yang dapat mengubah hak akses pengguna lain.'
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }

    setRoleUpdateLoading(prev => ({ ...prev, [userId]: true }))
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        },
        body: JSON.stringify({ role: newRole })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui peran pengguna')
      }

      setUsersList(prev => prev.map(u => (u.id === userId ? { ...u, role: newRole as any } : u)))
      if (currentUser.id === userId) {
        const updated = { ...currentUser, role: newRole as any }
        setCurrentUser(updated)
        localStorage.setItem('home_auth_user', JSON.stringify(updated))
      }
      notify.success(`Peran pengguna #${userId} berhasil diubah ke [${newRole.toUpperCase()}]!`, 'Peran Diperbarui')
    } catch (err: any) {
      notify.error(err.message, 'Gagal Mengubah Peran')
    } finally {
      setRoleUpdateLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  // 1. WebSocket Hook untuk Realtime Telemetry Data & Multi-Tarif PLN Sync
  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimer: any = null

    const connectWebSocket = () => {
      const wsUrl = getWsUrl()
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('[WebSocket] Terhubung ke Go Telemetry Server')
        setWsConnected(true)
        ws?.send(JSON.stringify({ type: 'set_tariff', tariff_code: selectedTariff }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data && data.type === 'analytics_update') {
            setAnalytics(data)
            fetchTimers()
            fetchSchedules()
            if (data.selected_tariff_code) {
              setSelectedTariff(data.selected_tariff_code)
            }

            if (data.total_kwh_today) {
              const liveKwh = parseFloat(data.total_kwh_today) || 0
              const liveCost = parseFloat(data.estimated_cost_today_idr) || 0
              setDailyHistoryList(prev => prev.map(item => {
                if (item.is_today) {
                  return {
                    ...item,
                    kwh: liveKwh,
                    cost: liveCost,
                    avg_power_watt: data.total_active_power_watts || item.avg_power_watt,
                    peak_power_watt: Math.max(item.peak_power_watt || 0, data.total_active_power_watts || 0)
                  }
                }
                return item
              }))
            }

            if (data.device_breakdown && Array.isArray(data.device_breakdown)) {
              setDevices(prev =>
                prev.map(dev => {
                  const match = data.device_breakdown.find((b: any) => b.id === dev.id)
                  if (match) {
                    return {
                      ...dev,
                      power: match.power_watt,
                      status: match.status,
                      voltage_volts: match.voltage_volts,
                      current_amps: match.current_amps
                    }
                  }
                  return dev
                })
              )
            }
          }
        } catch (e) {
          console.error('[WebSocket] Gagal parse pesan:', e)
        }
      }

      ws.onclose = () => {
        setWsConnected(false)
        console.log('[WebSocket] Terputus. Menghubungkan ulang dalam 3 detik...')
        reconnectTimer = setTimeout(connectWebSocket, 3000)
      }

      ws.onerror = (err) => {
        console.error('[WebSocket] Error:', err)
        ws?.close()
      }

      setWsSocket(ws)
    }

    connectWebSocket()

    return () => {
      if (ws) ws.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [])

  // 2. Fetch devices from Go Backend (Menyertakan RBAC Header)
  const fetchDevices = async () => {
    if (!currentUser) return
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/api/devices`, {
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const data = await res.json()
      
      setErrorMessage('')
      
      const localList: Device[] = data.local_devices || []
      setDevices(localList)

      if (localList.length > 0 && !simDeviceId) {
        setSimDeviceId(localList[0].id)
      }

      if (data.cloud_devices && data.cloud_devices.success) {
        setCloudStatus('Terhubung Cloud')
      } else if (data.cloud_devices && data.cloud_devices.code === 28841002) {
        setCloudStatus('Status Cloud Terbatas')
      } else {
        setCloudStatus('Aktif (Cloud)')
      }
    } catch (err: any) {
      console.error('Fetch error:', err)
      setCloudStatus('Terputus')
      setErrorMessage('Gagal terhubung ke layanan server. Silakan coba beberapa saat lagi.')
    } finally {
      setLoading(false)
    }
  }

  // 3. Fetch Electricity Analytics Data (Menyertakan RBAC Header)
  const fetchAnalytics = async (tariffCode: string = selectedTariff) => {
    if (!currentUser) return
    try {
      setAnalyticsLoading(true)
      const res = await fetch(`${API_BASE}/api/analytics?tariff=${encodeURIComponent(tariffCode)}`, {
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const data = await res.json()
      setAnalytics(data)
    } catch (err: any) {
      console.error('Analytics fetch error:', err)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  // 3b. Fetch Riwayat Penggunaan Listrik Harian (Daily History)
  const fetchDailyHistory = async (days: number = dailyHistoryDays, devId: string = dailyHistoryDeviceFilter) => {
    if (!currentUser) return
    try {
      setDailyHistoryLoading(true)
      let url = `${API_BASE}/api/analytics/history/daily?days=${days}&tariff=${encodeURIComponent(selectedTariff)}`
      if (devId) {
        url += `&device_id=${encodeURIComponent(devId)}`
      }
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const data = await res.json()
      if (data && data.status === 'success') {
        setDailyHistoryList(data.history || [])
        setDailyHistorySummary(data.summary || null)
      }
    } catch (err: any) {
      console.error('Failed to fetch daily history:', err)
    } finally {
      setDailyHistoryLoading(false)
    }
  }

  // 3c. Unduh CSV Rekapitulasi Riwayat Harian Listrik
  const handleExportDailyCsv = async () => {
    try {
      setExportingDailyCsv(true)
      let url = `${API_BASE}/api/analytics/history/daily/export?days=${dailyHistoryDays}&tariff=${encodeURIComponent(selectedTariff)}`
      if (dailyHistoryDeviceFilter) {
        url += `&device_id=${encodeURIComponent(dailyHistoryDeviceFilter)}`
      }
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser?.role || 'viewer',
          'X-Username': currentUser?.username || 'guest'
        }
      })
      if (!res.ok) throw new Error('Gagal mengunduh CSV riwayat harian')
      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `rekap-harian-listrik-${dailyHistoryDays}-hari.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(downloadUrl)
      notify.success(`Rekapitulasi riwayat ${dailyHistoryDays} hari berhasil diunduh!`, 'Ekspor CSV Berhasil')
    } catch (e: any) {
      notify.error(e.message || 'Gagal mengekspor riwayat harian', 'Ekspor Gagal')
    } finally {
      setExportingDailyCsv(false)
    }
  }

  // 3d. Fetch Validasi Akurasi Riwayat Energi Tuya Cloud Hardware Meter
  const fetchTuyaValidation = async () => {
    if (!currentUser) return
    try {
      setTuyaValidationLoading(true)
      const res = await fetch(`${API_BASE}/api/analytics/validate-tuya`, {
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const data = await res.json()
      if (data && data.status === 'success') {
        setTuyaValidationData(data)
      }
    } catch (err: any) {
      console.error('Failed to fetch Tuya validation:', err)
    } finally {
      setTuyaValidationLoading(false)
    }
  }

  // 3e. Kalibrasi Akumulasi Energi Lokal dengan Tuya Hardware Meter
  const handleCalibrateTuya = async (devId?: string) => {
    if (!currentUser) return
    try {
      setTuyaCalibrating(true)
      notify.info('Melakukan kalibrasi akumulasi energi dengan Tuya Hardware Meter...', 'Kalibrasi Energi')
      const res = await fetch(`${API_BASE}/api/analytics/calibrate-tuya`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        },
        body: JSON.stringify({ device_id: devId || '' })
      })
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const data = await res.json()
      if (data && data.status === 'success') {
        notify.success(data.message || 'Kalibrasi berhasil diselesaikan!', 'Kalibrasi Selesai')
        fetchTuyaValidation()
        fetchDailyHistory()
        fetchAnalytics()
      }
    } catch (err: any) {
      notify.error(`Gagal kalibrasi: ${err.message}`, 'Gagal Kalibrasi')
    } finally {
      setTuyaCalibrating(false)
    }
  }

  // 3f. Sinkronisasi Riwayat Pemakaian Listrik dari Tuya Cloud Hardware Meters
  const [syncingHistory, setSyncingHistory] = useState<boolean>(false)
  const handleSyncHistory = async () => {
    if (!currentUser) return
    try {
      setSyncingHistory(true)
      notify.info('Sinkronisasi riwayat pemakaian listrik dari Tuya Cloud...', 'Sync Riwayat')
      const res = await fetch(`${API_BASE}/api/analytics/history/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        },
        body: JSON.stringify({
          days: dailyHistoryDays || 30,
          device_id: dailyHistoryDeviceFilter || ''
        })
      })
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const data = await res.json()
      if (data && data.status === 'success') {
        notify.success(data.message || 'Sinkronisasi riwayat pemakaian berhasil!', 'Sync Selesai')
        fetchDailyHistory()
        fetchAnalytics()
        fetchTuyaValidation()
      }
    } catch (err: any) {
      notify.error(`Gagal sync riwayat: ${err.message}`, 'Gagal Sync')
    } finally {
      setSyncingHistory(false)
    }
  }

  // Fetch Schedules & Timers
  const fetchSchedules = async () => {
    if (!currentUser) return
    try {
      const res = await fetch(`${API_BASE}/api/schedules`, {
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      if (!res.ok) return
      const data = await res.json()
      setSchedules(data.schedules || [])
    } catch (e) {
      console.error('Fetch schedules error:', e)
    }
  }

  const fetchTimers = async () => {
    if (!currentUser) return
    try {
      const res = await fetch(`${API_BASE}/api/timers`, {
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      if (!res.ok) return
      const data = await res.json()
      const map: Record<string, DeviceTimer> = {}
      ;(data.timers || []).forEach((t: DeviceTimer) => {
        map[t.device_id] = t
      })
      setDeviceTimers(map)
    } catch (e) {
      console.error('Fetch timers error:', e)
    }
  }

  // Fetch Scenes, Power Guard, Budget, and Telegram
  const fetchScenes = async () => {
    if (!currentUser) return
    try {
      const res = await fetch(`${API_BASE}/api/scenes`, {
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      if (!res.ok) return
      const data = await res.json()
      setScenes(data.scenes || [])
    } catch (e) {
      console.error('Fetch scenes error:', e)
    }
  }

  const handleExecuteScene = async (sceneId: string) => {
    if (currentUser?.role === 'viewer') {
      const msg = 'Akses Ditolak: Peran Viewer tidak diizinkan mengeksekusi skenario saklar.'
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }
    setExecutingSceneId(sceneId)
    setSceneSuccessMsg('')
    try {
      const res = await fetch(`${API_BASE}/api/scenes/${sceneId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      if (res.ok) {
        const data = await res.json()
        const successText = data.message || 'Skenario berhasil dijalankan!'
        setSceneSuccessMsg(successText)
        notify.success(successText, 'Skenario Dijalankan')
        setTimeout(() => setSceneSuccessMsg(''), 4000)
        fetchDevices()
        fetchAnalytics()
      } else {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal menjalankan skenario')
      }
    } catch (e: any) {
      notify.error(e.message, 'Gagal Eksekusi Skenario')
    } finally {
      setExecutingSceneId(null)
    }
  }

  const fetchPowerGuard = async () => {
    if (!currentUser) return
    try {
      const res = await fetch(`${API_BASE}/api/power-guard`, {
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      if (!res.ok) return
      const data = await res.json()
      setPowerGuard(data)
      if (data.max_watt_limit) setPowerLimitInput(data.max_watt_limit)
    } catch (e) {
      console.error('Fetch power guard error:', e)
    }
  }

  const handleSavePowerGuard = async (enabled: boolean, limit: number) => {
    if (currentUser?.role !== 'admin') {
      const msg = 'Akses Ditolak: Hanya Admin yang dapat mengubah konfigurasi Proteksi Daya.'
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }
    setSavingPowerGuard(true)
    try {
      const res = await fetch(`${API_BASE}/api/power-guard`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        },
        body: JSON.stringify({
          max_watt_limit: limit,
          is_enabled: enabled
        })
      })
      if (res.ok) {
        fetchPowerGuard()
        notify.success(`Batas daya proteksi diatur ke ${limit} W (${enabled ? 'Aktif' : 'Nonaktif'})`, 'Proteksi Anti-Jeglek')
      } else {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal menyimpan konfigurasi proteksi')
      }
    } catch (e: any) {
      notify.error(e.message, 'Gagal Menyimpan Proteksi')
    } finally {
      setSavingPowerGuard(false)
    }
  }

  const fetchBudget = async () => {
    if (!currentUser) return
    try {
      const res = await fetch(`${API_BASE}/api/budget`, {
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      if (!res.ok) return
      const data = await res.json()
      setBudget(data)
      if (data.monthly_budget_idr) setBudgetInput(data.monthly_budget_idr)
    } catch (e) {
      console.error('Fetch budget error:', e)
    }
  }

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (currentUser?.role !== 'admin') {
      const msg = 'Akses Ditolak: Hanya Admin yang dapat mengubah Target Anggaran Bulanan.'
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }
    setSavingBudget(true)
    setBudgetMsg('')
    try {
      const res = await fetch(`${API_BASE}/api/budget`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        },
        body: JSON.stringify({
          monthly_budget_idr: budgetInput,
          warning_threshold_pct: 80
        })
      })
      if (res.ok) {
        setBudgetMsg('Target Anggaran berhasil diperbarui!')
        notify.success(`Target kuota anggaran listrik bulanan berhasil disimpan!`, 'Anggaran Diperbarui')
        setTimeout(() => setBudgetMsg(''), 3000)
        fetchBudget()
      } else {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal menyimpan target anggaran')
      }
    } catch (e: any) {
      setBudgetMsg(`Gagal: ${e.message}`)
      notify.error(e.message, 'Gagal Simpan Anggaran')
    } finally {
      setSavingBudget(false)
    }
  }

  const handleExportCsv = () => {
    notify.info('Mengunduh laporan riwayat penggunaan listrik format CSV...', 'Unduh Rekap')
    window.open(`${API_BASE}/api/analytics/export`, '_blank')
  }

  // Web Bluetooth Pairing & Direct Provisioning Handler
  const handleStartWebBlePairing = async () => {
    if (!bleSsid.trim()) {
      notify.error('Masukkan Nama SSID WiFi terlebih dahulu!', 'WiFi Kosong')
      return
    }

    try {
      setBleLoading(true)
      setBleStep(1)
      setBleStatus('Meminta Token Pairing dari Tuya Cloud...')

      const tokenRes = await fetch(`${API_BASE}/api/devices/pairing-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser?.role || 'admin',
          'X-Username': currentUser?.username || 'admin'
        },
        body: JSON.stringify({ time_zone: 'Asia/Jakarta' })
      })

      if (!tokenRes.ok) throw new Error(`HTTP Error ${tokenRes.status}`)
      const tokenData = await tokenRes.json()
      
      let fetchedToken = ''
      if (tokenData && tokenData.data && tokenData.data.result) {
        fetchedToken = tokenData.data.result.token || tokenData.data.result.token_id || ''
      }
      setPairingToken(fetchedToken)

      setBleStep(2)
      setBleStatus('Membuka Scan Web Bluetooth... Pilih Perangkat Tuya yang berkedip di jendela browser.')

      if (!('bluetooth' in navigator)) {
        throw new Error('Web Bluetooth API tidak didukung di browser ini. Gunakan Google Chrome atau MS Edge via HTTPS.')
      }

      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [0xFD50, '0000fd50-0000-1000-8000-00805f9b34fb', '0000a201-0000-1000-8000-00805f9b34fb']
      })

      setBleDeviceName(device.name || 'Tuya Smart Plug (BLE)')
      setBleStatus(`Terhubung ke Bluetooth '${device.name || 'Tuya Device'}'. Menyambungkan GATT Service...`)
      setBleStep(3)

      if (device.gatt) {
        try {
          await device.gatt.connect()
          setBleStatus('GATT Connected! Menyuntikkan Kredensial WiFi & Pairing Token ke Perangkat...')
        } catch (e: any) {
          console.warn('GATT Connect warning:', e)
        }
      }

      await new Promise(r => setTimeout(r, 1500))

      setBleStep(4)
      setBleStatus('Kredensial WiFi & Token terkirim! Menunggu perangkat terkoneksi ke Internet & Tuya Cloud...')

      let isBound = false
      for (let attempt = 1; attempt <= 12; attempt++) {
        setBleStatus(`Menunggu konfirmasi pendaftaran dari Tuya Cloud (${attempt}/12)...`)
        await new Promise(r => setTimeout(r, 2000))

        const checkRes = await fetch(`${API_BASE}/api/devices/pairing-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken || ''}`,
            'X-User-Role': currentUser?.role || 'admin',
            'X-Username': currentUser?.username || 'admin'
          },
          body: JSON.stringify({ token: fetchedToken })
        })

        if (checkRes.ok) {
          const checkData = await checkRes.json()
          if (checkData && checkData.data && checkData.data.result && checkData.data.result.success_devices) {
            isBound = true
            break
          }
        }
      }

      fetchDevices()
      fetchAnalytics()
      if (isBound) {
        notify.success(`Perangkat '${device.name || 'Tuya Device'}' berhasil terpasang & didaftarkan ke BARA-Sense!`, 'Pairing Web Bluetooth Berhasil 🎉')
        setBleStatus('Pairing Selesai! Perangkat sudah terikat secara sempurna di BARA-Sense.')
      } else {
        notify.info('Informasi kredensial WiFi telah terkirim ke perangkat.', 'Proses Pairing')
        setBleStatus('Proses pairing selesai dikirim. Perangkat sedang menyambung ke WiFi.')
      }
    } catch (err: any) {
      console.error('Web BLE Error:', err)
      notify.error(`Gagal Pairing Web Bluetooth: ${err.message}`, 'Pairing Gagal')
      setBleStatus(`Error: ${err.message}`)
    } finally {
      setBleLoading(false)
    }
  }

  const fetchTelegram = async () => {
    if (!currentUser) return
    try {
      const res = await fetch(`${API_BASE}/api/telegram`, {
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      if (!res.ok) return
      const data = await res.json()
      setTelegram(data)
      setTgChatIdInput(data.chat_id || '')
      setTgEnabledInput(data.is_enabled || false)
    } catch (e) {
      console.error('Fetch telegram error:', e)
    }
  }

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault()
    if (currentUser?.role !== 'admin') {
      const msg = 'Akses Ditolak: Hanya Admin yang dapat mengonfigurasi Bot Telegram.'
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }
    setSavingTelegram(true)
    setTelegramMsg('')
    try {
      const res = await fetch(`${API_BASE}/api/telegram`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        },
        body: JSON.stringify({
          bot_token: tgTokenInput,
          chat_id: tgChatIdInput,
          is_enabled: tgEnabledInput,
          notify_on_overload: true,
          notify_on_leak: true
        })
      })
      if (res.ok) {
        setTelegramMsg('Konfigurasi Bot Telegram berhasil disimpan!')
        notify.success('Konfigurasi Bot Telegram berhasil disimpan ke sistem!', 'Telegram Tersimpan')
        setTimeout(() => setTelegramMsg(''), 3000)
        fetchTelegram()
      } else {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal menyimpan konfigurasi telegram')
      }
    } catch (e: any) {
      setTelegramMsg(`Gagal: ${e.message}`)
      notify.error(e.message, 'Gagal Simpan Telegram')
    } finally {
      setSavingTelegram(false)
    }
  }

  const handleTestTelegram = async () => {
    if (currentUser?.role !== 'admin') {
      const msg = 'Akses Ditolak: Hanya Admin yang dapat menguji coba bot Telegram.'
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }
    setTestingTelegram(true)
    setTelegramMsg('')
    try {
      const res = await fetch(`${API_BASE}/api/telegram/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      const data = await res.json()
      if (res.ok) {
        setTelegramMsg('Pesan uji coba berhasil terkirim ke Telegram Anda!')
        notify.success('Pesan uji coba berhasil terkirim ke Telegram Anda!', 'Terkirim')
      } else {
        const errMsg = data.error || 'Periksa token dan chat ID'
        setTelegramMsg(`Gagal: ${errMsg}`)
        notify.error(errMsg, 'Uji Coba Gagal')
      }
    } catch (e: any) {
      setTelegramMsg(`Gagal: ${e.message}`)
      notify.error(e.message, 'Gagal Mengirim Uji Coba')
    } finally {
      setTestingTelegram(false)
    }
  }

  useEffect(() => {
    if (currentUser) {
      fetchDevices()
      fetchAnalytics()
      fetchDailyHistory(dailyHistoryDays, dailyHistoryDeviceFilter)
      fetchSchedules()
      fetchTimers()
      fetchScenes()
      fetchPowerGuard()
      fetchBudget()
      fetchTelegram()
      fetchTuyaValidation()
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser) {
      fetchDailyHistory(dailyHistoryDays, dailyHistoryDeviceFilter)
    }
  }, [dailyHistoryDays, dailyHistoryDeviceFilter])

  // Timer Countdown Ticker (1 detik interval) & Background Auto Refresh
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setDeviceTimers(prev => {
        let changed = false
        const next: Record<string, DeviceTimer> = {}
        for (const id in prev) {
          const t = prev[id]
          if (t.remaining_seconds > 1) {
            next[id] = { ...t, remaining_seconds: t.remaining_seconds - 1 }
            changed = true
          } else {
            changed = true
            fetchDevices()
            fetchAnalytics()
          }
        }
        return changed ? next : prev
      })
    }, 1000)

    const pollInterval = setInterval(() => {
      fetchTimers()
      fetchSchedules()
    }, POLL_INTERVAL_MS)

    return () => {
      clearInterval(timerInterval)
      clearInterval(pollInterval)
    }
  }, [])

  const handleToggleSchedule = async (id: number) => {
    if (!checkPermission('manage_schedules') && currentUser?.role === 'viewer') {
      const msg = 'Akses Ditolak: Peran Viewer tidak diizinkan mengubah status jadwal.'
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }
    try {
      const res = await fetch(`${API_BASE}/api/schedules/${id}/toggle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      if (res.ok) {
        setSchedules(prev => prev.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s))
        notify.info('Status pengaktifan jadwal berhasil diubah', 'Jadwal Diperbarui')
      } else {
        throw new Error('Gagal mengubah status jadwal')
      }
    } catch (e: any) {
      notify.error(e.message, 'Gagal Ubah Jadwal')
    }
  }

  const handleDeleteSchedule = async (id: number) => {
    if (!checkPermission('manage_schedules') && currentUser?.role === 'viewer') {
      const msg = 'Akses Ditolak: Peran Viewer tidak diizinkan menghapus jadwal.'
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }
    if (!confirm('Hapus jadwal otomatis ini?')) return
    try {
      const res = await fetch(`${API_BASE}/api/schedules/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      if (res.ok) {
        setSchedules(prev => prev.filter(s => s.id !== id))
        notify.info('Jadwal rutinitas otomatis berhasil dihapus', 'Jadwal Dihapus')
      } else {
        throw new Error('Gagal menghapus jadwal')
      }
    } catch (e: any) {
      notify.error(e.message, 'Gagal Hapus Jadwal')
    }
  }

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkPermission('manage_schedules') && currentUser?.role === 'viewer') {
      const msg = 'Akses Ditolak: Peran Viewer tidak diizinkan membuat jadwal baru.'
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }
    if (!schedDeviceId) {
      notify.warning('Pilih perangkat terlebih dahulu!', 'Validasi')
      return
    }
    setSchedLoading(true)
    setSchedMsg('')
    try {
      const res = await fetch(`${API_BASE}/api/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        },
        body: JSON.stringify({
          device_id: schedDeviceId,
          action: schedAction,
          time_target: schedTime,
          days: schedDays
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Gagal menambahkan jadwal')
      }
      setShowScheduleModal(false)
      fetchSchedules()
      notify.success('Jadwal rutinitas otomatis baru berhasil disimpan!', 'Jadwal Ditambahkan')
    } catch (err: any) {
      setSchedMsg(err.message)
      notify.error(err.message, 'Gagal Tambah Jadwal')
    } finally {
      setSchedLoading(false)
    }
  }

  const handleSetTimer = async (deviceId: string, minutes: number, action: 'ON' | 'OFF') => {
    if (!checkPermission('manage_schedules') && currentUser?.role === 'viewer') {
      const msg = 'Akses Ditolak: Peran Viewer tidak diizinkan menyetel timer perangkat.'
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }
    setTimerLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/devices/${deviceId}/timer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        },
        body: JSON.stringify({
          duration_minutes: minutes,
          target_action: action
        })
      })
      if (res.ok) {
        setTimerModalDeviceId(null)
        fetchTimers()
        notify.success(`Timer hitung mundur ${minutes} menit berhasil diaktifkan!`, 'Timer Aktif')
      } else {
        const err = await res.json().catch(() => ({}))
        notify.error(err.error || 'Gagal menyetel timer', 'Gagal Pasang Timer')
      }
    } catch (e: any) {
      notify.error(e.message, 'Gagal Pasang Timer')
    } finally {
      setTimerLoading(false)
    }
  }

  const handleCancelTimer = async (deviceId: string) => {
    if (!checkPermission('manage_schedules') && currentUser?.role === 'viewer') {
      const msg = 'Akses Ditolak: Peran Viewer tidak diizinkan membatalkan timer perangkat.'
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }
    try {
      const res = await fetch(`${API_BASE}/api/devices/${deviceId}/timer`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      if (res.ok) {
        fetchTimers()
        notify.info('Timer hitung mundur telah dibatalkan', 'Timer Dibatalkan')
      } else {
        throw new Error('Gagal membatalkan timer')
      }
    } catch (e: any) {
      notify.error(e.message, 'Gagal Batalkan Timer')
    }
  }

  // 4. Ubah Golongan Tarif PLN (Dengan Pengecekan RBAC Dinamis)
  const handleTariffChange = (tariffCode: string) => {
    if (!checkPermission('change_tariff')) {
      const msg = `Akses Ditolak: Peran '${currentUser?.role.toUpperCase()}' (${currentUser?.name}) tidak diizinkan mengubah preferensi Golongan Tarif PLN berdasarkan Matriks RBAC saat ini.`
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }
    setSelectedTariff(tariffCode)
    fetchAnalytics(tariffCode)
    if (wsSocket && wsSocket.readyState === WebSocket.OPEN) {
      wsSocket.send(JSON.stringify({ type: 'set_tariff', tariff_code: tariffCode }))
    }
    notify.success(`Preferensi golongan tarif PLN diubah ke ${tariffCode}`, 'Tarif Diperbarui')
  }

  // 5. Toggle Device ON/OFF (Dengan Pengecekan RBAC Dinamis & Per-Device RBAC)
  const handleToggle = async (id: string, currentStatus: boolean) => {
    const targetDev = devices.find(d => d.id === id)

    // 1. Pengecekan RBAC Khusus Per-Perangkat (Per-Device RBAC Override)
    if (targetDev && targetDev.allowed_roles) {
      const allowedRolesList = targetDev.allowed_roles.split(',').map(r => r.trim())
      if (!allowedRolesList.includes(currentUser.role)) {
        const msg = `Akses Perangkat Ditolak: Perangkat '${targetDev.name}' dikonfigurasi khusus untuk peran [${targetDev.allowed_roles.toUpperCase()}]. Peran Anda saat ini: '${currentUser.role.toUpperCase()}'.`
        setRbacAlert(msg)
        notify.warning(msg, 'Akses Ditolak')
        return
      }
    } else {
      // 2. Jika Aturan Per-Perangkat Tidak Ada, Gunakan Matriks Hak Akses RBAC Global
      if (!checkPermission('switch_control')) {
        const msg = `Akses Ditolak: Peran '${currentUser?.role.toUpperCase()}' (${currentUser?.name}) tidak diizinkan mengontrol saklar ON/OFF berdasarkan Matriks Hak Akses RBAC Global saat ini.`
        setRbacAlert(msg)
        notify.warning(msg, 'Akses Ditolak')
        return
      }
    }

    setToggleLoading(prev => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`${API_BASE}/api/devices/${id}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        },
        body: JSON.stringify({ status: !currentStatus })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP error ${res.status}`)
      }

      setDevices(prev => prev.map(d => (d.id === id ? { ...d, status: !currentStatus } : d)))
      fetchAnalytics()
      notify.success(`Saklar '${targetDev?.name || 'Perangkat'}' berhasil di-${!currentStatus ? 'nyalakan (ON)' : 'matikan (OFF)'}!`, 'Saklar Berhasil')
    } catch (err: any) {
      notify.error(err.message, 'Gagal Kirim Perintah')
    } finally {
      setToggleLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  // 6. Auto Fetch Power & Name from Cloud OpenAPI
  const handleFetchTuyaCloudInfo = async () => {
    if (!currentUser) return
    if (!newId.trim()) {
      notify.warning('Masukkan Device ID terlebih dahulu!', 'Validasi')
      return
    }

    setFetchingCloud(true)
    setCloudMsg('')
    try {
      const res = await fetch(`${API_BASE}/api/devices/${newId.trim()}`, {
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const data = await res.json()

      if (data.cloud_fetched) {
        if (data.auto_name) setNewName(data.auto_name)
        if (data.auto_power_watt > 0) setNewPower(data.auto_power_watt)
        const okMsg = `Data ditarik dari Cloud: ${data.auto_name || 'Device'} (${data.auto_power_watt || 60}W)`
        setCloudMsg(okMsg)
        notify.success(okMsg, 'Cloud Tuya Terhubung')
      } else {
        const infoMsg = 'Status Cloud: Perangkat tidak ditemukan atau layanan terbatas. Menggunakan data preset.'
        setCloudMsg(infoMsg)
        notify.info(infoMsg, 'Info Cloud')
      }
    } catch (err: any) {
      const errMsg = `Gagal terhubung ke Layanan Cloud: ${err.message}`
      setCloudMsg(errMsg)
      notify.error(errMsg, 'Koneksi Cloud Gagal')
    } finally {
      setFetchingCloud(false)
    }
  }

  // 7. Register / Tambah Device Baru (Dengan Pengecekan RBAC Khusus Admin)
  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || currentUser.role !== 'admin') {
      const msg = 'Akses Ditolak: Diperlukan peran Admin untuk menambahkan atau mendaftarkan perangkat baru.'
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }
    if (!newId.trim() || !newName.trim()) return

    setAddLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        },
        body: JSON.stringify({
          id: newId.trim(),
          name: newName.trim(),
          power: Number(newPower) || 60
        })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP error ${res.status}`)
      }

      const registeredName = newName.trim()
      setNewId('')
      setNewName('')
      setNewPower(60)
      setShowAddModal(false)
      await fetchDevices()
      await fetchAnalytics()
      notify.success(`Perangkat '${registeredName}' berhasil didaftarkan ke sistem!`, 'Perangkat Terdaftar')
    } catch (err: any) {
      notify.error(err.message, 'Gagal Tambah Perangkat')
    } finally {
      setAddLoading(false)
    }
  }

  // Helper Icon Perangkat Pintar
  const getDeviceIcon = (name: string): string => {
    const n = (name || '').toLowerCase()
    if (n.includes('pc') || n.includes('komputer') || n.includes('laptop') || n.includes('server')) return '💻'
    if (n.includes('air') || n.includes('pompa') || n.includes('pump') || n.includes('kolam') || n.includes('aquarium')) return '💧'
    if (n.includes('lampu') || n.includes('light') || n.includes('lamp') || n.includes('led')) return '💡'
    if (n.includes('ac') || n.includes('pendingin') || n.includes('cooler') || n.includes('kipas') || n.includes('fan')) return '❄️'
    if (n.includes('tv') || n.includes('televisi') || n.includes('monitor')) return '📺'
    if (n.includes('dispenser') || n.includes('heater') || n.includes('pemanas')) return '♨️'
    if (n.includes('kulkas') || n.includes('fridge')) return '🧊'
    return '⚡'
  }

  // Handler Kontrol Cepat Semua Saklar Sekaligus
  const handleToggleAll = async (targetStatus: boolean) => {
    const actionLabel = targetStatus ? 'menyalakan' : 'mematikan'
    notify.info(`Memproses perintah ${actionLabel} semua saklar perangkat...`, 'Kontrol Massal')
    for (const dev of devices) {
      if (dev.status !== targetStatus) {
        await handleToggle(dev.id, dev.status)
      }
    }
  }

  // Handler Pindai Perangkat Tuya Smart (Cloud & Network Discovery ala Tuya Smart App)
  const handleStartTuyaScan = async () => {
    setShowScanModal(true)
    setIsScanning(true)
    try {
      const startTime = Date.now()
      const res = await fetch(`${API_BASE}/api/devices/scan`, {
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      const data = await res.json()
      const elapsed = Date.now() - startTime
      if (elapsed < 1200) {
        await new Promise(r => setTimeout(r, 1200 - elapsed))
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP error ${res.status}`)
      }

      setScanResult(data)
      if (data.new_devices_count > 0) {
        notify.success(`Ditemukan ${data.new_devices_count} perangkat baru di akun Tuya!`, 'Pindai Berhasil')
      } else {
        notify.info(`Pindai selesai: ${data.total_discovered} perangkat Tuya terdeteksi (${data.registered_count} sudah terdaftar).`, 'Hasil Pemindaian')
      }
    } catch (err: any) {
      notify.error(err.message || 'Gagal memindai perangkat dari Tuya Cloud', 'Gagal Pindai Tuya')
      setScanResult(null)
    } finally {
      setIsScanning(false)
    }
  }

  // Handler Import 1 Perangkat dari Hasil Pindai Tuya
  const handleImportDevice = async (dev: ScannedDeviceItem) => {
    if (currentUser?.role !== 'admin') {
      const msg = 'Akses Ditolak: Diperlukan peran Admin untuk menambahkan perangkat baru.'
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }

    setImportingId(dev.id)
    try {
      const res = await fetch(`${API_BASE}/api/devices/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        },
        body: JSON.stringify({
          devices: [{
            id: dev.id,
            name: dev.name || dev.product_name,
            power: dev.power_watt > 0 ? dev.power_watt : 60,
            priority: 2
          }]
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || data.message || `HTTP error ${res.status}`)
      }

      // Update state scanResult agar perangkat berstatus terdaftar
      setScanResult(prev => {
        if (!prev) return null
        return {
          ...prev,
          new_devices_count: Math.max(0, prev.new_devices_count - 1),
          registered_count: prev.registered_count + 1,
          devices: prev.devices.map(d => d.id === dev.id ? { ...d, already_registered: true, registered_name: dev.name } : d)
        }
      })

      await fetchDevices()
      await fetchAnalytics()
      notify.success(`Perangkat '${dev.name}' berhasil ditambahkan ke BARA-Sense!`, 'Perangkat Terhubung')
    } catch (err: any) {
      notify.error(err.message, 'Gagal Menambahkan Perangkat')
    } finally {
      setImportingId(null)
    }
  }

  // Handler Import Semua Perangkat Baru Sekaligus
  const handleImportAllNewDevices = async () => {
    if (currentUser?.role !== 'admin') {
      setRbacAlert('Akses Ditolak: Diperlukan peran Admin.')
      return
    }

    if (!scanResult || scanResult.new_devices_count === 0) return
    const newDevs = scanResult.devices.filter(d => !d.already_registered)
    if (newDevs.length === 0) return

    setIsImportingAll(true)
    try {
      const res = await fetch(`${API_BASE}/api/devices/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        },
        body: JSON.stringify({
          devices: newDevs.map(d => ({
            id: d.id,
            name: d.name || d.product_name,
            power: d.power_watt > 0 ? d.power_watt : 60,
            priority: 2
          }))
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message)

      setScanResult(prev => {
        if (!prev) return null
        return {
          ...prev,
          new_devices_count: 0,
          registered_count: prev.total_discovered,
          devices: prev.devices.map(d => ({ ...d, already_registered: true, registered_name: d.name }))
        }
      })

      await fetchDevices()
      await fetchAnalytics()
      notify.success(`Berhasil menambahkan ${newDevs.length} perangkat baru ke BARA-Sense!`, 'Sukses Import')
    } catch (err: any) {
      notify.error(err.message, 'Gagal Import Semua Perangkat')
    } finally {
      setIsImportingAll(false)
    }
  }

  // Handler Sinkronkan Semua Data Perangkat dari Tuya Cloud
  const handleSyncAllFromTuya = async () => {
    setIsSyncingAll(true)
    try {
      const res = await fetch(`${API_BASE}/api/devices/sync-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message)

      await fetchDevices()
      await fetchAnalytics()
      notify.success(data.message || 'Semua perangkat berhasil disinkronkan dengan Tuya!', 'Sinkronisasi Berhasil')
    } catch (err: any) {
      notify.error(err.message, 'Gagal Sinkronisasi Tuya')
    } finally {
      setIsSyncingAll(false)
    }
  }

  // 8. Delete Device Handler (Dengan Pengecekan RBAC Khusus Admin)
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDeleteDevice = async () => {
    if (!deleteTarget) return
    if (!currentUser || currentUser.role !== 'admin') {
      const msg = 'Akses Ditolak: Diperlukan peran Admin untuk menghapus perangkat.'
      setRbacAlert(msg)
      notify.warning(msg, 'Akses Ditolak')
      return
    }

    const targetDevName = deleteTarget.name
    setDeleteLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/devices/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken || ''}`,
          'X-User-Role': currentUser.role,
          'X-Username': currentUser.username
        }
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP error ${res.status}`)
      }

      setDeleteTarget(null)
      await fetchDevices()
      await fetchAnalytics()
      notify.info(`Perangkat '${targetDevName}' berhasil dihapus. Riwayat pemakaian listrik tetap tersimpan aman.`, 'Perangkat Dihapus')
    } catch (err: any) {
      notify.error(err.message, 'Gagal Hapus Perangkat')
    } finally {
      setDeleteLoading(false)
    }
  }

  // 9. Send Realtime Telemetry via WebSocket
  const handleSendTelemetryWS = (e: React.FormEvent) => {
    e.preventDefault()
    if (!simDeviceId) {
      notify.warning('Pilih perangkat terlebih dahulu!', 'Validasi')
      return
    }
    if (!wsSocket || wsSocket.readyState !== WebSocket.OPEN) {
      notify.error('Koneksi WebSocket belum terhubung!', 'WebSocket Error')
      return
    }

    const payload = {
      type: 'power_telemetry',
      device_id: simDeviceId,
      power_watt: Number(simPower),
      status: simStatus,
      tariff_code: selectedTariff
    }

    wsSocket.send(JSON.stringify(payload))
    notify.info(`Data telemetri untuk perangkat #${simDeviceId} terkirim via WebSocket (${simPower}W)`, 'Telemetri Terkirim')
  }

  const formatIDR = (amount: number | string) => {
    const val = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0)
  }



  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-12">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-cyan-300 bg-clip-text text-transparent flex items-center gap-2">
                <span>{APP_NAME}</span>
                <span className="text-[10px] tracking-widest font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  IoT
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-indigo-300">{APP_NAME.split('-')[0]}</span>: {APP_TAGLINE}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Active User Badge & Profile */}
            <div className="flex items-center gap-2.5 bg-slate-800/90 border border-slate-700/80 p-1.5 px-3 rounded-xl shadow-inner">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xs uppercase">
                {currentUser.username[0]}
              </div>
              <div className="text-xs font-semibold text-slate-200">
                {currentUser.name}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                currentUser.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' :
                currentUser.role === 'operator' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {currentUser.role}
              </span>
            </div>

            <button
              id="rbac-matrix-btn"
              onClick={() => setActiveTab('settings')}
              className="hidden sm:flex px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-all items-center gap-1.5 cursor-pointer"
              title="Pengaturan Hak Akses RBAC & Manajemen User"
            >
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Hak Akses & RBAC
            </button>

            {/* Tombol Pindai Perangkat Tuya Smart (Cloud & Network Scanner) */}
            <button
              id="btn-scan-tuya-nav"
              onClick={handleStartTuyaScan}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-md shadow-cyan-600/25 border border-cyan-400/30 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Pindai otomatis perangkat IoT dari akun Tuya Smart / Smart Life"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-200"></span>
              </span>
              <span>🔍 Pindai Tuya</span>
            </button>

            <button
              id="add-device-btn"
              onClick={() => {
                if (currentUser?.role !== 'admin') {
                  setRbacAlert('Akses Ditolak: Diperlukan peran Admin untuk mendaftarkan perangkat baru.')
                  return
                }
                setShowAddModal(true)
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentUser?.role === 'admin'
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Perangkat {currentUser?.role !== 'admin' && '(Admin Only)'}
            </button>

            {/* Login / Logout Button */}
            {currentUser.username === 'guest' ? (
              <button
                id="open-login-btn"
                onClick={() => setShowLoginModal(true)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                🔑 Login Admin / Operator
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {currentUser.role === 'admin' && (
                  <button
                    id="logs-btn"
                    onClick={fetchSystemLogs}
                    disabled={isFetchingLogs}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-slate-600/50 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Lihat Log Sistem Backend"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {isFetchingLogs ? 'Memuat...' : 'Logs'}
                  </button>
                )}
                <button
                  id="change-password-btn"
                  onClick={() => {
                    setPassTargetUser(null)
                    setOldPassword('')
                    setNewPassword('')
                    setConfirmPassword('')
                    setChangePassError('')
                    setChangePassSuccess('')
                    setShowChangePassModal(true)
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Ubah Password Akun Saya"
                >
                  🔑 Ubah Password
                </button>
                <button
                  id="logout-btn"
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Keluar ke Mode Pengunjung (Review)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Clean Status & Review Mode Indicator (Minimalis & Compact untuk Mobile & Pengunjung) */}
        <div className="mb-6 p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-md backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse"></span>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="font-semibold text-slate-200">BARA Live:</span>
              <span className={wsConnected ? 'text-cyan-400 font-medium' : 'text-amber-400 font-medium'}>
                {wsConnected ? 'Realtime Aktif' : 'Menghubungkan...'}
              </span>
              <span className="hidden sm:inline text-slate-600">•</span>
              <span className="hidden sm:inline text-slate-400">{cloudStatus}</span>
            </div>
            {currentUser.role === 'viewer' && (
              <span className="ml-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                👁️ Mode Pengunjung
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchDevices(); fetchAnalytics(); }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors px-2.5 py-1 rounded-lg hover:bg-slate-800 border border-slate-700/60"
              title="Refresh Data Perangkat & Analitik"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Segarkan</span>
            </button>

            {currentUser.username === 'guest' && (
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>🔑 Login</span>
              </button>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={fetchDevices} className="underline font-semibold ml-4">Coba Lagi</button>
          </div>
        )}

        {/* Tab Switcher Navigation */}
        <div className="flex border-b border-slate-800 mb-6 overflow-x-auto pb-0.5 scrollbar-thin">
          <button
            id="tab-quick"
            onClick={() => setActiveTab('quick')}
            className={`px-5 py-2.5 font-bold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'quick'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 rounded-t-xl shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span className="text-base">⚡</span>
            <span>Kontrol Mudah</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
              Quick
            </span>
          </button>

          <button
            id="tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`px-5 py-2.5 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span className="text-base">🏠</span>
            <span>Dashboard</span>
          </button>

          <button
            id="tab-devices"
            onClick={() => setActiveTab('devices')}
            className={`px-5 py-2.5 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'devices'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span className="text-base">🔌</span>
            <span>Semua Perangkat ({devices.length})</span>
          </button>

          <button
            id="tab-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`px-5 py-2.5 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span className="text-base">📊</span>
            <span>Analitik Listrik</span>
          </button>

          <button
            id="tab-settings"
            onClick={() => setActiveTab('settings')}
            className={`px-5 py-2.5 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span className="text-base">🛡️</span>
            <span>Hak Akses</span>
          </button>
        </div>

        {/* TAB 0: KONTROL MUDAH (QUICK & CLEAN CONTROL VIEW - DEFAULT PENGUNJUNG & MOBILE) */}
        {activeTab === 'quick' && (
          <div className="space-y-6">
            {/* Top Clean Header with Live Power & Global Toggles */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-cyan-500/20 shadow-xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <h2 className="text-lg font-bold text-white tracking-tight">Kontrol Cepat Saklar</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                    Live
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Daya Aktif: <strong className="text-amber-400 font-mono text-sm">{analytics?.total_active_power_watts || 0} W</strong> • Terpakai: <strong className="text-cyan-400 font-mono">{analytics?.total_kwh_today || '0.00'} kWh</strong>
                </p>
              </div>

              {/* Multi-Device Quick Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  id="btn-quick-all-off"
                  onClick={() => handleToggleAll(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Matikan semua saklar sekaligus"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span>Semua OFF</span>
                </button>
                <button
                  id="btn-quick-all-on"
                  onClick={() => handleToggleAll(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Nyalakan semua saklar sekaligus"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Semua ON</span>
                </button>
              </div>
            </div>

            {/* Quick Tactile Device Cards Grid (Bagian Paling Atas untuk Kontrol Langsung) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map((device) => {
                const isToggling = toggleLoading[device.id] || false
                const timer = deviceTimers[device.id]
                const icon = getDeviceIcon(device.name)
                const breakdown = analytics?.device_breakdown?.find(b => b.id === device.id)

                return (
                  <div
                    key={`quick-${device.id}`}
                    className={`p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                      device.status
                        ? 'bg-slate-900 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Status Glow for Active Devices */}
                    {device.status && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none -mr-8 -mt-8"></div>
                    )}

                    <div>
                      {/* Top Device Header: Icon, Name & Live Watt */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-transform ${
                            device.status
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-inner scale-105'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {icon}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-100 tracking-tight leading-tight">
                              {device.name}
                            </h3>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              ID: {device.id.slice(0, 10)}...
                            </p>
                          </div>
                        </div>

                        {/* Power Watt Badge */}
                        <div className="text-right">
                          <div className={`text-base font-mono tabular-nums font-extrabold ${device.status ? 'text-amber-400' : 'text-slate-500'}`}>
                            {device.status ? (device.power || 0) : 0} <span className="text-[10px] font-normal text-slate-400 font-sans">W</span>
                          </div>
                          <span className="text-[10px] text-cyan-400/80 font-mono tabular-nums block">
                            {breakdown?.kwh_today || '0.00'} kWh
                          </span>
                        </div>
                      </div>

                      {/* Active Timer Indicator if running */}
                      {timer && (
                        <div className="my-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
                          <div className="flex items-center gap-1.5 font-medium">
                            <span className="animate-spin text-xs">⏱️</span>
                            <span>{timer.target_action} dlm:</span>
                            <strong className="font-mono text-amber-200">
                              {Math.floor(timer.remaining_seconds / 60)}m {timer.remaining_seconds % 60}s
                            </strong>
                          </div>
                          <button
                            onClick={() => handleCancelTimer(device.id)}
                            className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer ml-2"
                            title="Batalkan timer"
                          >
                            ✕ Batal
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quick Control Section */}
                    <div className="pt-3 mt-1 border-t border-slate-800/80 space-y-2.5">
                      {/* Big Tactile Toggle Switch Button */}
                      <button
                        id={`quick-toggle-${device.id}`}
                        disabled={isToggling}
                        onClick={() => handleToggle(device.id, device.status)}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer ${
                          device.status
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-500/20'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        } ${isToggling ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {isToggling ? (
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                        ) : (
                          <span className={`w-3 h-3 rounded-full ${device.status ? 'bg-white shadow-sm shadow-white animate-pulse' : 'bg-slate-500'}`}></span>
                        )}
                        <span>{device.status ? 'NYALA (ON) • KETUK MATIKAN' : 'MATI (OFF) • KETUK NYALAKAN'}</span>
                      </button>

                      {/* Quick Timers Pills */}
                      <div className="flex items-center justify-between gap-1.5 pt-1 text-[11px]">
                        <span className="text-slate-400 font-medium">Timer Cepat:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSetTimer(device.id, 15, device.status ? 'OFF' : 'ON')}
                            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-300 border border-slate-700 hover:border-indigo-500/40 transition-all cursor-pointer font-mono"
                            title={`Atur timer ${device.status ? 'mati' : 'nyala'} 15 menit`}
                          >
                            +15m
                          </button>
                          <button
                            onClick={() => handleSetTimer(device.id, 30, device.status ? 'OFF' : 'ON')}
                            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-300 border border-slate-700 hover:border-indigo-500/40 transition-all cursor-pointer font-mono"
                            title={`Atur timer ${device.status ? 'mati' : 'nyala'} 30 menit`}
                          >
                            +30m
                          </button>
                          <button
                            onClick={() => handleSetTimer(device.id, 60, device.status ? 'OFF' : 'ON')}
                            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-300 border border-slate-700 hover:border-indigo-500/40 transition-all cursor-pointer font-mono"
                            title={`Atur timer ${device.status ? 'mati' : 'nyala'} 1 jam`}
                          >
                            +1j
                          </button>
                          <button
                            onClick={() => {
                              setTimerModalDeviceId(device.id)
                              setTimerAction(device.status ? 'OFF' : 'ON')
                            }}
                            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-amber-600/30 text-amber-300 border border-slate-700 hover:border-amber-500/40 transition-all cursor-pointer"
                            title="Atur waktu timer kustom"
                          >
                            ⏱️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Quick Skenario Section (Multi-Saklar 1-Klik) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✨</span>
                  <h3 className="text-sm font-bold text-white">Skenario Otomatis Cepat</h3>
                </div>
                {sceneSuccessMsg && (
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/30 animate-pulse">
                    ✅ {sceneSuccessMsg}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {scenes.map((sc) => (
                  <button
                    key={`quick-scene-${sc.id}`}
                    disabled={executingSceneId !== null || currentUser?.role === 'viewer'}
                    onClick={() => handleExecuteScene(sc.id)}
                    className={`p-3 rounded-xl border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
                      executingSceneId === sc.id
                        ? 'bg-indigo-600/30 border-indigo-500 text-white animate-pulse'
                        : 'bg-slate-950/70 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-200'
                    } ${currentUser?.role === 'viewer' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-2xl">{sc.icon}</span>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold truncate text-white">{sc.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{sc.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Compact Mini Summary & Quick Link to Full Analytics */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-xl">📊</span>
                <div>
                  <p className="font-bold text-slate-200">
                    Estimasi Biaya Hari Ini: <span className="text-emerald-400 font-mono text-sm">{formatIDR(analytics?.estimated_cost_today_idr || 0)}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Proyeksi Bulan Ini: <strong className="text-slate-300 font-mono">{formatIDR(analytics?.predicted_cost_month_idr || 0)}</strong> ({analytics?.predicted_kwh_month || '0'} kWh)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('analytics')}
                className="px-3 py-1.5 rounded-xl font-bold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Lihat Analitik Lengkap</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: DASHBOARD UTAMA (EXECUTIVE OVERVIEW) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Ringkasan Eksekutif & Status Sistem</h2>
                <p className="text-sm text-slate-400">Ringkasan konsumsi energi, beban daya realtime, dan status perangkat</p>
              </div>
            </div>

            {/* SAKLAR KONTROL CEPAT DI ATAS DASHBOARD UTAMA */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-sm font-bold shadow-inner">
                    ⚡
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Saklar Kontrol Cepat
                      <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-500/30">
                        {devices.filter(d => d.status).length} Menyala
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">Kontrol langsung saklar daya perangkat tanpa perlu berpindah halaman</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleAll(false)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                  >
                    Semua OFF
                  </button>
                  <button
                    onClick={() => handleToggleAll(true)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
                  >
                    Semua ON
                  </button>
                </div>
              </div>

              {/* Grid Saklar di Atas Dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {devices.map((device) => {
                  const isToggling = toggleLoading[device.id] || false
                  const icon = getDeviceIcon(device.name)
                  const timer = deviceTimers[device.id]

                  return (
                    <div
                      key={`dash-quick-${device.id}`}
                      className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                        device.status
                          ? 'bg-slate-950 border-cyan-500/40 shadow-md shadow-cyan-500/5'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className="text-xl shrink-0">{icon}</span>
                          <div className="overflow-hidden">
                            <h4 className="text-sm font-bold text-slate-100 truncate">{device.name}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {device.id.slice(0, 8)}...</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-sm font-mono font-bold ${device.status ? 'text-amber-400' : 'text-slate-500'}`}>
                            {device.status ? (device.power || 0) : 0} W
                          </span>
                        </div>
                      </div>

                      {timer && (
                        <div className="mb-2 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 text-[10px] flex items-center justify-between">
                          <span>⏱️ {timer.target_action} dlm: {Math.floor(timer.remaining_seconds / 60)}m {timer.remaining_seconds % 60}s</span>
                          <button onClick={() => handleCancelTimer(device.id)} className="text-rose-400 hover:underline">✕</button>
                        </div>
                      )}

                      <button
                        disabled={isToggling}
                        onClick={() => handleToggle(device.id, device.status)}
                        className={`w-full py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          device.status
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        } ${isToggling ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {isToggling ? (
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                        ) : (
                          <span className={`w-2 h-2 rounded-full ${device.status ? 'bg-white' : 'bg-slate-500'}`}></span>
                        )}
                        <span>{device.status ? 'NYALA (ON) • MATIKAN' : 'MATI (OFF) • NYALAKAN'}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-sm font-bold shadow-inner">
                    ✨
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Mode Skenario Rumah Cepat
                      <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                        1-Klik Kontrol Multi-Saklar
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">Pilih skenario untuk mengubah status beberapa perangkat sekaligus dalam satu ketukan</p>
                  </div>
                </div>

                {sceneSuccessMsg && (
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30 animate-pulse">
                    ✅ {sceneSuccessMsg}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {scenes.map((sc) => (
                  <button
                    key={sc.id}
                    disabled={executingSceneId !== null || currentUser?.role === 'viewer'}
                    onClick={() => handleExecuteScene(sc.id)}
                    className={`p-3.5 rounded-xl border transition-all text-left flex items-center gap-3 cursor-pointer group ${
                      executingSceneId === sc.id
                        ? 'bg-indigo-600/30 border-indigo-500 text-white animate-pulse'
                        : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800 hover:border-indigo-500/40 text-slate-200'
                    } ${currentUser?.role === 'viewer' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">{sc.icon}</span>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold truncate text-white">{sc.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{sc.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* WIDGET PROTEKSI ANTI-JEGLEK PLN (LOAD SHEDDING & CEILING GUARD) */}
            {powerGuard && (
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-bold shadow-inner">
                      ⚡
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Proteksi Listrik Anti-Jeglek PLN
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          powerGuard.is_enabled 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {powerGuard.is_enabled ? 'Aktif (Terlindungi)' : 'Nonaktif'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Otomatis mematikan beban sekunder jika total daya mendekati kapasitas meteran listrik rumah
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => handleSavePowerGuard(!powerGuard.is_enabled, powerGuard.max_watt_limit)}
                        disabled={savingPowerGuard}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          powerGuard.is_enabled
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {powerGuard.is_enabled ? 'Matikan Proteksi' : 'Aktifkan Proteksi'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-slate-400 block text-[11px]">Beban Daya Saat Ini</span>
                    <p className={`text-xl font-mono font-extrabold ${powerGuard.is_overloaded ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                      {powerGuard.current_total_watts} <span className="text-xs font-normal text-slate-400">Watt</span>
                    </p>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full transition-all ${
                          parseFloat(powerGuard.load_percentage) > 90 ? 'bg-rose-500' :
                          parseFloat(powerGuard.load_percentage) > 75 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, parseFloat(powerGuard.load_percentage) || 0)}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-500 block text-right font-mono">{powerGuard.load_percentage}% kapasitas</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-slate-400 block text-[11px]">Batas Kapasitas Aman</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-mono font-extrabold text-white">{powerGuard.max_watt_limit} W</span>
                      {currentUser?.role === 'admin' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="50"
                            min="450"
                            max="6600"
                            value={powerLimitInput}
                            onChange={(e) => setPowerLimitInput(parseInt(e.target.value) || 1150)}
                            className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                          />
                          <button
                            onClick={() => handleSavePowerGuard(powerGuard.is_enabled, powerLimitInput)}
                            className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer"
                          >
                            Set
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">Rekomendasi: 1150W (1300VA) atau 1950W (2200VA)</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-slate-400 block text-[11px]">Status Proteksi & Prioritas</span>
                    <p className="text-slate-200 font-medium">
                      {powerGuard.is_overloaded ? '⚠️ Overload terdeteksi! Memutus beban sekunder.' : '✅ Sistem aman di bawah ambang batas'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Beban Sekunder Prioritas 3 (misal Pompa Kolam) akan diputus pertama kali saat kritis.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Summary KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Active Power Watts */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30 shadow-lg shadow-indigo-500/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400">Daya Aktif Realtime</span>
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight">
                  {analytics ? analytics.total_active_power_watts : 0} <span className="text-lg font-medium text-slate-400 font-sans">Watt</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Beban daya aktif terbarui secara realtime</p>
              </div>

              {/* Energy Consumed Today (kWh) */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-cyan-400">Konsumsi Hari Ini</span>
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight">
                  {analytics ? analytics.total_kwh_today : '0.00'} <span className="text-lg font-medium text-slate-400 font-sans">kWh</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Tarif PLN: Rp {analytics?.selected_tariff_rate?.toLocaleString('id-ID')} / kWh</p>
              </div>

              {/* Estimated Today Cost */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Estimasi Biaya Hari Ini</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums tracking-tight">
                  {analytics ? formatIDR(analytics.estimated_cost_today_idr) : 'Rp 0'}
                </div>
                <p className="text-xs text-slate-400 mt-2">Dihitung dari akumulasi kWh hari ini</p>
              </div>

              {/* Estimated Monthly Bill */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-amber-400">Proyeksi Tagihan Bulan Ini</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-amber-400">
                  {analytics ? formatIDR(analytics.estimated_cost_month_idr) : 'Rp 0'}
                </div>
                <p className="text-xs text-slate-400 mt-2">Proyeksi 30 hari berdasarkan tarif PLN {selectedTariff}</p>
              </div>
            </div>

            {/* Realtime Energy (kWh) & Watt Power Monitor Widget per Perangkat */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold text-lg shadow-lg shadow-cyan-500/10 animate-pulse">
                    📊
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Penggunaan Energi Terpakai (kWh) & Daya Realtime Tiap Perangkat
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Total Energi Terpakai Hari Ini: <strong className="text-cyan-400 font-mono text-sm">{analytics?.total_kwh_today || '0.00'} kWh</strong> • Estimasi Biaya: <strong className="text-emerald-400 font-mono text-sm">{formatIDR(analytics?.estimated_cost_today_idr || 0)}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Total Energi Hari Ini</span>
                    <span className="text-cyan-400 font-bold text-sm">{analytics?.total_kwh_today || '0.00'} kWh</span>
                  </div>
                  <div className="w-px h-6 bg-slate-800"></div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Daya Aktif Saat Ini</span>
                    <span className="text-amber-400 font-bold text-sm">{analytics?.total_active_power_watts || 0} W</span>
                  </div>
                </div>
              </div>

              {/* Progress Meter Bar Distribusi Penggunaan Energi kWh Hari Ini */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Distribusi Penggunaan Energi Listrik (kWh) Tiap Perangkat Hari Ini</span>
                  <span className="text-cyan-400 font-bold">
                    Total: {analytics?.total_kwh_today || '0.00'} kWh
                  </span>
                </div>

                {/* Dynamic Multi-color Stacked kWh Bar */}
                <div className="w-full h-3.5 rounded-full bg-slate-950 border border-slate-800 p-0.5 overflow-hidden flex gap-0.5">
                  {analytics?.device_breakdown?.map((dev, idx) => {
                    const pct = parseFloat(dev.percentage) || 0
                    if (pct <= 0) return null
                    const colors = [
                      'bg-indigo-500',
                      'bg-cyan-400',
                      'bg-amber-400',
                      'bg-emerald-400',
                      'bg-purple-500',
                      'bg-rose-500'
                    ]
                    const bgCol = colors[idx % colors.length]
                    return (
                      <div
                        key={`bar-${dev.id}`}
                        style={{ width: `${pct}%` }}
                        className={`h-full ${bgCol} transition-all duration-500 hover:opacity-90`}
                        title={`${dev.name}: ${dev.kwh_today} kWh (${dev.percentage}%)`}
                      ></div>
                    )
                  })}
                </div>
              </div>

              {/* Per-Device kWh & Watt Consumption Live Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {analytics?.device_breakdown?.map((dev) => (
                  <div
                    key={`kwh-card-${dev.id}`}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between bg-slate-950/70 ${dev.status ? 'border-indigo-500/30 shadow-md shadow-indigo-500/5' : 'border-slate-800/80 opacity-80'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${dev.status ? 'bg-emerald-400 shadow-md shadow-emerald-400/50 animate-pulse' : 'bg-slate-600'}`}></div>
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          {dev.name}
                          <span className="text-[10px] text-slate-400 font-mono font-normal">({dev.percentage}%)</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Daya: <strong className={dev.status ? 'text-amber-400' : 'text-slate-500'}>{dev.status ? dev.power_watt : 0} W</strong> • Est: <strong className="text-emerald-400">{formatIDR(dev.daily_estimated_cost_idr || 0)}/hari</strong>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-extrabold font-mono text-cyan-400">
                        {dev.kwh_today} <span className="text-[10px] font-medium text-slate-400">kWh</span>
                      </span>
                      <span className="block text-[9px] text-slate-400 uppercase font-semibold">
                        Terpakai: {formatIDR(dev.cost_today_idr || dev.cost_idr || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Rekomendasi Cerdas */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 shadow-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Rekomendasi Hemat Energi Cerdas (AI Insights)
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {analytics?.recommendations?.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: KONTROL PERANGKAT & SAKLAR REALTIME */}
        {activeTab === 'devices' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  Pemantauan Telemetri Realtime per Perangkat
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono font-medium">
                    {devices.length} Terhubung
                  </span>
                </h2>
                <p className="text-sm text-slate-400">Pantau Daya (W), Tegangan (V), Arus Listrik (A), dan Saklar secara live</p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  id="btn-scan-tuya-devices-tab"
                  onClick={handleStartTuyaScan}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-600/25 border border-cyan-400/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-200"></span>
                  </span>
                  <span>🔍 Pindai Perangkat (Scan Tuya)</span>
                </button>

                <button
                  id="btn-sync-all-tuya"
                  onClick={handleSyncAllFromTuya}
                  disabled={isSyncingAll}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Sinkronkan status dan nama dari Tuya Cloud"
                >
                  <svg className={`w-3.5 h-3.5 text-indigo-400 ${isSyncingAll ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Sinkronisasi</span>
                </button>

                <button
                  onClick={() => {
                    if (currentUser?.role !== 'admin') {
                      setRbacAlert('Akses Ditolak: Diperlukan peran Admin untuk mendaftarkan perangkat.')
                      return
                    }
                    setShowAddModal(true)
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>+ Tambah Manual</span>
                </button>
              </div>
            </div>

            {/* Realtime Energy (kWh) & Watt Power Monitor Widget per Perangkat */}
            <div className="mb-8 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold text-lg shadow-lg shadow-cyan-500/10 animate-pulse">
                    📊
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Penggunaan Energi Terpakai (kWh) & Daya Realtime Tiap Perangkat
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Total Energi Terpakai Hari Ini: <strong className="text-cyan-400 font-mono text-sm">{analytics?.total_kwh_today || '0.00'} kWh</strong> • Estimasi Biaya: <strong className="text-emerald-400 font-mono text-sm">{formatIDR(analytics?.estimated_cost_today_idr || 0)}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Total Energi Hari Ini</span>
                    <span className="text-cyan-400 font-bold text-sm">{analytics?.total_kwh_today || '0.00'} kWh</span>
                  </div>
                  <div className="w-px h-6 bg-slate-800"></div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Daya Aktif Saat Ini</span>
                    <span className="text-amber-400 font-bold text-sm">{analytics?.total_active_power_watts || 0} W</span>
                  </div>
                </div>
              </div>

              {/* Progress Meter Bar Distribusi Penggunaan Energi kWh Hari Ini */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Distribusi Penggunaan Energi Listrik (kWh) Tiap Perangkat Hari Ini</span>
                  <span className="text-cyan-400 font-bold">
                    Total: {analytics?.total_kwh_today || '0.00'} kWh
                  </span>
                </div>

                {/* Dynamic Multi-color Stacked kWh Bar */}
                <div className="w-full h-3.5 rounded-full bg-slate-950 border border-slate-800 p-0.5 overflow-hidden flex gap-0.5">
                  {analytics?.device_breakdown?.map((dev, idx) => {
                    const pct = parseFloat(dev.percentage) || 0
                    if (pct <= 0) return null
                    const colors = [
                      'bg-indigo-500',
                      'bg-cyan-400',
                      'bg-amber-400',
                      'bg-emerald-400',
                      'bg-purple-500',
                      'bg-rose-500'
                    ]
                    const bgCol = colors[idx % colors.length]
                    return (
                      <div
                        key={`bar-${dev.id}`}
                        style={{ width: `${pct}%` }}
                        className={`h-full ${bgCol} transition-all duration-500 hover:opacity-90`}
                        title={`${dev.name}: ${dev.kwh_today} kWh (${dev.percentage}%)`}
                      ></div>
                    )
                  })}
                </div>
              </div>

              {/* Per-Device kWh & Watt Consumption Live Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {analytics?.device_breakdown?.map((dev) => (
                  <div
                    key={`kwh-card-${dev.id}`}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between bg-slate-950/70 ${dev.status ? 'border-indigo-500/30 shadow-md shadow-indigo-500/5' : 'border-slate-800/80 opacity-80'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${dev.status ? 'bg-emerald-400 shadow-md shadow-emerald-400/50 animate-pulse' : 'bg-slate-600'}`}></div>
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          {dev.name}
                          <span className="text-[10px] text-slate-400 font-mono font-normal">({dev.percentage}%)</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Daya: <strong className={dev.status ? 'text-amber-400' : 'text-slate-500'}>{dev.status ? dev.power_watt : 0} W</strong> • Biaya: {formatIDR(dev.cost_idr)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-extrabold font-mono text-cyan-400">
                        {dev.kwh_today} <span className="text-[10px] font-medium text-slate-400">kWh</span>
                      </span>
                      <span className="block text-[9px] text-slate-400 uppercase font-semibold">Energi Terpakai</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-56 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"></div>
                ))}
              </div>
            ) : devices.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-200">Belum Ada Perangkat di Database</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-6">
                  Daftarkan perangkat Tuya Anda untuk mulai mengontrol saklar dan memantau pemakaian daya, tegangan & arus secara realtime.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={handleStartTuyaScan}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-600/30 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-200"></span>
                    </span>
                    <span>🔍 Pindai Otomatis dari Akun Tuya Smart</span>
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                  >
                    + Input Manual ID Perangkat
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {devices.map(device => {
                  const isToggling = toggleLoading[device.id]
                  const voltage = device.status ? (device.voltage_volts || '220.0') : '0.0'
                  const current = device.status ? (device.current_amps || ((device.power || 0) / 220.0).toFixed(2)) : '0.00'
                  const devBreakdown = analytics?.device_breakdown?.find(b => b.id === device.id)

                  return (
                    <div
                      key={device.id}
                      className={`p-6 rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                        device.status
                          ? 'bg-slate-900 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Status Indicator Glow */}
                      {device.status && (
                        <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>
                      )}

                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700/50">
                              ID: {device.id.slice(0, 14)}...
                            </span>
                            <h3 className="text-lg font-bold text-slate-100 mt-2">{device.name}</h3>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Delete Button */}
                            <button
                              id={`delete-btn-${device.id}`}
                              title="Hapus Perangkat"
                              onClick={() => setDeleteTarget(device)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Real-time Telemetry Metrics Badge Grid */}
                        <div className="grid grid-cols-2 gap-2 my-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 font-mono">
                          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                            <p className="text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1">
                              📊 Energi Terpakai
                            </p>
                            <p className="text-sm font-extrabold text-cyan-400 mt-0.5">
                              {devBreakdown?.kwh_today || '0.00'} <span className="text-[10px] font-medium text-slate-400">kWh</span>
                            </p>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                            <p className="text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1">
                              ⚡ Daya Realtime
                            </p>
                            <p className={`text-sm font-extrabold mt-0.5 ${device.status ? 'text-amber-400' : 'text-slate-500'}`}>
                              {device.status ? (device.power || 0) : 0} <span className="text-[10px] font-medium text-slate-400">Watt</span>
                            </p>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                            <p className="text-[9px] text-slate-400 uppercase font-bold">Tegangan / Arus</p>
                            <p className={`text-xs font-extrabold mt-0.5 ${device.status ? 'text-indigo-300' : 'text-slate-500'}`}>
                              {voltage}V / {current}A
                            </p>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800" title={`Energi terpakai hari ini: ${devBreakdown?.kwh_today || '0.00'} kWh (${formatIDR(devBreakdown?.cost_today_idr || devBreakdown?.cost_idr || 0)})`}>
                            <p className="text-[9px] text-slate-400 uppercase font-bold">Estimasi / Hari</p>
                            <p className="text-xs font-extrabold text-emerald-400 mt-0.5">
                              {formatIDR(devBreakdown?.daily_estimated_cost_idr || 0)}
                            </p>
                            <span className="block text-[8px] text-slate-400 truncate mt-0.5">
                              Terpakai: {devBreakdown?.kwh_today || '0.00'} kWh
                            </span>
                          </div>
                        </div>
                        {/* Per-Device Priority & RBAC Badge & Selector */}
                        <div className="mt-3 pt-2.5 border-t border-slate-800/60 space-y-2 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium flex items-center gap-1">
                              <span className="text-amber-400">🛡️</span>
                              Prioritas Anti-Jeglek:
                            </span>

                            {currentUser?.role === 'admin' ? (
                              <select
                                value={device.priority || 2}
                                onChange={(e) => handleUpdateDevicePriority(device.id, Number(e.target.value))}
                                className="bg-slate-800 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700 focus:outline-none cursor-pointer"
                              >
                                <option value="1">🛡️ Kritis (Pantang Mati)</option>
                                <option value="2">⚖️ Normal</option>
                                <option value="3">✂️ Sekunder (Lepas Beban)</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                (device.priority || 2) === 1 ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' :
                                (device.priority || 2) === 3 ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' :
                                'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              }`}>
                                {(device.priority || 2) === 1 ? '🛡️ Kritis' :
                                 (device.priority || 2) === 3 ? '✂️ Sekunder' : '⚖️ Normal'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              Hak Akses Saklar:
                            </span>

                            {currentUser?.role === 'admin' ? (
                              <select
                                value={device.allowed_roles || 'admin,operator'}
                                onChange={(e) => handleUpdateDeviceRbac(device.id, e.target.value)}
                                className="bg-slate-800 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700 focus:outline-none cursor-pointer"
                              >
                                <option value="admin">👑 Admin Only</option>
                                <option value="admin,operator">⚡ Admin & Operator</option>
                                <option value="admin,operator,viewer">🌐 Semua Role (Inc. Viewer)</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                (device.allowed_roles || 'admin,operator').includes('viewer') ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' :
                                (device.allowed_roles || 'admin,operator') === 'admin' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30' :
                                'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              }`}>
                                {(device.allowed_roles || 'admin,operator') === 'admin' ? '👑 Admin Only' :
                                 (device.allowed_roles || 'admin,operator').includes('viewer') ? '🌐 Semua Role' : '⚡ Admin & Operator'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Active Countdown Timer Badge */}
                      {deviceTimers[device.id] && (
                        <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
                          <div className="flex items-center gap-1.5 font-medium">
                            <span className="animate-spin text-xs">⏱️</span>
                            <span>Otomatis {deviceTimers[device.id].target_action} dlm:</span>
                            <strong className="font-mono text-amber-200">
                              {Math.floor(deviceTimers[device.id].remaining_seconds / 60)}m {deviceTimers[device.id].remaining_seconds % 60}s
                            </strong>
                          </div>
                          {currentUser.role !== 'viewer' && (
                            <button
                              onClick={() => handleCancelTimer(device.id)}
                              className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer ml-2"
                              title="Batalkan timer ini"
                            >
                              ✕ Batalkan
                            </button>
                          )}
                        </div>
                      )}

                      <div className="pt-3 mt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-400 font-medium">Status Saklar</p>
                          <p className={`text-sm font-bold flex items-center gap-1.5 ${device.status ? 'text-emerald-400' : 'text-slate-400'}`}>
                            <span className={`w-2 h-2 rounded-full ${device.status ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                            {device.status ? 'ON (Menyala)' : 'OFF (Mati)'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            id={`timer-btn-${device.id}`}
                            onClick={() => {
                              setTimerModalDeviceId(device.id)
                              setTimerAction(device.status ? 'OFF' : 'ON')
                            }}
                            title="Atur Timer Hitung Mundur Otomatis"
                            className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            ⏱️ Timer
                          </button>
                          <button
                            id={`toggle-${device.id}`}
                            disabled={isToggling}
                            onClick={() => handleToggle(device.id, device.status)}
                            className={`relative px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                              device.status
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                            } ${isToggling ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            {isToggling && (
                              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                              </svg>
                            )}
                            {device.status ? 'TURN OFF' : 'TURN ON'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* SEKSI JADWAL RUTINITAS OTOMATIS (SMART SCHEDULES) */}
            <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/10">
                    📅
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Jadwal Saklar Otomatis (Smart Schedules)
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {schedules.filter(s => s.is_active).length} Aktif
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Nyalakan atau matikan saklar perangkat secara otomatis berdasarkan jam dan hari berulang
                    </p>
                  </div>
                </div>

                {currentUser.role !== 'viewer' && (
                  <button
                    id="add-schedule-btn"
                    onClick={() => {
                      if (devices.length > 0) {
                        setSchedDeviceId(devices[0].id)
                      }
                      setShowScheduleModal(true)
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
                  >
                    <span>+</span> Tambah Jadwal Baru
                  </button>
                )}
              </div>

              {schedules.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
                  <span className="text-3xl block mb-2">⏱️</span>
                  <p className="text-sm font-semibold text-slate-300">Belum Ada Aturan Jadwal Otomatis</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Buat rutinitas saklar otomatis (misal: menyalakan pompa air jam 06:00 dan mematikan jam 08:00).
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schedules.map(sched => (
                    <div
                      key={sched.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        sched.is_active
                          ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-950/40 border-slate-900 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            {sched.device_name || sched.device_id}
                          </p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            sched.action === 'ON'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            {sched.action === 'ON' ? '⚡ NYALAKAN (ON)' : '⭕ MATIKAN (OFF)'}
                          </span>
                        </div>

                        {currentUser.role !== 'viewer' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleSchedule(sched.id)}
                              title={sched.is_active ? 'Jeda Jadwal' : 'Aktifkan Jadwal'}
                              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                sched.is_active
                                  ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                              }`}
                            >
                              {sched.is_active ? 'Aktif' : 'Nonaktif'}
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(sched.id)}
                              title="Hapus Jadwal"
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-indigo-300 font-mono font-bold text-sm">
                          <span>🕒</span> {sched.time_target} WIB
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {sched.days === 'ALL' ? 'Setiap Hari' :
                           sched.days === 'WEEKDAY' ? 'Senin - Jumat' :
                           sched.days === 'WEEKEND' ? 'Sabtu - Minggu' : sched.days}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ANALITIK LISTRIK REALTIME, TARIF PLN & PREDIKSI */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {/* Realtime Telemetry Status Indicator Bar */}
            <div className="p-3 px-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-cyan-400 animate-ping' : 'bg-rose-500'}`}></span>
                <span className="font-semibold text-slate-200">
                  Status Koneksi Telemetri: {wsConnected ? 'Terhubung (Pembaruan Live Otomatis Realtime)' : 'Terputus (Mencoba Terhubung...)'}
                </span>
              </div>
            </div>

            {/* SEKSI TARGET ANGGARAN BULANAN (BUDGET TRACKER) & EKSPOR CSV */}
            {budget && (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg shadow-inner">
                      💰
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        Target Kuota Anggaran Listrik Bulanan
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          budget.is_exceeded 
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : budget.is_near_limit 
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {budget.is_exceeded ? 'Melebihi Kuota (Overbudget)' : budget.is_near_limit ? 'Mendekati Kuota' : 'Aman Terkendali'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Pantau realisasi pengeluaran listrik berjalan terhadap target anggaran bulanan keluarga
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCsv}
                      id="btn-export-csv"
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-300 transition-all shadow-md shadow-cyan-600/10 flex items-center gap-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Unduh Laporan (CSV / Excel)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Gauge Bar Biaya Berjalan */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Biaya Listrik Bulan Berjalan</span>
                      <span className="font-mono text-cyan-400 font-bold">{budget.usage_pct}% terpakai</span>
                    </div>
                    <p className="text-2xl font-mono font-extrabold text-white">
                      {formatIDR(budget.current_month_cost_idr)}
                      <span className="text-xs font-normal text-slate-400 ml-1.5">/ {formatIDR(budget.monthly_budget_idr)}</span>
                    </p>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          budget.is_exceeded ? 'bg-rose-500' :
                          budget.is_near_limit ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, parseFloat(budget.usage_pct) || 0)}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-500 block">Total akumulasi: {budget.current_month_kwh?.toFixed(2)} kWh</span>
                  </div>

                  {/* Proyeksi Akhir Bulan */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-slate-400 block text-[11px]">Proyeksi Tagihan Akhir Bulan</span>
                    <p className={`text-xl font-mono font-extrabold ${budget.projected_month_cost_idr > budget.monthly_budget_idr ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {formatIDR(budget.projected_month_cost_idr)}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {budget.projected_month_cost_idr > budget.monthly_budget_idr 
                        ? '⚠️ Proyeksi konsumsi saat ini berpotensi melampaui kuota anggaran yang ditentukan.' 
                        : '✅ Laju konsumsi harian Anda berada di bawah batas target anggaran bulanan.'}
                    </p>
                  </div>

                  {/* Pengaturan Kuota Anggaran */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-slate-400 block text-[11px]">Ubah Target Kuota Bulanan</span>
                    {currentUser?.role === 'admin' ? (
                      <form onSubmit={handleSaveBudget} className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="50000"
                            min="100000"
                            value={budgetInput}
                            onChange={(e) => setBudgetInput(parseFloat(e.target.value) || 750000)}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            type="submit"
                            disabled={savingBudget}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                          >
                            {savingBudget ? '...' : 'Simpan'}
                          </button>
                        </div>
                        {budgetMsg && <p className="text-[10px] text-emerald-400">{budgetMsg}</p>}
                      </form>
                    ) : (
                      <p className="text-sm font-mono font-bold text-white">{formatIDR(budget.monthly_budget_idr)}</p>
                    )}
                    <p className="text-[10px] text-slate-500">Anggaran dijadikan patokan indikator peringatan warna.</p>
                  </div>
                </div>
              </div>
            )}

            {/* SEKSI GOLONGAN TARIF LISTRIK PLN (450VA, 900VA, 1300-2200VA, 3500VA+) */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Pilihan Golongan Tarif Listrik PLN (Kategori Daya Rumah)
                  </h3>
                  <p className="text-xs text-slate-400">Pilih tarif yang sesuai dengan daya listrik terpasang di rumah Anda untuk kalkulasi akurat</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {analytics?.tariff_options?.map(t => {
                  const isSelected = selectedTariff === t.code
                  return (
                    <div
                      key={t.code}
                      onClick={() => handleTariffChange(t.code)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/10'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            {t.power_category}
                          </span>
                          {isSelected && (
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">{t.name}</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{t.description}</p>
                      </div>

                      <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Tarif PLN</span>
                        <span className="text-sm font-bold text-emerald-400 font-mono">
                          Rp {t.rate_per_kwh.toLocaleString('id-ID')} / kWh
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Active Power Watts */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30 shadow-lg shadow-indigo-500/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400">Daya Aktif Realtime</span>
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {analytics ? analytics.total_active_power_watts : 0} <span className="text-lg font-medium text-slate-400">Watt</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Beban daya aktif terbarui secara realtime</p>
              </div>

              {/* Energy Consumed Today (kWh) */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-cyan-400">Konsumsi Hari Ini</span>
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {analytics ? analytics.total_kwh_today : '0.00'} <span className="text-lg font-medium text-slate-400">kWh</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Tarif Dipilih: Rp {analytics?.selected_tariff_rate?.toLocaleString('id-ID')} / kWh</p>
              </div>

              {/* Estimated Today Cost */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Estimasi Biaya Hari Ini</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-emerald-400">
                  {analytics ? formatIDR(analytics.estimated_cost_today_idr) : 'Rp 0'}
                </div>
                <p className="text-xs text-slate-400 mt-2">Dihitung dari akumulasi kWh hari ini</p>
              </div>

              {/* Estimated Monthly Bill */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-amber-400">Proyeksi Tagihan Bulan Ini</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-amber-400">
                  {analytics ? formatIDR(analytics.estimated_cost_month_idr) : 'Rp 0'}
                </div>
                <p className="text-xs text-slate-400 mt-2">Proyeksi 30 hari berdasarkan tarif PLN {selectedTariff}</p>
              </div>
            </div>

            {/* Main Section: Interactive Usage Chart + Device Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Chart Card (2 cols on large screen) */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">Grafik Tren Penggunaan Listrik</h3>
                    <p className="text-xs text-slate-400">Riwayat konsumsi kWh dan fluktuasi pemakaian daya</p>
                  </div>

                  <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700/60 text-xs font-semibold">
                    <button
                      onClick={() => setChartTimeframe('daily')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${chartTimeframe === 'daily' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      7 Hari Terakhir
                    </button>
                    <button
                      onClick={() => setChartTimeframe('hourly')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${chartTimeframe === 'hourly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      24 Jam Terakhir
                    </button>
                  </div>
                </div>

                {/* Custom SVG Interactive & Trend Line Chart */}
                {analyticsLoading ? (
                  <div className="h-64 flex items-center justify-center text-slate-500">Memuat data grafik...</div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const dataPoints = (chartTimeframe === 'daily' ? analytics?.daily_usage : analytics?.hourly_usage) || []
                      const maxVal = Math.max(...dataPoints.map((d: any) => d.kwh || 0), 0.05)
                      const chartWidth = 720
                      const chartHeight = 220
                      const paddingX = 40
                      const paddingY = 28
                      const innerW = chartWidth - paddingX * 2
                      const innerH = chartHeight - paddingY * 2

                      // Generate coordinates for SVG Path
                      const points = dataPoints.map((d: any, idx: number) => {
                        const x = dataPoints.length > 1
                          ? paddingX + (idx / (dataPoints.length - 1)) * innerW
                          : paddingX + innerW / 2
                        const norm = Math.min(1, Math.max(0, (d.kwh || 0) / maxVal))
                        const y = paddingY + innerH - norm * innerH
                        return { x, y, ...d, idx }
                      })

                      const pathD = points.length > 0
                        ? points.reduce((acc: string, pt: any, i: number, arr: any[]) => {
                            if (i === 0) return `M ${pt.x} ${pt.y}`
                            const prev = arr[i - 1]
                            const cX1 = prev.x + (pt.x - prev.x) / 2
                            const cY1 = prev.y
                            const cX2 = prev.x + (pt.x - prev.x) / 2
                            const cY2 = pt.y
                            return `${acc} C ${cX1} ${cY1}, ${cX2} ${cY2}, ${pt.x} ${pt.y}`
                          }, '')
                        : ''

                      const areaD = points.length > 0
                        ? `${pathD} L ${points[points.length - 1].x} ${paddingY + innerH} L ${points[0].x} ${paddingY + innerH} Z`
                        : ''

                      const activeItem = hoveredChartIndex !== null && points[hoveredChartIndex]
                        ? points[hoveredChartIndex]
                        : (points.length > 0 ? points[points.length - 1] : null)

                      return (
                        <div className="space-y-4">
                          {/* Active Hover / Touch Card Highlight (Responsif & Jelas di Mobile) */}
                          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2.5">
                              <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
                                📊
                              </span>
                              <div>
                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                                  {chartTimeframe === 'daily' ? 'Hari Terpilih' : 'Jam Terpilih'}
                                </span>
                                <span className="font-bold text-white text-sm">
                                  {activeItem ? (chartTimeframe === 'daily' ? `${activeItem.day}, ${activeItem.date || ''}` : `Jam ${activeItem.hour}`) : '-'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Energi Listrik</span>
                                <span className="font-extrabold font-mono text-cyan-400 text-sm">
                                  {activeItem ? activeItem.kwh.toFixed(3) : '0.000'} <span className="text-[10px] font-normal text-slate-400">kWh</span>
                                </span>
                              </div>
                              <div className="w-px h-7 bg-slate-800"></div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Estimasi Biaya</span>
                                <span className="font-extrabold font-mono text-emerald-400 text-sm">
                                  {activeItem ? formatIDR(activeItem.cost) : 'Rp 0'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Responsive Vector Chart Container */}
                          <div className="w-full bg-slate-950/80 rounded-2xl p-3 sm:p-5 border border-slate-800/90 shadow-inner relative overflow-hidden">
                            <div className="w-full relative aspect-[16/8] sm:aspect-[21/9] min-h-[190px]">
                              <svg
                                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                preserveAspectRatio="none"
                                className="w-full h-full overflow-visible"
                              >
                                <defs>
                                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                                    <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.12" />
                                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                                  </linearGradient>
                                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#818cf8" />
                                    <stop offset="50%" stopColor="#38bdf8" />
                                    <stop offset="100%" stopColor="#34d399" />
                                  </linearGradient>
                                </defs>

                                {/* Y-Axis Horizontal Grid Lines */}
                                {[0, 0.33, 0.66, 1].map((ratio, i) => {
                                  const y = paddingY + innerH * (1 - ratio)
                                  const labelVal = (maxVal * ratio).toFixed(2)
                                  return (
                                    <g key={`grid-line-${i}`}>
                                      <line
                                        x1={paddingX}
                                        y1={y}
                                        x2={chartWidth - paddingX}
                                        y2={y}
                                        stroke="#334155"
                                        strokeOpacity="0.4"
                                        strokeDasharray="4 4"
                                      />
                                      <text
                                        x={paddingX - 6}
                                        y={y + 3}
                                        fill="#64748b"
                                        fontSize="9"
                                        textAnchor="end"
                                        fontFamily="monospace"
                                      >
                                        {labelVal}
                                      </text>
                                    </g>
                                  )
                                })}

                                {/* Area Under Curve */}
                                {areaD && (
                                  <path d={areaD} fill="url(#areaGrad)" />
                                )}

                                {/* Smooth Spline Curve */}
                                {pathD && (
                                  <path
                                    d={pathD}
                                    fill="none"
                                    stroke="url(#lineGrad)"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                )}

                                {/* Active Vertical Indicator Line */}
                                {activeItem && (
                                  <line
                                    x1={activeItem.x}
                                    y1={paddingY}
                                    x2={activeItem.x}
                                    y2={paddingY + innerH}
                                    stroke="#38bdf8"
                                    strokeWidth="1.5"
                                    strokeDasharray="3 3"
                                    strokeOpacity="0.8"
                                  />
                                )}

                                {/* Interactive Data Nodes */}
                                {points.map((pt: any) => {
                                  const isSelected = activeItem && activeItem.idx === pt.idx
                                  return (
                                    <g
                                      key={`pt-${pt.idx}`}
                                      className="cursor-pointer"
                                      onMouseEnter={() => setHoveredChartIndex(pt.idx)}
                                      onClick={() => setHoveredChartIndex(pt.idx)}
                                    >
                                      {/* Invisible Touch/Hover Target */}
                                      <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" />

                                      {/* Visible Glowing Node */}
                                      <circle
                                        cx={pt.x}
                                        cy={pt.y}
                                        r={isSelected ? '6.5' : '4'}
                                        fill={isSelected ? '#38bdf8' : '#0f172a'}
                                        stroke={isSelected ? '#ffffff' : '#6366f1'}
                                        strokeWidth={isSelected ? '2.5' : '2'}
                                        className="transition-all duration-150"
                                      />
                                    </g>
                                  )
                                })}
                              </svg>
                            </div>

                            {/* Responsive X-Axis Labels (Scrollable / Auto Clamped on Mobile) */}
                            <div className="flex items-center justify-between gap-1 pt-3 mt-2 border-t border-slate-800/80 overflow-x-auto scrollbar-none text-[11px] font-semibold text-slate-400">
                              {points.map((pt: any) => {
                                const isSelected = activeItem && activeItem.idx === pt.idx
                                return (
                                  <button
                                    key={`lbl-${pt.idx}`}
                                    onClick={() => setHoveredChartIndex(pt.idx)}
                                    className={`flex-1 text-center py-1 px-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                                      isSelected
                                        ? 'bg-indigo-500/20 text-cyan-300 font-bold border border-indigo-500/40'
                                        : 'hover:text-slate-200'
                                    }`}
                                  >
                                    <span className="block text-[11px] leading-tight">
                                      {chartTimeframe === 'daily' ? pt.day : pt.hour}
                                    </span>
                                    {chartTimeframe === 'daily' && pt.date && (
                                      <span className="block text-[9px] text-slate-500 leading-tight">
                                        {pt.date}
                                      </span>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                              <span>Pembaruan Data: Realtime Otomatis Aktif</span>
                            </span>
                            <span className="text-[11px] text-slate-500 italic">
                              💡 Ketuk titik data atau label untuk melihat detail konsumsi & biaya
                            </span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* Device Usage Breakdown Card - REALTIME METRICS PER DEVICE */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Telemetri & Konsumsi per Perangkat</h3>
                  <p className="text-xs text-slate-400 mb-6">Metrik realtime Watt, Tegangan (V), Arus (A) & Biaya</p>

                  <div className="space-y-5">
                    {analytics?.device_breakdown.map(dev => (
                      <div key={dev.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${dev.status ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                            {dev.name}
                          </span>
                          <span className="font-mono text-indigo-400 font-bold">{dev.percentage}% ({dev.kwh_today} kWh)</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            style={{ width: `${Math.max(parseFloat(dev.percentage), 5)}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
                          ></div>
                        </div>

                        {/* Per-device Live Telemetry Badge Table */}
                        <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                          <div>
                            <span className="block text-[9px] text-slate-500">DAYA AKTIF</span>
                            <span className="font-bold text-amber-400">{dev.status ? dev.power_watt : 0} W</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-500">EST. / HARI</span>
                            <span className="font-bold text-emerald-400">{formatIDR(dev.daily_estimated_cost_idr || 0)}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-500">KWH HARI INI</span>
                            <span className="font-bold text-cyan-400">{dev.kwh_today}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-500">BIAYA TERPAKAI</span>
                            <span className="font-bold text-indigo-300">{formatIDR(dev.cost_today_idr || dev.cost_idr)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Energy Tip */}
                <div className="mt-6 pt-4 border-t border-slate-800/80 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2.5">
                  <svg className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    <strong>Pembaruan Live Realtime:</strong> Perubahan beban daya dan arus per perangkat langsung diperbarui ke layar secara instan.
                  </span>
                </div>
              </div>
            </div>

            {/* SEKSI RIWAYAT PEMAKAIAN LISTRIK HARIAN (DAILY USAGE HISTORY & RECAP) */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg shadow-inner">
                    📅
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Riwayat Pemakaian Listrik Harian
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        {dailyHistoryDays} Hari Terakhir
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Rekapitulasi penggunaan daya, total kWh, dan estimasi biaya per hari dari telemetri tersimpan
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Filter Device */}
                  <select
                    value={dailyHistoryDeviceFilter}
                    onChange={(e) => setDailyHistoryDeviceFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Semua Perangkat</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>

                  {/* Filter Range Pills */}
                  <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700/60 text-xs font-semibold">
                    {[7, 14, 30].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDailyHistoryDays(d)}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          dailyHistoryDays === d
                            ? 'bg-cyan-600 text-white shadow-sm font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {d} Hari
                      </button>
                    ))}
                  </div>

                  {/* Sync History Button */}
                  <button
                    onClick={handleSyncHistory}
                    disabled={syncingHistory}
                    id="btn-sync-history-tuya"
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/40 text-amber-300 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <svg className={`w-3.5 h-3.5 ${syncingHistory ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {syncingHistory ? 'Menyinkronkan...' : 'Sinkronkan Riwayat (Tuya Sync)'}
                  </button>

                  {/* Export CSV Button */}
                  <button
                    onClick={handleExportDailyCsv}
                    disabled={exportingDailyCsv}
                    id="btn-export-daily-csv"
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-300 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {exportingDailyCsv ? 'Mengunduh...' : 'Unduh CSV Harian'}
                  </button>
                </div>
              </div>

              {/* 4 Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* Card 1: Rata-rata Konsumsi Harian */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase tracking-wider">
                    Rata-rata Konsumsi Harian
                  </span>
                  <p className="text-xl font-mono font-extrabold text-cyan-400">
                    {dailyHistorySummary ? `${dailyHistorySummary.avg_daily_kwh.toFixed(2)} kWh` : '0.00 kWh'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Estimasi {formatIDR(dailyHistorySummary?.avg_daily_cost_idr || 0)} / hari
                  </p>
                </div>

                {/* Card 2: Hari Tertinggi (Peak Day) */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase tracking-wider">
                    Hari Pemakaian Tertinggi
                  </span>
                  <p className="text-xl font-mono font-extrabold text-rose-400">
                    {dailyHistorySummary?.highest_day ? `${dailyHistorySummary.highest_day.kwh.toFixed(2)} kWh` : '-'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {dailyHistorySummary?.highest_day
                      ? `${dailyHistorySummary.highest_day.day}, ${dailyHistorySummary.highest_day.date} (${formatIDR(dailyHistorySummary.highest_day.cost)})`
                      : '-'}
                  </p>
                </div>

                {/* Card 3: Hari Paling Hemat */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase tracking-wider">
                    Hari Paling Hemat / Efisien
                  </span>
                  <p className="text-xl font-mono font-extrabold text-emerald-400">
                    {dailyHistorySummary?.lowest_day ? `${dailyHistorySummary.lowest_day.kwh.toFixed(2)} kWh` : '-'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {dailyHistorySummary?.lowest_day
                      ? `${dailyHistorySummary.lowest_day.day}, ${dailyHistorySummary.lowest_day.date} (${formatIDR(dailyHistorySummary.lowest_day.cost)})`
                      : '-'}
                  </p>
                </div>

                {/* Card 4: Total Akumulasi Periode */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase tracking-wider">
                    Total Akumulasi {dailyHistoryDays} Hari
                  </span>
                  <p className="text-xl font-mono font-extrabold text-indigo-400">
                    {dailyHistorySummary ? `${dailyHistorySummary.total_kwh.toFixed(2)} kWh` : '0.00 kWh'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    Total tagihan: {formatIDR(dailyHistorySummary?.total_cost_idr || 0)}
                  </p>
                </div>
              </div>

              {/* Table Riwayat Pemakaian Harian */}
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
                {dailyHistoryLoading ? (
                  <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
                    Memuat riwayat pemakaian per hari...
                  </div>
                ) : dailyHistoryList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Belum ada rekaman riwayat penggunaan pada periode ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Hari & Tanggal</th>
                          <th className="py-3 px-4">Konsumsi (kWh)</th>
                          <th className="py-3 px-4">Estimasi Biaya</th>
                          <th className="py-3 px-4">Beban Rata-rata</th>
                          <th className="py-3 px-4">Beban Puncak</th>
                          <th className="py-3 px-4">Efisiensi</th>
                          <th className="py-3 px-4 text-center">Rincian</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {dailyHistoryList.map((item) => {
                          const maxKwhInList = Math.max(...dailyHistoryList.map((i) => i.kwh), 1)
                          const pct = Math.min(100, Math.max(5, (item.kwh / maxKwhInList) * 100))
                          const isExpanded = expandedDayDate === item.date_raw

                          return (
                            <Fragment key={item.date_raw}>
                              <tr className={`hover:bg-slate-800/40 transition-colors ${item.is_today ? 'bg-cyan-950/20' : ''}`}>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm">{item.day}</span>
                                    <span className="text-slate-400 font-mono text-xs">{item.date}</span>
                                    {item.is_today && (
                                      <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                                        Hari Ini
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  <div className="space-y-1 min-w-[120px]">
                                    <div className="flex justify-between items-center font-mono font-bold text-cyan-300">
                                      <span>{item.kwh.toFixed(2)} kWh</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                      <div
                                        style={{ width: `${pct}%` }}
                                        className={`h-full rounded-full transition-all ${
                                          item.status_efficiency === 'Tinggi'
                                            ? 'bg-rose-500'
                                            : item.status_efficiency === 'Wajar'
                                            ? 'bg-amber-400'
                                            : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                                        }`}
                                      ></div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                                  {formatIDR(item.cost)}
                                </td>

                                <td className="py-3 px-4 font-mono text-slate-300">
                                  <span className="text-amber-400 font-bold">{item.avg_power_watt}</span> W
                                </td>

                                <td className="py-3 px-4 font-mono text-slate-300">
                                  <span className="text-indigo-400 font-bold">{item.peak_power_watt}</span> W
                                </td>

                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      item.status_efficiency === 'Tinggi'
                                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                        : item.status_efficiency === 'Wajar'
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    }`}
                                  >
                                    {item.status_efficiency === 'Tinggi' ? '🔴 Tinggi' : item.status_efficiency === 'Wajar' ? '🟡 Wajar' : '🟢 Hemat'}
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-center">
                                  <button
                                    onClick={() => setExpandedDayDate(isExpanded ? null : item.date_raw)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer inline-flex items-center gap-1 ${
                                      isExpanded
                                        ? 'bg-indigo-600 text-white border-indigo-500'
                                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                                    }`}
                                  >
                                    <span>Rincian</span>
                                    <span className="text-[10px] opacity-75">({item.devices?.length || 0})</span>
                                    <svg
                                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                </td>
                              </tr>

                              {/* Accordion Rincian Perangkat */}
                              {isExpanded && (
                                <tr className="bg-slate-950/80">
                                  <td colSpan={7} className="p-4 px-6">
                                    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                                      <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                                        <span className="font-bold text-slate-200">
                                          Kontribusi Konsumsi Perangkat ({item.day}, {item.full_date || item.date})
                                        </span>
                                        <span className="text-slate-400 font-mono text-[11px]">
                                          Total: {item.kwh.toFixed(2)} kWh • {formatIDR(item.cost)}
                                        </span>
                                      </div>

                                      {(!item.devices || item.devices.length === 0) ? (
                                        <p className="text-slate-500 text-xs py-2">
                                          Tidak ada perincian per perangkat khusus pada hari ini.
                                        </p>
                                      ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                                          {item.devices.map((d) => {
                                            const devPct = item.kwh > 0 ? ((d.kwh / item.kwh) * 100).toFixed(1) : '0.0'
                                            return (
                                              <div
                                                key={d.device_id}
                                                className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-2"
                                              >
                                                <div className="flex items-center justify-between">
                                                  <span className="font-semibold text-white truncate text-xs">
                                                    {d.device_name}
                                                  </span>
                                                  <span className="text-[10px] font-bold text-cyan-400 font-mono">
                                                    {devPct}%
                                                  </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-400">
                                                  <div>
                                                    <span className="text-slate-500 block text-[9px]">KWH</span>
                                                    <span className="font-bold text-slate-200">{d.kwh.toFixed(2)}</span>
                                                  </div>
                                                  <div>
                                                    <span className="text-slate-500 block text-[9px]">BIAYA</span>
                                                    <span className="font-bold text-emerald-400">{formatIDR(d.cost_idr)}</span>
                                                  </div>
                                                  <div>
                                                    <span className="text-slate-500 block text-[9px]">BEBAN</span>
                                                    <span className="font-bold text-amber-400">{d.avg_power_watt || d.power_watt || 0}W</span>
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Widget Validasi & Kalibrasi Akumulasi Energi Tuya Hardware Meter */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-cyan-950/30 to-slate-900 border border-cyan-500/30 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-inner">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">Validasi Telemetri & Riwayat Energi Tuya</h3>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        Hardware Meter Audit
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Verifikasi akurasi log BARA-Sense langsung dari meteran chip perangkat Tuya Cloud</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchTuyaValidation()}
                    disabled={tuyaValidationLoading}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <svg className={`w-3.5 h-3.5 ${tuyaValidationLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{tuyaValidationLoading ? 'Memeriksa...' : 'Pindai & Validasi'}</span>
                  </button>

                  <button
                    onClick={() => handleCalibrateTuya()}
                    disabled={tuyaCalibrating}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <svg className={`w-3.5 h-3.5 ${tuyaCalibrating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <span>{tuyaCalibrating ? 'Mengeksekusi...' : 'Kalibrasi Otomatis'}</span>
                  </button>
                </div>
              </div>

              {tuyaValidationLoading && !tuyaValidationData ? (
                <div className="py-8 text-center text-slate-400 text-sm animate-pulse">
                  Mengambil akumulasi telemetri meteran hardware dari Tuya Cloud...
                </div>
              ) : tuyaValidationData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Akurasi Telemetri Overall</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold font-mono text-cyan-300">
                          {tuyaValidationData.overall_accuracy.toFixed(1)}%
                        </span>
                        <span className="text-xs text-emerald-400 font-semibold">Tervalidasi Chip Meter</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Total Meteran Hardware Tuya</span>
                      <div className="text-2xl font-extrabold font-mono text-indigo-300">
                        {tuyaValidationData.total_tuya_kwh.toFixed(3)} <span className="text-sm">kWh</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Total Log Sistem BARA-Sense</span>
                      <div className="text-2xl font-extrabold font-mono text-emerald-300">
                        {tuyaValidationData.total_bara_kwh.toFixed(3)} <span className="text-sm">kWh</span>
                      </div>
                    </div>
                  </div>

                  {/* Device breakdown table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-4">Nama Perangkat</th>
                          <th className="py-2.5 px-4">Tuya Hardware Meter</th>
                          <th className="py-2.5 px-4">BARA-Sense History</th>
                          <th className="py-2.5 px-4">Selisih (Drift)</th>
                          <th className="py-2.5 px-4">Akurasi</th>
                          <th className="py-2.5 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {tuyaValidationData.devices?.map((d: any) => (
                          <tr key={d.device_id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 font-sans font-bold text-white flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${d.online ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                              <span>{d.name}</span>
                            </td>
                            <td className="py-3 px-4 text-indigo-300 font-bold">
                              {d.tuya_hardware_kwh.toFixed(3)} kWh
                            </td>
                            <td className="py-3 px-4 text-cyan-300 font-bold">
                              {d.bara_recorded_kwh.toFixed(3)} kWh
                            </td>
                            <td className="py-3 px-4">
                              <span className={Math.abs(d.difference_kwh) < 0.01 ? 'text-emerald-400' : 'text-amber-400'}>
                                {d.difference_kwh > 0 ? `+${d.difference_kwh.toFixed(3)}` : d.difference_kwh.toFixed(3)} kWh
                              </span>
                            </td>
                            <td className="py-3 px-4 font-sans">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                d.status === 'OPTIMAL'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              }`}>
                                {d.accuracy_percent.toFixed(1)}% {d.status === 'OPTIMAL' ? 'Presisi' : 'Perlu Sync'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleCalibrateTuya(d.device_id)}
                                disabled={tuyaCalibrating}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-sans font-semibold bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer disabled:opacity-50"
                              >
                                Kalibrasi
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  Tekan "Pindai & Validasi" untuk mengaudit akurasi telemetri energi BARA-Sense dengan Tuya Cloud.
                </div>
              )}
            </div>

            {/* Model Prediksi & Forecast Penggunaan Listrik 30 Hari */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Model Prediksi & Forecast Listrik 30 Hari (Tarif PLN: {selectedTariff})</h3>
                  <p className="text-xs text-slate-400">Proyeksi otomatis konsumsi daya & tagihan PLN berdasarkan tren pemakaian realtime</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Proyeksi kWh Bulanan</p>
                  <p className="text-xl font-bold text-cyan-400">{analytics ? analytics.predicted_kwh_month : '0.00'} kWh</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Proyeksi Tagihan Bulanan</p>
                  <p className="text-xl font-bold text-emerald-400">{analytics ? formatIDR(analytics.predicted_cost_month_idr) : 'Rp 0'}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Indeks Efisiensi Energi</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold text-indigo-400">{analytics ? analytics.efficiency_score : 100}%</p>
                    <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div style={{ width: `${analytics?.efficiency_score || 100}%` }} className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400"></div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Risiko Beban Lebih</p>
                  <p className={`text-sm font-bold ${analytics?.overload_risk?.includes('Tinggi') ? 'text-rose-400' : analytics?.overload_risk?.includes('Sedang') ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {analytics ? analytics.overload_risk : 'Rendah (Aman)'}
                  </p>
                </div>
              </div>

              {/* Rekomendasi Cerdas */}
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-2.5 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Rekomendasi Hemat Energi Cerdas (AI Insights)
                </h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  {analytics?.recommendations?.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Simulated Power Telemetry Sender Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Simulasi Telemetri Pengujian Daya</h3>
                  <p className="text-xs text-slate-400">Kirim sampel data daya perangkat untuk menguji pembaruan data secara live</p>
                </div>
              </div>

              <form onSubmit={handleSendTelemetryWS} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Perangkat</label>
                  <select
                    value={simDeviceId}
                    onChange={e => setSimDeviceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {devices.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.status ? `${d.power || 0}W - Aktif` : '0W - Mati'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Daya Telemetri (Watt)</label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    value={simPower}
                    onChange={e => setSimPower(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status Saklar</label>
                  <select
                    value={simStatus ? 'true' : 'false'}
                    onChange={e => setSimStatus(e.target.value === 'true')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="true">ON (Aktif)</option>
                    <option value="false">OFF (Mati)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!wsConnected}
                  className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Kirim Pengujian Telemetri
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: HAK AKSES & PENGATURAN RBAC */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-lg">
                  🛡️
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Pengaturan Hak Akses & RBAC (Role-Based Access Control)</h2>
                  <p className="text-xs text-slate-400">Konfigurasi Hak Akses Peran Global, Akses Per-Perangkat & Manajemen Pengguna</p>
                </div>
              </div>
            </div>

            {/* Settings Sub-Tabs Navigation */}
            <div className="flex border-b border-slate-800 overflow-x-auto">
              <button
                onClick={() => setRbacActiveTab('matrix')}
                className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  rbacActiveTab === 'matrix'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                📋 Matriks Hak Akses Peran Global
              </button>
              <button
                onClick={() => setRbacActiveTab('devices')}
                className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  rbacActiveTab === 'devices'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                ⚡ Hak Akses Per-Perangkat ({devices.length})
              </button>
              <button
                onClick={() => setRbacActiveTab('users')}
                className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  rbacActiveTab === 'users'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                👥 Kelola Pengguna ({usersList.length})
              </button>
              <button
                onClick={() => setRbacActiveTab('telegram')}
                className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  rbacActiveTab === 'telegram'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                🤖 Notifikasi Bot Telegram
              </button>
            </div>

            {/* Sub-Tab 1: Global RBAC Permission Matrix */}
            {rbacActiveTab === 'matrix' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-indigo-200">Matriks Hak Akses Peran RBAC (Configurable)</p>
                    <p className="text-[11px] text-indigo-300/80 mt-0.5">
                      {currentUser.role === 'admin'
                        ? '👑 Sebagai Admin, Anda dapat mencentang/mengubah izin setiap fitur secara langsung di bawah ini dan mengklik "Simpan Perubahan".'
                        : 'Sistem RBAC menggunakan 3 tingkatan peran (Admin, Operator, Viewer) untuk membatasi aksi sensitif.'}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 border-b border-slate-800 text-slate-300 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Fitur / Tindakan</th>
                        <th className="py-3.5 px-4 text-center">👑 Admin</th>
                        <th className="py-3.5 px-4 text-center">⚡ Operator</th>
                        <th className="py-3.5 px-4 text-center">👁️ Viewer (Tamu)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {permissionMatrix.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-800/40">
                          <td className="py-3.5 px-4 font-medium">
                            <span className="text-white block font-bold">{row.feature}</span>
                            <span className="text-[11px] text-slate-400">{row.desc}</span>
                          </td>
                          {/* Admin Cell */}
                          <td className="py-3.5 px-4 text-center">
                            {currentUser.role === 'admin' ? (
                              <button
                                type="button"
                                onClick={() => togglePermissionCell(row.id, 'admin')}
                                className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                  row.admin
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                                }`}
                              >
                                {row.admin ? '✓ Diizinkan' : '✕ Ditolak'}
                              </button>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                row.admin ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-slate-600'
                              }`}>
                                {row.admin ? '✓ Diizinkan' : '✕'}
                              </span>
                            )}
                          </td>
                          {/* Operator Cell */}
                          <td className="py-3.5 px-4 text-center">
                            {currentUser.role === 'admin' ? (
                              <button
                                type="button"
                                onClick={() => togglePermissionCell(row.id, 'operator')}
                                className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                  row.operator
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                                }`}
                              >
                                {row.operator ? '✓ Diizinkan' : '✕ Ditolak'}
                              </button>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                row.operator ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {row.operator ? '✓ Diizinkan' : '✕ Ditolak'}
                              </span>
                            )}
                          </td>
                          {/* Viewer Cell */}
                          <td className="py-3.5 px-4 text-center">
                            {currentUser.role === 'admin' ? (
                              <button
                                type="button"
                                onClick={() => togglePermissionCell(row.id, 'viewer')}
                                className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                  row.viewer
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                                }`}
                              >
                                {row.viewer ? '✓ Diizinkan' : '✕ Ditolak'}
                              </button>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                row.viewer ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {row.viewer ? '✓ Diizinkan' : '✕ Ditolak'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {currentUser.role === 'admin' && (
                  <div className="flex flex-wrap items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 gap-3">
                    <span className="text-xs text-slate-300 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Klik tombol ✓ / ✕ pada tabel di atas untuk mengubah hak akses, lalu simpan perubahan.
                    </span>
                    <button
                      id="save-permissions-btn"
                      onClick={handleSavePermissions}
                      disabled={saveMatrixLoading}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {saveMatrixLoading ? 'Menyimpan...' : '💾 Simpan Perubahan Matriks RBAC'}
                    </button>
                  </div>
                )}

                {saveMatrixMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-center">
                    {saveMatrixMsg}
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 2: Per-Device RBAC Rules */}
            {rbacActiveTab === 'devices' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                  <p className="font-bold text-indigo-200">Hak Akses Kontrol Saklar Per-Perangkat (Per-Device RBAC)</p>
                  <p className="text-[11px] text-indigo-300/80 mt-0.5">
                    {currentUser.role === 'admin'
                      ? '👑 Sebagai Admin, Anda dapat mengatur peran mana saja yang diizinkan mengontrol atau mematikan saklar untuk masing-masing perangkat.'
                      : 'Menampilkan daftar perangkat dan aturan peran yang diizinkan mengontrol saklarnya.'}
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 border-b border-slate-800 text-slate-300 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Nama Perangkat</th>
                        <th className="py-3.5 px-4">Device ID</th>
                        <th className="py-3.5 px-4">Daya Realtime (W)</th>
                        <th className="py-3.5 px-4 text-center">Aturan Peran Diizinkan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {devices.map((dev) => (
                        <tr key={dev.id} className="hover:bg-slate-800/40">
                          <td className="py-3.5 px-4 font-bold text-white">{dev.name}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{dev.id}</td>
                          <td className="py-3.5 px-4 font-mono">
                            <span className={`font-bold ${dev.status ? 'text-amber-400' : 'text-slate-500'}`}>
                              {dev.status ? (dev.power || 0) : 0} W
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              {dev.status ? '⚡ Pemakaian Aktif' : '○ Standby / Mati'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {currentUser.role === 'admin' ? (
                              <select
                                value={dev.allowed_roles || 'admin,operator'}
                                onChange={(e) => handleUpdateDeviceRbac(dev.id, e.target.value)}
                                className="bg-slate-800 text-indigo-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none cursor-pointer"
                              >
                                <option value="admin">👑 Khusus Admin Only</option>
                                <option value="admin,operator">⚡ Admin & Operator (Default)</option>
                                <option value="admin,operator,viewer">🌐 Semua Role (Inc. Viewer)</option>
                              </select>
                            ) : (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold uppercase ${
                                (dev.allowed_roles || 'admin,operator').includes('viewer') ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' :
                                (dev.allowed_roles || 'admin,operator') === 'admin' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30' :
                                'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              }`}>
                                {(dev.allowed_roles || 'admin,operator') === 'admin' ? '👑 Admin Only' :
                                 (dev.allowed_roles || 'admin,operator').includes('viewer') ? '🌐 Semua Role' : '⚡ Admin & Operator'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Tab 3: User Management */}
            {rbacActiveTab === 'users' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">Daftar pengguna terdaftar dalam sistem. Peran Admin dapat mengelola dan mendaftarkan pengguna baru.</p>
                  
                  {currentUser.role === 'admin' && (
                    <button
                      id="btn-open-add-user"
                      onClick={() => { setShowAddUserModal(true); setAddUserError(''); }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      + Tambah Pengguna Baru
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 border-b border-slate-800 text-slate-300 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">ID</th>
                        <th className="py-3.5 px-4">Username</th>
                        <th className="py-3.5 px-4">Nama Lengkap</th>
                        <th className="py-3.5 px-4">Peran Saat Ini</th>
                        <th className="py-3.5 px-4 text-center">Ubah Peran</th>
                        <th className="py-3.5 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {usersList.map((u) => {
                        const isUpdating = roleUpdateLoading[u.id]
                        const isSelf = u.id === currentUser.id
                        return (
                          <tr key={u.id} className="hover:bg-slate-800/40">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-400">{u.id}</td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-200">@{u.username}</td>
                            <td className="py-3.5 px-4 font-semibold text-white">
                              {u.name} {isSelf && <span className="text-[10px] text-indigo-400 font-mono font-bold">(Anda)</span>}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                u.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                                u.role === 'operator' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {currentUser.role === 'admin' ? (
                                <select
                                  disabled={isUpdating}
                                  value={u.role}
                                  onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                                  className="bg-slate-800 text-slate-200 text-xs font-bold px-3 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                                >
                                  <option value="admin">Admin</option>
                                  <option value="operator">Operator</option>
                                  <option value="viewer">Viewer</option>
                                </select>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">Hanya Admin</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {(currentUser.role === 'admin' || isSelf) && (
                                  <button
                                    onClick={() => {
                                      setPassTargetUser(isSelf ? null : u)
                                      setOldPassword('')
                                      setNewPassword('')
                                      setConfirmPassword('')
                                      setChangePassError('')
                                      setChangePassSuccess('')
                                      setShowChangePassModal(true)
                                    }}
                                    className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                                    title={isSelf ? "Ganti Password Saya" : `Ubah Password @${u.username}`}
                                  >
                                    🔑
                                  </button>
                                )}
                                {currentUser.role === 'admin' && !isSelf && (
                                  <button
                                    onClick={() => setUserToDelete(u)}
                                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus Pengguna"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Tab 4: Integrasi Notifikasi Bot Telegram */}
            {rbacActiveTab === 'telegram' && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-indigo-200">Integrasi Peringatan Cerdas & Rekap Harian via Telegram</p>
                    <p className="text-[11px] text-indigo-300/80">
                      Sistem akan mengirimkan pesan otomatis seketika bila terjadi kelebihan beban (Anti-Jeglek), kebocoran daya semu, serta rekap konsumsi harian setiap pukul 21:00 WIB.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      telegram?.is_enabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${telegram?.is_enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                      {telegram?.is_enabled ? 'Bot Aktif' : 'Bot Nonaktif'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Form Konfigurasi */}
                  <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>⚙️</span> Konfigurasi Kredensial Bot Telegram
                    </h3>

                    {telegramMsg && (
                      <div className={`p-3.5 rounded-xl text-xs font-semibold ${
                        telegramMsg.includes('berhasil')
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                      }`}>
                        {telegramMsg}
                      </div>
                    )}

                    <form onSubmit={handleSaveTelegram} className="space-y-4">
                      {/* Toggle Aktifkan */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                        <div>
                          <p className="text-xs font-bold text-white">Status Notifikasi Telegram</p>
                          <p className="text-[11px] text-slate-400">Aktifkan untuk mulai mengirim pesan peringatan darurat ke Telegram</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={currentUser?.role !== 'admin'}
                            checked={tgEnabledInput}
                            onChange={(e) => setTgEnabledInput(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      {/* Token Bot Input */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Telegram Bot Token (HTTP API)
                        </label>
                        <input
                          type="password"
                          disabled={currentUser?.role !== 'admin'}
                          placeholder={telegram?.has_token ? `Tersimpan: ${telegram.masked_bot_token} (Ketik untuk ganti)` : 'Contoh: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ'}
                          value={tgTokenInput}
                          onChange={(e) => setTgTokenInput(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Token rahasia yang didapatkan saat membuat bot melalui @BotFather di aplikasi Telegram.
                        </p>
                      </div>

                      {/* Chat ID Input */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Target Chat ID / Group ID Penerima
                        </label>
                        <input
                          type="text"
                          disabled={currentUser?.role !== 'admin'}
                          placeholder="Contoh: 123456789 atau -100123456789"
                          value={tgChatIdInput}
                          onChange={(e) => setTgChatIdInput(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          ID akun personal Anda atau ID Grup keluarga penerima peringatan.
                        </p>
                      </div>

                      {/* Notification Triggers Checklist */}
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                        <p className="text-xs font-bold text-slate-200 uppercase tracking-wide">Pemicu Notifikasi Aktif:</p>
                        
                        <div className="flex items-center gap-2.5 text-xs text-slate-300">
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span><strong>Peringatan Proteksi Anti-Jeglek:</strong> Dikirim otomatis saat beban melebihi ambang batas keamanan PLN dan beban sekunder diputus.</span>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs text-slate-300">
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span><strong>Deteksi Pemborosan / Phantom Load:</strong> Peringatan instan bila konsumsi daya kumulatif malam hari tidak wajar.</span>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs text-slate-300">
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span><strong>Laporan Rekap Harian (21:00 WIB):</strong> Ringkasan total kWh terpakai hari ini, estimasi biaya harian, dan proyeksi bulanan.</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                        <button
                          type="button"
                          disabled={testingTelegram || currentUser?.role !== 'admin' || !telegram?.has_token}
                          onClick={handleTestTelegram}
                          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {testingTelegram ? (
                            <>
                              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                              </svg>
                              Mengirim Pesan Uji...
                            </>
                          ) : (
                            <>
                              <span>📲</span>
                              Kirim Pesan Uji Coba
                            </>
                          )}
                        </button>

                        <button
                          type="submit"
                          disabled={savingTelegram || currentUser?.role !== 'admin'}
                          className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {savingTelegram ? 'Menyimpan...' : 'Simpan Konfigurasi Bot'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Right Column: Panduan Pengaturan Singkat */}
                  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>📖</span> Panduan Cara Menghubungkan
                    </h3>

                    <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                        <p className="font-bold text-indigo-300">Langkah 1: Buat Bot di Telegram</p>
                        <p className="text-slate-400">
                          Buka aplikasi Telegram, cari akun resmi <strong>@BotFather</strong>, kirim perintah <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-200">/newbot</code>, lalu ikuti instruksi hingga Anda mendapatkan <em>HTTP API Token</em>.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                        <p className="font-bold text-indigo-300">Langkah 2: Dapatkan Chat ID Anda</p>
                        <p className="text-slate-400">
                          Cari bot pembaca ID seperti <strong>@userinfobot</strong> di Telegram lalu klik Start. Bot akan langsung menampilkan angka unik Chat ID akun Anda.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                        <p className="font-bold text-indigo-300">Langkah 3: Start Bot Anda</p>
                        <p className="text-slate-400">
                          PENTING: Buka bot yang baru saja Anda buat di Telegram, lalu klik <strong>/start</strong> agar bot memiliki izin mengirimkan pesan ke akun Anda.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                        <p className="font-bold text-indigo-300">Langkah 4: Simpan & Uji Coba</p>
                        <p className="text-slate-400">
                          Tempel Token dan Chat ID pada formulir di sebelah kiri, klik Simpan, lalu tekan <em>Kirim Pesan Uji Coba</em> untuk memastikan notifikasi masuk ke ponsel Anda!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: PINDAI PERANGKAT TUYA (SMART SCANNER ALA SMART LIFE / TUYA SMART APP) */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center text-2xl shadow-lg shadow-cyan-500/10">
                  📡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">Pindai Perangkat Tuya Smart</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono font-semibold">
                      Auto Discovery
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Deteksi otomatis semua smart plug, saklar, dan lampu yang tertaut di akun Smart Life / Tuya Smart Anda.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScanModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-6 space-y-6">
              {isScanning ? (
                /* RADAR SCANNING ANIMATION STATE */
                <div className="py-12 text-center space-y-6">
                  <div className="relative w-52 h-52 mx-auto flex items-center justify-center">
                    {/* Concentric Pulsing Radar Rings */}
                    <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping opacity-60"></div>
                    <div className="absolute inset-4 rounded-full border border-indigo-500/30 animate-pulse"></div>
                    <div className="absolute inset-8 rounded-full border border-cyan-500/30"></div>
                    <div className="absolute inset-14 rounded-full border border-dashed border-indigo-400/50 animate-spin" style={{ animationDuration: '10s' }}></div>
                    {/* Rotating Radar Sweep */}
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                      <div
                        className="w-1/2 h-1/2 origin-bottom-right bg-gradient-to-br from-cyan-400/35 via-cyan-400/10 to-transparent animate-spin"
                        style={{ animationDuration: '2.4s' }}
                      ></div>
                    </div>
                    {/* Center Beacon */}
                    <div className="relative z-10 w-20 h-20 rounded-full bg-slate-950 border-2 border-cyan-400 flex flex-col items-center justify-center shadow-xl shadow-cyan-500/30">
                      <span className="text-2xl animate-bounce">⚡</span>
                      <span className="text-[9px] font-mono font-bold text-cyan-300">TUYA</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-base font-bold text-slate-100 flex items-center justify-center gap-2">
                      <span>Mencari Perangkat di Sekitar & Tuya Cloud</span>
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Menghubungi gateway Tuya OpenAPI untuk memeriksa stop kontak, saklar, dan lampu pintar yang terpasang...
                    </p>
                  </div>
                </div>
              ) : scanResult ? (
                /* SCAN RESULTS STATE */
                <div className="space-y-6">
                  {/* Discovery Summary Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 uppercase font-semibold block">Total Ditemukan</span>
                        <span className="text-xl font-extrabold text-white font-mono">{scanResult.total_discovered} Perangkat</span>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                        📱
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-emerald-400 uppercase font-semibold block">Perangkat Baru</span>
                        <span className="text-xl font-extrabold text-emerald-300 font-mono">
                          {scanResult.new_devices_count} Siap Ditambah
                        </span>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-sm">
                        ✨
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-cyan-400 uppercase font-semibold block">Sudah Terdaftar</span>
                        <span className="text-xl font-extrabold text-cyan-300 font-mono">
                          {scanResult.registered_count} Aktif di Sistem
                        </span>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-sm">
                        ✓
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span>Waktu Pindai: {scanResult.scanned_at}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleStartTuyaScan}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Pindai Ulang
                      </button>

                      {scanResult.new_devices_count > 0 && currentUser?.role === 'admin' && (
                        <button
                          onClick={handleImportAllNewDevices}
                          disabled={isImportingAll}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isImportingAll ? (
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                            </svg>
                          ) : (
                            <span>✨</span>
                          )}
                          Tambahkan Semua ({scanResult.new_devices_count} Baru)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List of Discovered Devices */}
                  {scanResult.devices.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <p className="text-sm font-semibold text-slate-300">Tidak ada perangkat ditemukan di akun Tuya</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Pastikan perangkat Anda sudah berhasil dipasangkan (paired) pada aplikasi Smart Life / Tuya Smart di smartphone Anda.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Sub-header jika ada perangkat baru */}
                      {scanResult.new_devices_count > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                            Perangkat Baru Ditemukan (Siap Ditambahkan)
                          </h4>
                          <div className="space-y-3">
                            {scanResult.devices.filter(d => !d.already_registered).map(dev => (
                              <div
                                key={`new-dev-${dev.id}`}
                                className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-slate-950 border border-emerald-500/40 shadow-lg shadow-emerald-500/5 flex flex-wrap items-center justify-between gap-4 transition-all hover:border-emerald-400/60"
                              >
                                <div className="flex items-center gap-3.5">
                                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl shadow-md">
                                    {dev.category_icon || '⚡'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="text-sm font-bold text-white">{dev.name}</h5>
                                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold">
                                        Perangkat Baru
                                      </span>
                                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${dev.online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                        {dev.online ? 'Online' : 'Offline'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      {dev.product_name} {dev.model && `(${dev.model})`} • <span className="font-mono text-[11px] text-slate-500">ID: {dev.id}</span>
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-slate-400">
                                      <span>Kategori: {dev.category_label}</span>
                                      {dev.power_watt > 0 && (
                                        <span className="text-amber-400 font-bold">Daya: {dev.power_watt} W</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleImportDevice(dev)}
                                  disabled={importingId === dev.id || currentUser?.role !== 'admin'}
                                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  {importingId === dev.id ? (
                                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                  )}
                                  + Tambahkan ke BARA-Sense
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sub-header perangkat yang sudah terdaftar */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                          Perangkat yang Sudah Terdaftar di Sistem ({scanResult.registered_count})
                        </h4>
                        <div className="space-y-3">
                          {scanResult.devices.filter(d => d.already_registered).map(dev => (
                            <div
                              key={`reg-dev-${dev.id}`}
                              className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex flex-wrap items-center justify-between gap-4 transition-all hover:border-slate-700"
                            >
                              <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl">
                                  {dev.category_icon || '⚡'}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="text-sm font-bold text-white">
                                      {dev.registered_name || dev.name}
                                    </h5>
                                    {dev.registered_name && dev.registered_name !== dev.name && (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        (Tuya: {dev.name})
                                      </span>
                                    )}
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-semibold flex items-center gap-1">
                                      <span>✓</span> Terdaftar
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${dev.online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                      {dev.online ? 'Online' : 'Offline'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {dev.category_label} • <span className="font-mono text-[11px] text-slate-500">ID: {dev.id}</span>
                                  </p>
                                  <div className="flex items-center gap-3 mt-1 text-[11px] font-mono">
                                    <span className={dev.status ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                                      Status Saklar: {dev.status ? 'MENYALA (ON)' : 'MATI (OFF)'}
                                    </span>
                                    {dev.status && (
                                      <span className="text-amber-400 font-bold">Daya Live: {dev.power_watt} W</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right flex items-center gap-2">
                                <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 font-mono text-[11px]">
                                  Tersinkronisasi
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* INITIAL INVITE SCREEN IF MODAL OPENED BEFORE SCANNING */
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-3xl shadow-xl shadow-cyan-500/20">
                    🔍
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Mulai Pemindaian Perangkat</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                      Sistem akan memindai akun Tuya Cloud Anda secara langsung dan menemukan seluruh perangkat cerdas yang siap dihubungkan.
                    </p>
                  </div>
                  <button
                    onClick={handleStartTuyaScan}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-600/25 transition-all cursor-pointer"
                  >
                    Mulai Pindai Sekarang
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowScanModal(false)
                  setShowAddModal(true)
                }}
                className="text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>➕ Ingin memasukkan ID perangkat secara manual?</span>
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowScanModal(false)
                    setShowWebBleModal(true)
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs shadow-md shadow-cyan-500/20"
                >
                  <span>🔵 Pairing Web Bluetooth (Direct)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowScanModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAIRING DIRECT WEB BLUETOOTH (TANPA SMART LIFE APP) */}
      {showWebBleModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col space-y-6 relative">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center text-2xl shadow-inner">
                  🔵
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">Pairing Direct Web Bluetooth</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono font-semibold">
                      Tanpa Smart Life App
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hubungkan perangkat Tuya ke WiFi & BARA-Sense langsung dari browser via Bluetooth LE.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWebBleModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4">
              {/* Form Input WiFi */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📶</span> Masukkan Kredensial WiFi Rumah / Kantor (2.4GHz)
                </h4>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nama WiFi (SSID)</label>
                  <input
                    type="text"
                    value={bleSsid}
                    onChange={(e) => setBleSsid(e.target.value)}
                    placeholder="Contoh: WiFi-Rumah-2.4G"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Password WiFi</label>
                  <input
                    type="password"
                    value={blePassword}
                    onChange={(e) => setBlePassword(e.target.value)}
                    placeholder="Masukkan Password WiFi..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Progress & Step Status */}
              {bleLoading && (
                <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin"></div>
                      <span className="text-xs font-bold text-cyan-300">Langkah {bleStep} / 4: Process Direct Provisioning</span>
                    </div>
                    {bleDeviceName && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                        {bleDeviceName}
                      </span>
                    )}
                  </div>
                  {pairingToken && (
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <span>Token Tuya:</span>
                      <span className="text-cyan-300 font-bold">{pairingToken}</span>
                    </div>
                  )}
                  <p className="text-xs text-slate-300 font-mono bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    {bleStatus}
                  </p>
                </div>
              )}

              {/* Guidelines Note */}
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300 flex items-center gap-1">
                  <span>💡</span> Petunjuk Mode Pairing Perangkat:
                </p>
                <p>1. Pastikan perangkat Tuya (Plug/Saklar) sudah dicolokkan ke listrik.</p>
                <p>2. Tekan dan tahan tombol fisik perangkat selama 5 detik hingga LED berkedip cepat.</p>
                <p>3. Tekan tombol di bawah untuk menyambungkan Bluetooth dan mengirim kredensial WiFi.</p>
              </div>

              {/* Action Button */}
              <button
                onClick={handleStartWebBlePairing}
                disabled={bleLoading || !bleSsid.trim()}
                className="w-full py-3.5 rounded-2xl font-bold text-xs bg-gradient-to-r from-cyan-500 via-indigo-600 to-cyan-500 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {bleLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Memproses Pairing Web Bluetooth...</span>
                  </>
                ) : (
                  <>
                    <span>📡</span>
                    <span>1. Pindai Bluetooth & Suntikkan WiFi (Pair Now)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: TAMBAH PERANGKAT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Daftarkan Perangkat Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ID Perangkat</label>
                <div className="flex gap-2">
                  <input
                    id="input-device-id"
                    type="text"
                    required
                    placeholder="Contoh: eb8a1b2c3d4e5f6g"
                    value={newId}
                    onChange={e => setNewId(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    disabled={fetchingCloud || !newId.trim()}
                    onClick={handleFetchTuyaCloudInfo}
                    className="px-3 py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {fetchingCloud ? (
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                    Cek Data Otomatis
                  </button>
                </div>
                {cloudMsg && (
                  <p className="text-[11px] text-cyan-400 mt-1 font-medium">{cloudMsg}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Perangkat</label>
                <input
                  id="input-device-name"
                  type="text"
                  required
                  placeholder="Contoh: AC Kamar Utama"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Kapasitas Daya Beban (Watt)</label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Kapasitas nominal alat. Pemakaian listrik aktual akan diukur dan ditampilkan otomatis secara realtime saat saklar aktif.
                </p>
                <input
                  id="input-device-power"
                  type="number"
                  required
                  min="1"
                  max="10000"
                  placeholder="Contoh: 750"
                  value={newPower}
                  onChange={e => setNewPower(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                
                <div className="flex gap-2 mt-2">
                  <span className="text-[11px] text-slate-400 self-center">Preset:</span>
                  {[
                    { label: 'Lampu (15W)', val: 15 },
                    { label: 'TV (100W)', val: 100 },
                    { label: 'Pompa (250W)', val: 250 },
                    { label: 'AC (750W)', val: 750 }
                  ].map(p => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setNewPower(p.val)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-indigo-300"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  id="submit-add-device"
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                >
                  {addLoading ? 'Menyimpan...' : 'Simpan Perangkat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: KONFIRMASI HAPUS PERANGKAT */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Hapus Perangkat</h3>
            <p className="text-sm text-slate-300">
              Apakah Anda yakin ingin menghapus <strong className="text-white">{deleteTarget.name}</strong> (ID: {deleteTarget.id})?
            </p>
            <p className="text-xs text-amber-300 mt-2 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
              Perangkat akan dihapus dari daftar kontrol saklar. Seluruh riwayat penggunaan listrik dan biaya di masa lalu tetap tersimpan aman di sistem.
            </p>

            <div className="flex justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                id="confirm-delete-device"
                onClick={handleDeleteDevice}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 flex items-center gap-1.5"
              >
                {deleteLoading ? 'Menghapus...' : 'Ya, Hapus Perangkat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PENGATURAN RBAC (ROLE-BASED ACCESS CONTROL) */}
      {showRbacModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Pengaturan RBAC (Role-Based Access Control)</h3>
                  <p className="text-xs text-slate-400">Konfigurasi Perizinan Peran & Manajemen Hak Akses Pengguna</p>
                </div>
              </div>
              <button onClick={() => setShowRbacModal(false)} className="text-slate-400 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Navigation Sub-Tabs */}
            <div className="flex border-b border-slate-800 my-4 overflow-x-auto">
              <button
                onClick={() => setRbacActiveTab('matrix')}
                className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  rbacActiveTab === 'matrix'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Matriks Hak Akses Peran Global
              </button>
              <button
                onClick={() => setRbacActiveTab('devices')}
                className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  rbacActiveTab === 'devices'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Hak Akses Per-Perangkat ({devices.length})
              </button>
              <button
                onClick={() => setRbacActiveTab('users')}
                className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  rbacActiveTab === 'users'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Kelola Pengguna ({usersList.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {rbacActiveTab === 'matrix' ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-indigo-200">Matriks Hak Akses Peran RBAC (Configurable)</p>
                      <p className="text-[11px] text-indigo-300/80">
                        {currentUser.role === 'admin'
                          ? '👑 Sebagai Admin, Anda dapat mencentang/mengubah izin setiap fitur secara langsung di bawah ini dan mengklik "Simpan Perubahan".'
                          : 'Sistem RBAC menggunakan 3 tingkatan peran (Admin, Operator, Viewer) untuk membatasi aksi sensitif.'}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-300 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Fitur / Tindakan</th>
                          <th className="py-3 px-4 text-center">👑 Admin</th>
                          <th className="py-3 px-4 text-center">⚡ Operator</th>
                          <th className="py-3 px-4 text-center">👁️ Viewer (Tamu)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {permissionMatrix.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-900/40">
                            <td className="py-3.5 px-4 font-medium">
                              <span className="text-white block font-bold">{row.feature}</span>
                              <span className="text-[11px] text-slate-400">{row.desc}</span>
                            </td>
                            {/* Admin Cell */}
                            <td className="py-3.5 px-4 text-center">
                              {currentUser.role === 'admin' ? (
                                <button
                                  type="button"
                                  onClick={() => togglePermissionCell(row.id, 'admin')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                    row.admin
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                                  }`}
                                >
                                  {row.admin ? '✓ Diizinkan' : '✕ Ditolak'}
                                </button>
                              ) : (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                  row.admin ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-slate-600'
                                }`}>
                                  {row.admin ? '✓ Diizinkan' : '✕'}
                                </span>
                              )}
                            </td>
                            {/* Operator Cell */}
                            <td className="py-3.5 px-4 text-center">
                              {currentUser.role === 'admin' ? (
                                <button
                                  type="button"
                                  onClick={() => togglePermissionCell(row.id, 'operator')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                    row.operator
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                                  }`}
                                >
                                  {row.operator ? '✓ Diizinkan' : '✕ Ditolak'}
                                </button>
                              ) : (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                  row.operator ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  {row.operator ? '✓ Diizinkan' : '✕ Ditolak'}
                                </span>
                              )}
                            </td>
                            {/* Viewer Cell */}
                            <td className="py-3.5 px-4 text-center">
                              {currentUser.role === 'admin' ? (
                                <button
                                  type="button"
                                  onClick={() => togglePermissionCell(row.id, 'viewer')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                    row.viewer
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                                  }`}
                                >
                                  {row.viewer ? '✓ Diizinkan' : '✕ Ditolak'}
                                </button>
                              ) : (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                  row.viewer ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  {row.viewer ? '✓ Diizinkan' : '✕ Ditolak'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {currentUser.role === 'admin' && (
                    <div className="flex flex-wrap items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 gap-3">
                      <span className="text-xs text-slate-300 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Klik tombol ✓ / ✕ pada tabel di atas untuk mengubah hak akses, lalu simpan perubahan.
                      </span>
                      <button
                        id="save-permissions-btn"
                        onClick={handleSavePermissions}
                        disabled={saveMatrixLoading}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {saveMatrixLoading ? 'Menyimpan...' : '💾 Simpan Perubahan Matriks RBAC'}
                      </button>
                    </div>
                  )}

                  {saveMatrixMsg && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-center">
                      {saveMatrixMsg}
                    </div>
                  )}
                </div>
              ) : rbacActiveTab === 'devices' ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                    <p className="font-bold text-indigo-200">Hak Akses Kontrol Saklar Per-Perangkat (Per-Device RBAC)</p>
                    <p className="text-[11px] text-indigo-300/80 mt-0.5">
                      {currentUser.role === 'admin'
                        ? '👑 Sebagai Admin, Anda dapat mengatur peran mana saja yang diizinkan mengontrol atau mematikan saklar untuk masing-masing perangkat.'
                        : 'Menampilkan daftar perangkat dan aturan peran yang diizinkan mengontrol saklarnya.'}
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-300 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Nama Perangkat</th>
                          <th className="py-3 px-4">Device ID</th>
                          <th className="py-3 px-4">Daya Realtime (W)</th>
                          <th className="py-3 px-4 text-center">Aturan Peran Diizinkan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {devices.map((dev) => (
                          <tr key={dev.id} className="hover:bg-slate-900/40">
                            <td className="py-3.5 px-4 font-bold text-white">{dev.name}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{dev.id}</td>
                            <td className="py-3.5 px-4 font-mono">
                              <span className={`font-bold ${dev.status ? 'text-amber-400' : 'text-slate-500'}`}>
                                {dev.status ? (dev.power || 0) : 0} W
                              </span>
                              <span className="block text-[10px] text-slate-500">
                                {dev.status ? '⚡ Aktif' : '○ Mati'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {currentUser.role === 'admin' ? (
                                <select
                                  value={dev.allowed_roles || 'admin,operator'}
                                  onChange={(e) => handleUpdateDeviceRbac(dev.id, e.target.value)}
                                  className="bg-slate-800 text-indigo-300 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none cursor-pointer"
                                >
                                  <option value="admin">👑 Khusus Admin Only</option>
                                  <option value="admin,operator">⚡ Admin & Operator (Default)</option>
                                  <option value="admin,operator,viewer">🌐 Semua Role (Inc. Viewer)</option>
                                </select>
                              ) : (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold uppercase ${
                                  (dev.allowed_roles || 'admin,operator').includes('viewer') ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' :
                                  (dev.allowed_roles || 'admin,operator') === 'admin' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30' :
                                  'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {(dev.allowed_roles || 'admin,operator') === 'admin' ? '👑 Admin Only' :
                                   (dev.allowed_roles || 'admin,operator').includes('viewer') ? '🌐 Semua Role' : '⚡ Admin & Operator'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">Daftar pengguna terdaftar di SQLite DB. Peran Admin dapat mengelola dan mendaftarkan pengguna baru.</p>
                    
                    {currentUser.role === 'admin' && (
                      <button
                        id="btn-open-add-user"
                        onClick={() => { setShowAddUserModal(true); setAddUserError(''); }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        + Tambah Pengguna Baru
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-300 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">ID</th>
                          <th className="py-3 px-4">Username</th>
                          <th className="py-3 px-4">Nama Lengkap</th>
                          <th className="py-3 px-4">Peran Saat Ini</th>
                          <th className="py-3 px-4 text-center">Ubah Peran</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {usersList.map((u) => {
                          const isUpdating = roleUpdateLoading[u.id]
                          const isSelf = u.id === currentUser.id
                          return (
                            <tr key={u.id} className="hover:bg-slate-900/40">
                              <td className="py-3 px-4 font-mono font-bold text-slate-400">{u.id}</td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-200">@{u.username}</td>
                              <td className="py-3 px-4 font-semibold text-white">
                                {u.name} {isSelf && <span className="text-[10px] text-indigo-400 font-mono font-bold">(Anda)</span>}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  u.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                                  u.role === 'operator' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                  'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {currentUser.role === 'admin' ? (
                                  <select
                                    disabled={isUpdating}
                                    value={u.role}
                                    onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                                    className="bg-slate-800 text-slate-200 text-xs font-bold px-2 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                                  >
                                    <option value="admin">Admin</option>
                                    <option value="operator">Operator</option>
                                    <option value="viewer">Viewer</option>
                                  </select>
                                ) : (
                                  <span className="text-[11px] text-slate-500 italic">Hanya Admin</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {(currentUser.role === 'admin' || isSelf) && (
                                    <button
                                      onClick={() => {
                                        setPassTargetUser(isSelf ? null : u)
                                        setOldPassword('')
                                        setNewPassword('')
                                        setConfirmPassword('')
                                        setChangePassError('')
                                        setChangePassSuccess('')
                                        setShowChangePassModal(true)
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                                      title={isSelf ? "Ganti Password Saya" : `Ubah Password @${u.username}`}
                                    >
                                      🔑
                                    </button>
                                  )}
                                  {currentUser.role === 'admin' && !isSelf && (
                                    <button
                                      onClick={() => setUserToDelete(u)}
                                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                      title="Hapus Pengguna"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowRbacModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
              >
                Tutup Pengaturan RBAC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: TAMBAH PENGGUNA BARU */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Tambah Pengguna Baru</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {addUserError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {addUserError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                <input
                  id="input-user-username"
                  type="text"
                  required
                  placeholder="Contoh: sarah"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap</label>
                <input
                  id="input-user-name"
                  type="text"
                  required
                  placeholder="Contoh: Sarah Wijaya"
                  value={newNameUser}
                  onChange={(e) => setNewNameUser(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  id="input-user-password"
                  type="password"
                  required
                  placeholder="Masukkan password baru"
                  value={newPasswordUser}
                  onChange={(e) => setNewPasswordUser(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Peran Pengguna (Role)</label>
                <select
                  id="input-user-role"
                  value={newRoleUser}
                  onChange={(e) => setNewRoleUser(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="operator">⚡ Operator (Dapat Kontrol Saklar)</option>
                  <option value="viewer">👁️ Viewer / Tamu (Mode Baca Sahaja)</option>
                  <option value="admin">👑 Admin (Akses Penuh Pengelolaan)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  id="submit-add-user"
                  type="submit"
                  disabled={addUserLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                >
                  {addUserLoading ? 'Menyimpan...' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: KONFIRMASI HAPUS PENGGUNA */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Hapus Pengguna</h3>
            <p className="text-sm text-slate-300">
              Apakah Anda yakin ingin menghapus pengguna <strong className="text-white">@{userToDelete.username}</strong> ({userToDelete.name})?
            </p>

            <div className="flex justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                id="confirm-delete-user"
                onClick={handleDeleteUser}
                disabled={deleteUserLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
              >
                {deleteUserLoading ? 'Menghapus...' : 'Ya, Hapus Pengguna'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DIALOG ALERT AKSES DITOLAK (RBAC ALERT MODAL) */}
      {rbacAlert && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Akses Ditolak (RBAC Restriction)</h3>
            <p className="text-xs text-rose-300 leading-relaxed bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 mt-2">
              {rbacAlert}
            </p>
            <p className="text-[11px] text-slate-400 mt-3">
              Peran Anda saat ini: <strong className="text-indigo-400 font-mono uppercase">{currentUser.role}</strong> ({currentUser.name}).
            </p>

            <div className="flex justify-end gap-3 pt-5">
              <button
                onClick={() => setRbacAlert(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              >
                Paham & Mengerti
              </button>
              <button
                onClick={() => { setRbacAlert(null); setShowLoginModal(true); }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25"
              >
                🔑 Login Admin / Operator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: AUTENTIKASI / LOGIN OVERLAY */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative space-y-6 animate-fade-in">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Logo & Header */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-xl shadow-indigo-500/25">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Masuk / Ganti Akun User
              </h2>
              <p className="text-xs text-slate-400">Gunakan kredensial terdaftar Anda untuk masuk</p>
            </div>

            {/* Form Autentikasi */}
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
              {loginError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username</label>
                <div className="relative">
                  <input
                    id="input-login-username-modal"
                    type="text"
                    required
                    placeholder="Masukkan username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    id="input-login-password-modal"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Masukkan password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={showPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a9.956 9.956 0 013.68-.823c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-6.115-3.486a3 3 0 11-4.243-4.243" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z"} />
                    </svg>
                  </button>
                </div>
              </div>

              <button
                id="submit-login-btn-modal"
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loginLoading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                )}
                {loginLoading ? 'Memproses Login...' : 'Masuk ke Dashboard'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: UBAH / GANTI PASSWORD */}
      {showChangePassModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
                  🔑
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {passTargetUser ? `Reset Password @${passTargetUser.username}` : 'Ubah Password Saya'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {passTargetUser ? `Perbarui password untuk akun ${passTargetUser.name}` : `Ubah kata sandi akun @${currentUser.username}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowChangePassModal(false); setPassTargetUser(null); }}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              {changePassError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{changePassError}</span>
                </div>
              )}

              {changePassSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{changePassSuccess}</span>
                </div>
              )}

              {/* Password lama hanya jika user mengubah passwordnya sendiri */}
              {!passTargetUser && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password Saat Ini (Lama)</label>
                  <input
                    id="input-old-password"
                    type="password"
                    required
                    placeholder="Masukkan password lama"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password Baru</label>
                <input
                  id="input-new-password"
                  type="password"
                  required
                  placeholder="Masukkan password baru"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Konfirmasi Password Baru</label>
                <input
                  id="input-confirm-password"
                  type="password"
                  required
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowChangePassModal(false); setPassTargetUser(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  id="submit-change-password-btn"
                  type="submit"
                  disabled={changePassLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {changePassLoading ? 'Menyimpan...' : 'Simpan Password Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SET TIMER HITUNG MUNDUR (COUNTDOWN AUTO-OFF) */}
      {timerModalDeviceId && (() => {
        const targetDev = devices.find(d => d.id === timerModalDeviceId)
        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-bold">⏱️</span>
                  <div>
                    <h3 className="text-base font-bold text-white">Pasang Timer Otomatis</h3>
                    <p className="text-xs text-slate-400">{targetDev?.name || timerModalDeviceId}</p>
                  </div>
                </div>
                <button onClick={() => setTimerModalDeviceId(null)} className="text-slate-400 hover:text-white p-1">
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Aksi Saat Waktu Habis</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTimerAction('OFF')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      timerAction === 'OFF'
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-sm'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    ⭕ Matikan Saklar (OFF)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimerAction('ON')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      timerAction === 'ON'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    ⚡ Nyalakan Saklar (ON)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pilihan Durasi Waktu</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[15, 30, 45, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setTimerDuration(mins)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        timerDuration === mins
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {mins < 60 ? `${mins} Menit` : `${mins / 60} Jam`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-slate-400">Atau durasi khusus:</span>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-400">menit</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 space-y-1">
                <p className="flex justify-between">
                  <span className="text-slate-400">Perangkat:</span>
                  <strong className="text-white">{targetDev?.name}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Perintah:</span>
                  <strong className={timerAction === 'OFF' ? 'text-rose-400' : 'text-emerald-400'}>
                    {timerAction === 'OFF' ? 'Matikan Otomatis' : 'Nyalakan Otomatis'}
                  </strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Durasi:</span>
                  <strong className="text-cyan-400 font-mono">{timerDuration} Menit</strong>
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTimerModalDeviceId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={timerLoading}
                  onClick={() => handleSetTimer(timerModalDeviceId, timerDuration, timerAction)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {timerLoading ? 'Menyimpan...' : '⏱️ Pasang Timer Sekarang'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* MODAL: TAMBAH JADWAL SAKLAR OTOMATIS (SMART SCHEDULE) */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-sm font-bold">📅</span>
                <div>
                  <h3 className="text-base font-bold text-white">Tambah Jadwal Saklar Otomatis</h3>
                  <p className="text-xs text-slate-400">Atur waktu saklar ON/OFF berulang secara terjadwal</p>
                </div>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            {schedMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {schedMsg}
              </div>
            )}

            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pilih Perangkat</label>
                <select
                  value={schedDeviceId}
                  onChange={(e) => setSchedDeviceId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  required
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.status ? `${d.power || 0}W - Aktif` : '0W - Mati'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Perintah Saklar</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSchedAction('ON')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      schedAction === 'ON'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    ⚡ Nyalakan (ON)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchedAction('OFF')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      schedAction === 'OFF'
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-sm'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    ⭕ Matikan (OFF)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Waktu Jam (WIB)</label>
                  <input
                    type="time"
                    required
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Hari Pengulangan</label>
                  <select
                    value={schedDays}
                    onChange={(e) => setSchedDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">Setiap Hari</option>
                    <option value="WEEKDAY">Senin - Jumat (Hari Kerja)</option>
                    <option value="WEEKEND">Sabtu - Minggu (Akhir Pekan)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={schedLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {schedLoading ? 'Menyimpan...' : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* System Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/60 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg text-slate-300 shadow-inner">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-100">Backend System Logs</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchSystemLogs}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Refresh Logs"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-y-auto bg-black/50">
              <pre className="text-[11px] sm:text-xs font-mono text-slate-300 whitespace-pre-wrap break-all">
                {systemLogs.length > 0 ? systemLogs.join('\n') : 'Tidak ada log yang tersedia.'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL TOAST NOTIFICATION CONTAINER */}
      <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-300 transform translate-y-0 ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/50 text-emerald-200 shadow-emerald-950/50'
                : toast.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/50 text-rose-200 shadow-rose-950/50'
                : toast.type === 'warning'
                ? 'bg-slate-900/95 border-amber-500/50 text-amber-200 shadow-amber-950/50'
                : 'bg-slate-900/95 border-indigo-500/50 text-indigo-200 shadow-indigo-950/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                toast.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : toast.type === 'error'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : toast.type === 'warning'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              }`}>
                {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : toast.type === 'warning' ? '⚠️' : 'ℹ️'}
              </div>
              <div className="space-y-0.5">
                {toast.title && (
                  <h4 className="text-xs font-bold text-white tracking-wide">
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {toast.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer flex-shrink-0"
              title="Tutup Notifikasi"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

