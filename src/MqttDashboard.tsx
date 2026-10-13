import React, { useState } from 'react'

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

interface MqttDashboardProps {
  status: MqttStatusData | null
  telemetry: WaterTelemetry | null
  recentPackets: MqttLogEntry[]
  wsConnected: boolean
  apiBase: string
  authToken: string
  userRole: string
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
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* HEADER SECTION */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950/30 to-slate-900 border border-sky-500/20 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center text-2xl shadow-lg shadow-cyan-950/50">
            📡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">BARA MQTT Core & Water Telemetry</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                status?.running
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {status?.running ? 'Broker Live (:1883)' : 'Offline'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Embedded MQTT Broker v3.1.1/v5 interkoneksi langsung dengan NodeMCU ESP8266 & Sensor JSN-SR04T.
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Klien Aktif</span>
            <span className="text-sm font-black text-cyan-300 font-mono">
              {status?.active_clients ?? clientsList.length} Perangkat
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">WebSocket Stream</span>
            <span className={`text-xs font-bold flex items-center justify-end gap-1.5 ${
              wsConnected ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {wsConnected ? 'Realtime 100ms' : 'Menghubungkan...'}
            </span>
          </div>
        </div>
      </div>

      {/* TOP ROW: WATER TANK VISUALIZER + QUICK TELEMETRY METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* TANK CYLINDER VISUALIZER (5 COLS) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">
                Tangki Air Realtime
              </span>
              <h3 className="text-lg font-bold text-white">Visualisasi Volume Tandon</h3>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold border bg-gradient-to-r shadow-lg ${getStateColor(waterState)}`}>
              STATUS: {waterState}
            </div>
          </div>

          {/* Liquid Tank Cylinder */}
          <div className="my-4 flex items-center justify-center gap-6 py-2">
            <div className="relative w-36 h-64 sm:w-44 sm:h-72 rounded-3xl bg-slate-950/80 border-2 border-slate-700/80 p-1.5 shadow-inner overflow-hidden flex flex-col justify-end">
              {/* Level Markers */}
              <div className="absolute inset-y-0 right-2 flex flex-col justify-between text-[9px] font-mono text-slate-500 py-4 select-none z-10 pointer-events-none">
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
                <span className="text-[11px] font-semibold text-slate-200 uppercase tracking-widest drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  Kapasitas
                </span>
              </div>
            </div>

            {/* Quick Summary Aside */}
            <div className="space-y-3 flex-1 max-w-[200px]">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Kedalaman Air</span>
                <span className="text-xl font-black text-white font-mono">
                  {water ? `${water.water_depth_cm.toFixed(1)} cm` : '--'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Jarak Sensor (Ultrasonik)</span>
                <span className="text-xl font-black text-slate-300 font-mono">
                  {water ? `${water.raw_distance_cm.toFixed(1)} cm` : '--'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Status Pompa</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    pumpAction === 'START' ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                  }`} />
                  <span className={`text-sm font-extrabold uppercase font-mono ${
                    pumpAction === 'START' ? 'text-emerald-400' : 'text-slate-400'
                  }`}>
                    {pumpAction}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Topic: <code className="text-cyan-300">home/water/telemetry</code></span>
            <span>Update: {water?.timestamp ? new Date(water.timestamp).toLocaleTimeString() : 'Menunggu data'}</span>
          </div>
        </div>

        {/* METRICS & HARDWARE STATUS GRID (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Card 1: WiFi RSSI */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sinyal WiFi</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-cyan-300 font-mono">
                  {water?.rssi ? `${water.rssi}` : '--'}
                </span>
                <span className="text-xs text-slate-500 font-mono">dBm</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {water?.rssi && water.rssi > -67 ? 'Kuat / Stabil' : 'Cukup'}
              </p>
            </div>

            {/* Card 2: IP Address */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IP NodeMCU</span>
              <span className="mt-2 text-sm font-extrabold text-white font-mono block truncate" title={water?.ip || '-'}>
                {water?.ip || 'Offline'}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">Subnet Lokal</p>
            </div>

            {/* Card 3: NodeMCU Uptime */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Uptime Alat</span>
              <span className="mt-2 text-lg font-black text-emerald-400 font-mono block">
                {water ? formatUptime(water.uptime_ms) : '--'}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">Sejak Booting</p>
            </div>

            {/* Card 4: Sensor Validity */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Validitas Echo</span>
              <span className={`mt-2 text-sm font-extrabold font-mono block ${
                water?.valid ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {water ? (water.valid ? 'VALID ECHO' : 'INVALID ECHO') : '--'}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">JSN-SR04T Sensor</p>
            </div>
          </div>

          {/* MQTT PUBLISH & DEVICE COMMAND CONSOLE */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-base">🚀</span>
                <h4 className="text-sm font-bold text-white">MQTT Control & Publish Command</h4>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSendPreset('home/water/pump/control', '{"command":"START"}')}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
                >
                  Preset: START POMPA
                </button>
                <button
                  type="button"
                  onClick={() => handleSendPreset('home/water/pump/control', '{"command":"STOP"}')}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                >
                  Preset: STOP POMPA
                </button>
              </div>
            </div>

            <form onSubmit={handlePublish} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
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

              <div className="flex items-center justify-between pt-1">
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
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {publishing ? 'Mengirim...' : 'Publish ke MQTT ✈️'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* CONNECTED CLIENTS LIST SECTION */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">💻</span>
            <div>
              <h3 className="text-base font-bold text-white">Daftar Klien Terhubung ke Broker</h3>
              <p className="text-xs text-slate-400">NodeMCU ESP8266, sensor, dan service IoT yang aktif di broker port 1883</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
            {clientsList.length} Klien Aktif
          </span>
        </div>

        {clientsList.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs italic bg-slate-950/40 rounded-2xl border border-slate-800/60">
            Belum ada klien MQTT eksternal yang terhubung.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
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
        )}
      </div>

      {/* BOTTOM SECTION: LIVE MQTT PACKET LOG CONSOLE */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">📟</span>
            <div>
              <h3 className="text-base font-bold text-white">Live MQTT Stream Terminal</h3>
              <p className="text-xs text-slate-400">Log semua paket MQTT masuk & keluar secara realtime melalui broker port 1883</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
              placeholder="Filter topic..."
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none w-44"
            />
            <span className="text-[11px] font-mono text-slate-500">
              {displayLogs.length} Entri
            </span>
          </div>
        </div>

        {/* Terminal Window */}
        <div className="rounded-2xl bg-slate-950 border border-slate-800/80 p-4 font-mono text-xs max-h-80 overflow-y-auto space-y-2 scrollbar-thin">
          {displayLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs italic">
              Menunggu transmisi paket dari NodeMCU atau klien MQTT...
            </div>
          ) : (
            displayLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-900/60 transition-colors border-l-2 border-transparent hover:border-cyan-500"
              >
                <span className="text-slate-500 text-[10px] select-none pt-0.5">
                  [{log.timestamp}]
                </span>

                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase select-none ${
                  log.direction === 'in'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                }`}>
                  {log.direction === 'in' ? 'PUB IN' : 'PUB OUT'}
                </span>

                <span className="text-sky-300 font-semibold select-all">
                  {log.topic}
                </span>

                <span className="text-slate-300 break-all flex-1">
                  {log.payload}
                </span>

                <span className="text-slate-600 text-[10px] select-none">
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
