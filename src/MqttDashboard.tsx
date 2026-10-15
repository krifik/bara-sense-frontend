import React, { useState, useEffect } from 'react'

export interface WaterTelemetry {
  valid: boolean
  state: 'LOW' | 'NORMAL' | 'FULL' | 'OVERFLOW' | string
  water_depth_cm: number
  percentage: number
  raw_distance_cm: number
  pump_action: 'START' | 'STOP' | 'IDLE' | string
  rssi: number
  ip: string
  uptime_ms: number
  timestamp?: string
}

export interface MqttConnectedClient {
  id: string
  remote_ip: string
  connected_at: string
  is_inline: boolean
  username?: string
}

export interface MqttLogEntry {
  id: number
  topic: string
  payload: string
  client_id: string
  timestamp: string
  direction: 'in' | 'out'
}

export interface MqttStatusData {
  running: boolean
  listen_addr: string
  port: number
  active_clients: number
  clients?: MqttConnectedClient[]
  latest_state: string
  latest_water: WaterTelemetry | null
  recent_logs: MqttLogEntry[]
  last_activity_at: string
}

export interface WaterAutomationConfig {
  id: number
  is_enabled: boolean
  device_id: string
  device_name?: string
  device_status: boolean
  mode: 'percentage' | 'depth'
  turn_on_pct: number
  turn_off_pct: number
  turn_on_depth_cm: number
  turn_off_depth_cm: number
  tank_total_depth_cm?: number
  tank_sensor_offset_min_cm?: number
  tank_threshold_low_pct?: number
  tank_threshold_high_pct?: number
  safety_timeout_min: number
  cooldown_sec: number
  last_action: string
  last_triggered_at?: string
}

export interface DeviceOption {
  id: string
  name: string
  status: boolean
  power?: number
}

interface MqttDashboardProps {
  status: MqttStatusData | null
  telemetry: WaterTelemetry | null
  recentPackets: MqttLogEntry[]
  wsConnected: boolean
  apiBase: string
  authToken: string
  userRole: string
  devices?: DeviceOption[]
  onToggleDevice?: (deviceId: string) => Promise<void> | void
  onToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info', title?: string) => void
}

export const MqttDashboard: React.FC<MqttDashboardProps> = ({
  status,
  telemetry,
  recentPackets,
  wsConnected,
  apiBase,
  authToken,
  userRole,
  devices = [],
  onToggleDevice,
  onToast
}) => {
  const [pubTopic, setPubTopic] = useState('home/water/pump/control')
  const [pubPayload, setPubPayload] = useState('{"command":"START"}')
  const [pubRetain, setPubRetain] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [filterTopic, setFilterTopic] = useState('')
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null)

  // Gabungkan logs dari status API dan realtime stream logs
  const displayLogs: MqttLogEntry[] = React.useMemo(() => {
    const list = [...recentPackets]
    if (status?.recent_logs) {
      status.recent_logs.forEach(item => {
        if (!list.some(x => x.id === item.id)) {
          list.push(item)
        }
      })
    }
    list.sort((a, b) => b.id - a.id)
    if (!filterTopic.trim()) return list.slice(0, 40)
    return list.filter(l => l.topic.toLowerCase().includes(filterTopic.toLowerCase())).slice(0, 40)
  }, [recentPackets, status?.recent_logs, filterTopic])

  // Current water level stats
  const water = telemetry || status?.latest_water
  const waterPercent = Math.min(100, Math.max(0, water?.percentage ?? 0))
  const waterState = water?.state || status?.latest_state || 'OFFLINE'
  const pumpAction = water?.pump_action || 'IDLE'

  // Format uptime ms to human readable
  const formatUptime = (ms: number) => {
    if (!ms || ms <= 0) return '-'
    const totalSec = Math.floor(ms / 1000)
    const hours = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60
    if (hours > 0) return `${hours}j ${mins}m`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  // Handle Publish form
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pubTopic.trim()) {
      onToast('Topic MQTT tidak boleh kosong', 'warning', 'Validasi')
      return
    }

    setPublishing(true)
    try {
      const res = await fetch(`${apiBase}/api/mqtt/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-User-Role': userRole || 'viewer'
        },
        body: JSON.stringify({
          topic: pubTopic.trim(),
          payload: pubPayload,
          retain: pubRetain
        })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim pesan MQTT')
      }
      onToast(`Pesan berhasil dipublish ke ${pubTopic}`, 'success', 'MQTT Publish')
    } catch (err: any) {
      onToast(err.message, 'error', 'Publish Gagal')
    } finally {
      setPublishing(false)
    }
  }

  // Handle Manual Disconnect Client
  const handleDisconnect = async (clientId: string) => {
    if (!window.confirm(`Yakin ingin memutuskan koneksi klien MQTT '${clientId}' secara paksa?`)) {
      return
    }

    setDisconnectingId(clientId)
    try {
      const res = await fetch(`${apiBase}/api/mqtt/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-User-Role': userRole || 'viewer'
        },
        body: JSON.stringify({ client_id: clientId })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memutuskan klien MQTT')
      }
      onToast(`Klien '${clientId}' berhasil diputus`, 'success', 'Disconnect Client')
    } catch (err: any) {
      onToast(err.message, 'error', 'Gagal Disconnect')
    } finally {
      setDisconnectingId(null)
    }
  }

  // Quick Preset Actions
  const handleSendPreset = (topic: string, payload: string) => {
    setPubTopic(topic)
    setPubPayload(payload)
  }

  // State Otomasi Pompa & Level Air Tandon
  const [autoConfig, setAutoConfig] = useState<WaterAutomationConfig | null>(null)
  const [autoLoading, setAutoLoading] = useState(false)
  const [savingAuto, setSavingAuto] = useState(false)
  const [showAutoForm, setShowAutoForm] = useState(false)

  // Form Fields
  const [autoEnabled, setAutoEnabled] = useState(true)
  const [autoDeviceId, setAutoDeviceId] = useState('')
  const [autoMode, setAutoMode] = useState<'percentage' | 'depth'>('percentage')
  const [autoTurnOnPct, setAutoTurnOnPct] = useState(25)
  const [autoTurnOffPct, setAutoTurnOffPct] = useState(90)
  const [autoTurnOnDepth, setAutoTurnOnDepth] = useState(30)
  const [autoTurnOffDepth, setAutoTurnOffDepth] = useState(100)
  const [autoSafetyTimeout, setAutoSafetyTimeout] = useState(60)
  const [tankTotalDepth, setTankTotalDepth] = useState(100)
  const [tankSensorOffset, setTankSensorOffset] = useState(20)
  const [tankThresholdLow, setTankThresholdLow] = useState(25)
  const [tankThresholdHigh, setTankThresholdHigh] = useState(90)

  // Fetch Konfigurasi Otomasi dari Server
  const fetchWaterAutoConfig = async () => {
    try {
      setAutoLoading(true)
      const res = await fetch(`${apiBase}/api/water-automation`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-User-Role': userRole || 'viewer'
        }
      })
      const data = await res.json()
      if (res.ok && data?.data) {
        const cfg: WaterAutomationConfig = data.data
        setAutoConfig(cfg)
        setAutoEnabled(cfg.is_enabled)
        setAutoDeviceId(cfg.device_id || '')
        setAutoMode(cfg.mode || 'percentage')
        setAutoTurnOnPct(cfg.turn_on_pct ?? 25)
        setAutoTurnOffPct(cfg.turn_off_pct ?? 90)
        setAutoTurnOnDepth(cfg.turn_on_depth_cm ?? 30)
        setAutoTurnOffDepth(cfg.turn_off_depth_cm ?? 100)
        setAutoSafetyTimeout(cfg.safety_timeout_min ?? 60)
        setTankTotalDepth(cfg.tank_total_depth_cm ?? 100)
        setTankSensorOffset(cfg.tank_sensor_offset_min_cm ?? 20)
        setTankThresholdLow(cfg.tank_threshold_low_pct ?? 25)
        setTankThresholdHigh(cfg.tank_threshold_high_pct ?? 90)
      }
    } catch (err: any) {
      console.warn('Gagal memuat konfigurasi water automation:', err)
    } finally {
      setAutoLoading(false)
    }
  }

  useEffect(() => {
    fetchWaterAutoConfig()
  }, [apiBase, authToken])

  // Simpan Konfigurasi Otomasi & Geometri Tangki
  const handleSaveWaterAuto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!autoDeviceId) {
      onToast('Pilih perangkat saklar pompa air', 'warning', 'Validasi')
      return
    }

    if (tankTotalDepth <= 0) {
      onToast('Kedalaman total tangki harus lebih besar dari 0 cm', 'warning', 'Validasi')
      return
    }

    if (tankThresholdLow >= tankThresholdHigh) {
      onToast('Ambang batas rendah tangki (Low) harus lebih kecil dari ambang batas penuh (High)', 'warning', 'Validasi')
      return
    }

    if (autoMode === 'percentage' && autoTurnOnPct >= autoTurnOffPct) {
      onToast('Batas Nyala Otomatis harus lebih kecil dari Batas Mati Otomatis (%)', 'warning', 'Validasi')
      return
    }

    if (autoMode === 'depth' && autoTurnOnDepth >= autoTurnOffDepth) {
      onToast('Kedalaman Nyala Otomatis harus lebih kecil dari Kedalaman Mati Otomatis (cm)', 'warning', 'Validasi')
      return
    }

    setSavingAuto(true)
    try {
      const res = await fetch(`${apiBase}/api/water-automation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-User-Role': userRole || 'viewer'
        },
        body: JSON.stringify({
          is_enabled: autoEnabled,
          device_id: autoDeviceId,
          mode: autoMode,
          turn_on_pct: Number(autoTurnOnPct),
          turn_off_pct: Number(autoTurnOffPct),
          turn_on_depth_cm: Number(autoTurnOnDepth),
          turn_off_depth_cm: Number(autoTurnOffDepth),
          tank_total_depth_cm: Number(tankTotalDepth),
          tank_sensor_offset_min_cm: Number(tankSensorOffset),
          tank_threshold_low_pct: Number(tankThresholdLow),
          tank_threshold_high_pct: Number(tankThresholdHigh),
          safety_timeout_min: Number(autoSafetyTimeout),
          cooldown_sec: 15
        })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan konfigurasi otomasi')
      }
      onToast('Konfigurasi dimensi tangki & otomasi tandon berhasil disimpan!', 'success', 'Tersimpan')
      fetchWaterAutoConfig()
      setShowAutoForm(false)
    } catch (err: any) {
      onToast(err.message, 'error', 'Simpan Gagal')
    } finally {
      setSavingAuto(false)
    }
  }

  // Quick Toggle Enable/Disable Automation
  const handleToggleAutoEnabled = async (newVal: boolean) => {
    if (!autoConfig) return
    try {
      const res = await fetch(`${apiBase}/api/water-automation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-User-Role': userRole || 'viewer'
        },
        body: JSON.stringify({
          ...autoConfig,
          is_enabled: newVal
        })
      })
      if (res.ok) {
        setAutoEnabled(newVal)
        setAutoConfig(prev => prev ? { ...prev, is_enabled: newVal } : null)
        onToast(`Otomasi air sekarang ${newVal ? 'DIAKTIFKAN' : 'DINONAKTIFKAN'}`, 'info', 'Status Otomasi')
      }
    } catch (err: any) {
      onToast(err.message, 'error', 'Gagal')
    }
  }

  // Color state mapping
  const getStateColor = (st: string) => {
    switch (st) {
      case 'OVERFLOW':
        return 'from-rose-500/20 to-rose-600/10 text-rose-300 border-rose-500/40 shadow-rose-950/40'
      case 'FULL':
        return 'from-emerald-500/20 to-teal-600/10 text-emerald-300 border-emerald-500/40 shadow-emerald-950/40'
      case 'NORMAL':
        return 'from-cyan-500/20 to-blue-600/10 text-cyan-300 border-cyan-500/40 shadow-cyan-950/40'
      case 'LOW':
        return 'from-amber-500/20 to-orange-600/10 text-amber-300 border-amber-500/40 shadow-amber-950/40'
      default:
        return 'from-slate-800/40 to-slate-900/40 text-slate-300 border-slate-700/50 shadow-black/40'
    }
  }

  const clientsList = status?.clients || []

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-12 w-full max-w-full overflow-hidden">
      {/* HEADER SECTION */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950/30 to-slate-900 border border-sky-500/20 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-cyan-950/50 flex-shrink-0">
            📡
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-xl font-black text-white tracking-tight truncate">
                BARA MQTT Core & Water Telemetry
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider border ${
                status?.running
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {status?.running ? 'Broker Live (:1883)' : 'Offline'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 line-clamp-2">
              Embedded MQTT Broker v3.1.1/v5 interkoneksi langsung dengan NodeMCU ESP8266 & Sensor JSN-SR04T.
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-left sm:text-right">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Klien Aktif</span>
            <span className="text-xs sm:text-sm font-black text-cyan-300 font-mono">
              {status?.active_clients ?? clientsList.length} Perangkat
            </span>
          </div>

          <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-left sm:text-right">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">WebSocket</span>
            <span className={`text-[11px] sm:text-xs font-bold flex items-center sm:justify-end gap-1.5 ${
              wsConnected ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="truncate">{wsConnected ? 'Live 100ms' : 'Menghubungkan...'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* TOP ROW: WATER TANK VISUALIZER + QUICK TELEMETRY METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* TANK CYLINDER VISUALIZER (5 COLS) */}
        <div className="lg:col-span-5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <div>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 block">
                Tangki Air Realtime
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">Visualisasi Volume Tandon</h3>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold border bg-gradient-to-r shadow-lg whitespace-nowrap ${getStateColor(waterState)}`}>
              {waterState}
            </div>
          </div>

          {/* Liquid Tank Cylinder + Summary Info */}
          <div className="my-2 sm:my-4 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 py-2">
            {/* Cylinder Visualizer */}
            <div className="relative w-36 h-56 sm:w-44 sm:h-72 rounded-3xl bg-slate-950/80 border-2 border-slate-700/80 p-1.5 shadow-inner overflow-hidden flex flex-col justify-end flex-shrink-0">
              {/* Level Markers */}
              <div className="absolute inset-y-0 right-2 flex flex-col justify-between text-[9px] font-mono text-slate-500 py-3 sm:py-4 select-none z-10 pointer-events-none">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>

              {/* Water Liquid Body */}
              <div
                className={`w-full rounded-2xl transition-all duration-700 ease-out relative overflow-hidden ${
                  waterPercent > 85
                    ? 'bg-gradient-to-t from-cyan-600 via-sky-500 to-blue-400 shadow-lg shadow-cyan-500/50'
                    : waterPercent > 30
                    ? 'bg-gradient-to-t from-blue-700 via-cyan-600 to-sky-400 shadow-md shadow-blue-500/40'
                    : 'bg-gradient-to-t from-amber-700 via-orange-600 to-amber-400 shadow-md shadow-amber-500/40'
                }`}
                style={{ height: `${waterPercent}%` }}
              >
                {/* Surface Wave Effect */}
                <div className="absolute top-0 inset-x-0 h-2 bg-white/30 blur-[1px] animate-pulse" />
              </div>

              {/* Float Percent Badge Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                <span className="text-3xl sm:text-4xl font-black text-white font-mono drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  {water ? waterPercent.toFixed(1) : '--'}%
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-200 uppercase tracking-widest drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  Kapasitas
                </span>
              </div>
            </div>

            {/* Quick Summary Aside (Responsive Grid on Mobile) */}
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-2.5 w-full sm:w-auto sm:flex-1 sm:max-w-[200px]">
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Kedalaman Air</span>
                  <span className="text-[9px] text-cyan-400 font-mono">/ {autoConfig?.tank_total_depth_cm ?? 100}cm</span>
                </div>
                <span className="text-base sm:text-xl font-black text-white font-mono mt-0.5 block">
                  {water ? `${water.water_depth_cm.toFixed(1)} cm` : '--'}
                </span>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Jarak Sensor</span>
                <span className="text-base sm:text-xl font-black text-slate-300 font-mono">
                  {water ? `${water.raw_distance_cm.toFixed(1)} cm` : '--'}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Status Pompa</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    pumpAction === 'START' ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                  }`} />
                  <span className={`text-xs sm:text-sm font-extrabold uppercase font-mono ${
                    pumpAction === 'START' ? 'text-emerald-400' : 'text-slate-400'
                  }`}>
                    {pumpAction}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[10px] sm:text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-1">
            <span>Topic: <code className="text-cyan-300">home/water/telemetry</code></span>
            <span>Update: {water?.timestamp ? new Date(water.timestamp).toLocaleTimeString() : 'Menunggu data'}</span>
          </div>
        </div>

        {/* METRICS & HARDWARE STATUS GRID (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
            {/* Card 1: WiFi RSSI */}
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sinyal WiFi</span>
              <div className="mt-1 sm:mt-2 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono">
                  {water?.rssi ? `${water.rssi}` : '--'}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500 font-mono">dBm</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 truncate">
                {water?.rssi && water.rssi > -67 ? 'Kuat / Stabil' : 'Cukup'}
              </p>
            </div>

            {/* Card 2: IP Address */}
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IP NodeMCU</span>
              <span className="mt-1 sm:mt-2 text-xs sm:text-sm font-extrabold text-white font-mono block truncate" title={water?.ip || '-'}>
                {water?.ip || 'Offline'}
              </span>
              <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">Subnet Lokal</p>
            </div>

            {/* Card 3: NodeMCU Uptime */}
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Uptime Alat</span>
              <span className="mt-1 sm:mt-2 text-sm sm:text-lg font-black text-emerald-400 font-mono block truncate">
                {water ? formatUptime(water.uptime_ms) : '--'}
              </span>
              <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">Sejak Booting</p>
            </div>

            {/* Card 4: Sensor Validity */}
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Validitas Echo</span>
              <span className={`mt-1 sm:mt-2 text-xs sm:text-sm font-extrabold font-mono block truncate ${
                water?.valid ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {water ? (water.valid ? 'VALID ECHO' : 'INVALID ECHO') : '--'}
              </span>
              <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">JSN-SR04T Sensor</p>
            </div>
          </div>

          {/* MQTT PUBLISH & DEVICE COMMAND CONSOLE */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 mb-4 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🚀</span>
                <h4 className="text-xs sm:text-sm font-bold text-white">MQTT Control & Publish Command</h4>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSendPreset('home/water/pump/control', '{"command":"START"}')}
                  className="px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
                >
                  START POMPA
                </button>
                <button
                  type="button"
                  onClick={() => handleSendPreset('home/water/pump/control', '{"command":"STOP"}')}
                  className="px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                >
                  STOP POMPA
                </button>
              </div>
            </div>

            <form onSubmit={handlePublish} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Target Topic MQTT
                  </label>
                  <input
                    type="text"
                    value={pubTopic}
                    onChange={(e) => setPubTopic(e.target.value)}
                    placeholder="e.g. home/water/pump/control"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-6">
                  <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Payload Message (JSON / String)
                  </label>
                  <input
                    type="text"
                    value={pubPayload}
                    onChange={(e) => setPubPayload(e.target.value)}
                    placeholder='{"command":"START"}'
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                  <input
                    type="checkbox"
                    checked={pubRetain}
                    onChange={(e) => setPubRetain(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
                  />
                  <span>Retain Message (Simpan pesan di Broker)</span>
                </label>

                <button
                  type="submit"
                  disabled={publishing}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {publishing ? 'Mengirim...' : 'Publish ke MQTT ✈️'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* OTOMASI PINTAR PERANGKAT AIR (TANDON / POMPA AIR BERDASARKAN LEVEL AIR) */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-indigo-950/50 flex-shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Otomasi Saklar Pompa Air Otomatis
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider border ${
                  autoConfig?.is_enabled
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}>
                  {autoConfig?.is_enabled ? 'Otomasi Aktif' : 'Nonaktif'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Nyalakan saklar pompa secara otomatis saat air tandon berkurang, dan matikan saat tandon penuh.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleAutoEnabled(!autoConfig?.is_enabled)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                autoConfig?.is_enabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <span>{autoConfig?.is_enabled ? '✅ Otomasi Aktif' : '⏸️ Aktifkan Otomasi'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAutoForm(!showAutoForm)}
              disabled={autoLoading}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <span>⚙️ {autoLoading ? 'Memuat...' : (showAutoForm ? 'Tutup Pengaturan' : 'Atur Batas')}</span>
            </button>
          </div>
        </div>

        {/* Status Ringkasan & Kartu Perangkat Terhubung */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Target Perangkat Saklar */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Perangkat Saklar Pompa
              </span>
              <span className="text-xs sm:text-sm font-black text-white truncate block mt-0.5">
                {autoConfig?.device_name || 'Belum dipilih'}
              </span>
              <span className="text-[10px] font-mono text-slate-500 block">
                ID: {autoConfig?.device_id || '-'}
              </span>
            </div>

            {autoConfig?.device_id && onToggleDevice && (
              <button
                type="button"
                onClick={() => onToggleDevice(autoConfig.device_id)}
                className={`ml-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex-shrink-0 cursor-pointer ${
                  autoConfig.device_status
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {autoConfig.device_status ? 'NYALA' : 'MATI'}
              </button>
            )}
          </div>

          {/* Dimensi Fisik Tangki */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Dimensi Tangki & Sensor
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xs sm:text-sm font-bold text-cyan-400 font-mono">
                {autoConfig?.tank_total_depth_cm ?? 100} cm
              </span>
              <span className="text-slate-500 text-[10px] font-mono">(Offset {autoConfig?.tank_sensor_offset_min_cm ?? 20}cm)</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Low: <strong className="text-amber-400 font-mono">{autoConfig?.tank_threshold_low_pct ?? 25}%</strong> • Full: <strong className="text-emerald-400 font-mono">{autoConfig?.tank_threshold_high_pct ?? 90}%</strong>
            </span>
          </div>

          {/* Ambang Batas Trigger */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Parameter Ambang Batas
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xs sm:text-sm font-bold text-emerald-400">
                Nyala: {autoConfig?.mode === 'depth' ? `${autoConfig.turn_on_depth_cm} cm` : `${autoConfig?.turn_on_pct ?? 25}%`}
              </span>
              <span className="text-slate-500 font-mono">→</span>
              <span className="text-xs sm:text-sm font-bold text-rose-400">
                Mati: {autoConfig?.mode === 'depth' ? `${autoConfig.turn_off_depth_cm} cm` : `${autoConfig?.turn_off_pct ?? 90}%`}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Mode: <strong className="text-cyan-300 uppercase">{autoConfig?.mode === 'depth' ? 'Kedalaman Air' : 'Persentase Tandon'}</strong>
            </span>
          </div>

          {/* Riwayat Aksi Terakhir */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Aksi Otomasi Terakhir
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                autoConfig?.last_action?.startsWith('START') ? 'bg-emerald-400' : 'bg-slate-500'
              }`} />
              <span className="text-xs sm:text-sm font-black font-mono text-cyan-300">
                {autoConfig?.last_action || 'IDLE'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
              {autoConfig?.last_triggered_at ? autoConfig.last_triggered_at : 'Belum pernah tertrigger'}
            </span>
          </div>
        </div>

        {/* FORM PENGATURAN AMBANG BATAS & PERANGKAT OTOMASI */}
        {showAutoForm && (
          <form onSubmit={handleSaveWaterAuto} className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-indigo-500/30 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>🛠️</span> Konfigurasi Pemicu Otomatisasi Tandon Air
              </h4>
              <span className="text-[10px] text-slate-400">Tekan Simpan untuk menerapkan</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
              {/* Pilihan Perangkat */}
              <div className="sm:col-span-6">
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Pilih Perangkat Saklar Pompa
                </label>
                <select
                  value={autoDeviceId}
                  onChange={(e) => setAutoDeviceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">-- Pilih Perangkat Saklar --</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.status ? 'Sedang ON' : 'OFF'})
                    </option>
                  ))}
                  {/* Fallback jika list devices kosong tetapi id terdaftar */}
                  {devices.length === 0 && autoConfig?.device_id && (
                    <option value={autoConfig.device_id}>
                      {autoConfig.device_name || 'Pompa Air Terdaftar'} ({autoConfig.device_id})
                    </option>
                  )}
                </select>
              </div>

              {/* Mode Pemicu */}
              <div className="sm:col-span-6">
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Metode Penentuan Level Air
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoMode('percentage')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      autoMode === 'percentage'
                        ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500 shadow-md shadow-indigo-950'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    Persentase (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoMode('depth')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      autoMode === 'depth'
                        ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500 shadow-md shadow-indigo-950'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    Kedalaman Air (cm)
                  </button>
                </div>
              </div>

              {/* Slider / Input Batas Nyala & Mati */}
              {autoMode === 'percentage' ? (
                <>
                  <div className="sm:col-span-6">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Batas Nyala Otomatis (Saat Air Kurang)
                      </label>
                      <span className="text-xs font-mono font-bold text-emerald-400">{autoTurnOnPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={80}
                      step={1}
                      value={autoTurnOnPct}
                      onChange={(e) => setAutoTurnOnPct(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Pompa akan otomatis <strong className="text-emerald-400">NYALA</strong> jika kapasitas ≤ {autoTurnOnPct}%
                    </span>
                  </div>

                  <div className="sm:col-span-6">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Batas Mati Otomatis (Saat Tandon Terisi)
                      </label>
                      <span className="text-xs font-mono font-bold text-rose-400">{autoTurnOffPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={98}
                      step={1}
                      value={autoTurnOffPct}
                      onChange={(e) => setAutoTurnOffPct(Number(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Pompa akan otomatis <strong className="text-rose-400">MATI</strong> jika kapasitas ≥ {autoTurnOffPct}%
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="sm:col-span-6">
                    <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Kedalaman Air Nyala Otomatis (cm)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={300}
                      value={autoTurnOnDepth}
                      onChange={(e) => setAutoTurnOnDepth(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      required
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Pompa menyala saat tinggi air ≤ {autoTurnOnDepth} cm
                    </span>
                  </div>

                  <div className="sm:col-span-6">
                    <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Kedalaman Air Mati Otomatis (cm)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={350}
                      value={autoTurnOffDepth}
                      onChange={(e) => setAutoTurnOffDepth(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      required
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Pompa mati saat tinggi air ≥ {autoTurnOffDepth} cm
                    </span>
                  </div>
                </>
              )}

              {/* Dimensi Fisik Tangki & Sensor Offset (Configurable di DB) */}
              <div className="sm:col-span-12 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📐</span> Parameter Fisik Tangki & Sensor JSN-SR04T
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Diterapkan ke Perhitungan Telemetri</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* TANK_TOTAL_DEPTH_CM */}
                  <div>
                    <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Kedalaman Tangki (cm)
                    </label>
                    <input
                      type="number"
                      min={20}
                      max={500}
                      step={0.5}
                      value={tankTotalDepth}
                      onChange={(e) => setTankTotalDepth(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-cyan-300 font-mono font-bold focus:border-indigo-500 focus:outline-none"
                      required
                    />
                    <span className="text-[9px] text-slate-500 block mt-1">
                      (TANK_TOTAL_DEPTH_CM) Dasar ke bibir penuh
                    </span>
                  </div>

                  {/* TANK_SENSOR_OFFSET_MIN_CM */}
                  <div>
                    <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Offset Sensor Min (cm)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      step={0.5}
                      value={tankSensorOffset}
                      onChange={(e) => setTankSensorOffset(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-cyan-300 font-mono font-bold focus:border-indigo-500 focus:outline-none"
                      required
                    />
                    <span className="text-[9px] text-slate-500 block mt-1">
                      (OFFSET_MIN) Jarak sensor ke air penuh
                    </span>
                  </div>

                  {/* TANK_THRESHOLD_LOW_PERCENT */}
                  <div>
                    <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Ambang Batas Low (%)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={50}
                      step={1}
                      value={tankThresholdLow}
                      onChange={(e) => setTankThresholdLow(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-amber-300 font-mono font-bold focus:border-indigo-500 focus:outline-none"
                      required
                    />
                    <span className="text-[9px] text-slate-500 block mt-1">
                      Status LOW_LEVEL jika kapasitas ≤ {tankThresholdLow}%
                    </span>
                  </div>

                  {/* TANK_THRESHOLD_HIGH_PERCENT */}
                  <div>
                    <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Ambang Batas High (%)
                    </label>
                    <input
                      type="number"
                      min={60}
                      max={98}
                      step={1}
                      value={tankThresholdHigh}
                      onChange={(e) => setTankThresholdHigh(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-emerald-300 font-mono font-bold focus:border-indigo-500 focus:outline-none"
                      required
                    />
                    <span className="text-[9px] text-slate-500 block mt-1">
                      Status FULL jika kapasitas ≥ {tankThresholdHigh}%
                    </span>
                  </div>
                </div>

                {/* Info rumus live */}
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[10px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
                  <span>💡 Jarak Maksimal Terbaca Kosong: <strong className="text-white font-mono">{tankTotalDepth + tankSensorOffset} cm</strong></span>
                  <span>Kedalaman Air: <code className="text-cyan-300 font-mono">({tankTotalDepth + tankSensorOffset} - Jarak Sensor) cm</code></span>
                  <span>Persentase: <code className="text-cyan-300 font-mono">(Kedalaman Air / {tankTotalDepth}) × 100%</code></span>
                </div>
              </div>

              {/* Safety Max Runtime */}
              <div className="sm:col-span-12">
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Proteksi Batas Waktu Nyala Maksimal (Menit)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={autoSafetyTimeout}
                    onChange={(e) => setAutoSafetyTimeout(Number(e.target.value))}
                    className="w-32 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    required
                  />
                  <span className="text-[11px] text-slate-400">
                    Menit (Mencegah pompa terus menyala tanpa henti jika sensor kotor atau ada kebocoran pipa)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAutoForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingAuto}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingAuto ? 'Menyimpan...' : 'Simpan Konfigurasi Otomasi 💾'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* CONNECTED CLIENTS LIST SECTION */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">💻</span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Daftar Klien Terhubung ke Broker</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">NodeMCU ESP8266, sensor, dan service IoT yang aktif di broker port 1883</p>
            </div>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
            {clientsList.length} Klien Aktif
          </span>
        </div>

        {clientsList.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs italic bg-slate-950/40 rounded-2xl border border-slate-800/60">
            Belum ada klien MQTT eksternal yang terhubung.
          </div>
        ) : (
          <>
            {/* Mobile View: Card-based list for smaller screens */}
            <div className="block sm:hidden space-y-3">
              {clientsList.map((cl) => {
                const isDisconnecting = disconnectingId === cl.id
                return (
                  <div key={cl.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                        <span className="font-mono font-bold text-cyan-300 text-xs truncate">{cl.id}</span>
                      </div>
                      <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase flex-shrink-0 ${
                        cl.is_inline
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {cl.is_inline ? 'Built-in' : 'IoT Device'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800/80">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">IP Remote</span>
                        <span className="font-mono text-slate-300 break-all">{cl.remote_ip}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Tersambung</span>
                        <span className="font-mono text-slate-400">{cl.connected_at}</span>
                      </div>
                    </div>

                    {!cl.is_inline && (
                      <div className="pt-2 border-t border-slate-800/60 flex justify-end">
                        <button
                          type="button"
                          disabled={isDisconnecting}
                          onClick={() => handleDisconnect(cl.id)}
                          className="w-full py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <span>⛔</span>
                          <span>{isDisconnecting ? 'Memutus...' : 'Putuskan Koneksi'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Desktop View: Full Table */}
            <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-300 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Client ID / Nama</th>
                    <th className="py-3 px-4">Alamat IP & Port</th>
                    <th className="py-3 px-4">Tipe Klien</th>
                    <th className="py-3 px-4">Tersambung Sejak</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {clientsList.map((cl) => {
                    const isDisconnecting = disconnectingId === cl.id
                    return (
                      <tr key={cl.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-cyan-300 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>{cl.id}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-200">
                          {cl.remote_ip}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            cl.is_inline
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {cl.is_inline ? 'Built-in Server' : 'External Device (IoT)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {cl.connected_at}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {cl.is_inline ? (
                            <span className="text-[11px] text-slate-500 italic select-none">System Core</span>
                          ) : (
                            <button
                              type="button"
                              disabled={isDisconnecting}
                              onClick={() => handleDisconnect(cl.id)}
                              className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer disabled:opacity-50"
                              title="Putuskan koneksi klien secara paksa"
                            >
                              {isDisconnecting ? 'Memutus...' : 'Disconnect ⛔'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* BOTTOM SECTION: LIVE MQTT PACKET LOG CONSOLE */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">📟</span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Live MQTT Stream Terminal</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">Log semua paket MQTT masuk & keluar secara realtime melalui broker port 1883</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
              placeholder="Filter topic..."
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none flex-1 sm:w-44"
            />
            <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 whitespace-nowrap">
              {displayLogs.length} Entri
            </span>
          </div>
        </div>

        {/* Terminal Window */}
        <div className="rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800/80 p-3 sm:p-4 font-mono text-xs max-h-80 overflow-y-auto space-y-2 scrollbar-thin">
          {displayLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs italic">
              Menunggu transmisi paket dari NodeMCU atau klien MQTT...
            </div>
          ) : (
            displayLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3 p-2 rounded-lg hover:bg-slate-900/60 transition-colors border-l-2 border-transparent hover:border-cyan-500 text-[11px] sm:text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[10px] select-none">
                    [{log.timestamp}]
                  </span>

                  <span className={`px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold uppercase select-none ${
                    log.direction === 'in'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  }`}>
                    {log.direction === 'in' ? 'PUB IN' : 'PUB OUT'}
                  </span>
                </div>

                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                  <span className="text-sky-300 font-semibold select-all break-all sm:break-normal">
                    {log.topic}
                  </span>

                  <span className="text-slate-300 break-all flex-1">
                    {log.payload}
                  </span>
                </div>

                <span className="text-slate-600 text-[10px] select-none self-end sm:self-auto">
                  via {log.client_id}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
export default MqttDashboard
