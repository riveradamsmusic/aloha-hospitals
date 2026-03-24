'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function parseSupabaseTimestamp(timestamp) {
  if (!timestamp || typeof timestamp !== 'string') return Date.now()

  let normalized = timestamp.trim()

  if (normalized.includes(' ') && !normalized.includes('T')) {
    normalized = normalized.replace(' ', 'T')
  }

  const hasTimezone =
    normalized.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(normalized)

  if (!hasTimezone) {
    normalized = `${normalized}Z`
  }

  const parsed = new Date(normalized).getTime()

  return Number.isNaN(parsed) ? Date.now() : parsed
}

function getMinutesInState(timestamp) {
  const now = Date.now()
  const then = parseSupabaseTimestamp(timestamp)
  return Math.max(0, Math.floor((now - then) / 60000))
}

function getFormattedTimeInState(timestamp) {
  const minutes = getMinutesInState(timestamp)

  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  }

  return `${minutes}m`
}

function getTimerColor(minutes) {
  if (minutes >= 90) return '#ff4d4f'
  if (minutes >= 60) return '#f5b000'
  return '#f8fafc'
}

function getStateStyles(color) {
  switch (color) {
    case 'blue':
      return { background: '#123A67', text: '#66B2FF' }
    case 'yellow':
      return { background: '#4A4300', text: '#FFD600' }
    case 'orange':
      return { background: '#4A2600', text: '#FF9D00' }
    case 'purple':
      return { background: '#24104A', text: '#A780FF' }
    case 'green':
      return { background: '#083A23', text: '#33E1A1' }
    case 'gray':
      return { background: '#2E3A52', text: '#D9E1F2' }
    default:
      return { background: '#1E293B', text: '#FFFFFF' }
  }
}

function normalizeBeds(rows) {
  if (!rows) return []

  return rows.map((row) => {
    let normalizedState

    if (Array.isArray(row.care_states)) {
      normalizedState = row.care_states[0]
    } else if (row.care_states) {
      normalizedState = row.care_states
    }

    return {
      id: row.id,
      bed_number: row.bed_number,
      state_updated_at: row.state_updated_at,
      state_id: row.state_id,
      care_states: normalizedState,
    }
  })
}

function getModeButtonStyle(active, isMobileLike) {
  return {
    width: isMobileLike ? 120 : 140,
    height: isMobileLike ? 36 : 40,
    borderRadius: 999,
    border: active ? '1px solid #3B82F6' : '1px solid #334155',
    background: active ? '#123A67' : '#111827',
    color: active ? '#66B2FF' : '#CBD5E1',
    fontSize: isMobileLike ? 11 : 12,
    fontWeight: 700,
    letterSpacing: 0.8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    boxSizing: 'border-box',
  }
}

function getHeaderButtonStyle(isMobileLike) {
  return {
    width: isMobileLike ? 110 : 128,
    height: isMobileLike ? 36 : 40,
    borderRadius: 999,
    border: '1px solid #475569',
    background: '#111827',
    color: '#E2E8F0',
    fontSize: isMobileLike ? 11 : 12,
    fontWeight: 700,
    letterSpacing: 0.8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    boxSizing: 'border-box',
  }
}

export default function Home() {
  const [beds, setBeds] = useState([])
  const [states, setStates] = useState([])
  const [selectedBed, setSelectedBed] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [nowTick, setNowTick] = useState(Date.now())
  const [mounted, setMounted] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(1440)
  const [displayMode, setDisplayMode] = useState('wall')

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const isMobileLike = viewportWidth < 900
  const isNurseMode = displayMode === 'nurse'
  const isWallMode = displayMode === 'wall'

  const selectedBedData = useMemo(() => {
    if (!beds.length) return null

    if (selectedBed) {
      return beds.find((bed) => bed.id === selectedBed) || null
    }

    return beds[0] || null
  }, [beds, selectedBed])

  async function fetchBeds() {
    const { data, error } = await supabase
      .from('beds')
      .select(`
        id,
        bed_number,
        state_updated_at,
        state_id,
        care_states (
          id,
          name,
          display_name,
          color,
          priority
        )
      `)
      .order('bed_number', { ascending: true })

    if (error) {
      console.error(error)
      setErrorMsg(error.message)
      return
    }

    const normalized = normalizeBeds(data || [])
    setBeds(normalized)

    setSelectedBed((currentSelectedBed) => {
      if (currentSelectedBed && normalized.some((bed) => bed.id === currentSelectedBed)) {
        return currentSelectedBed
      }
      return normalized[0]?.id || null
    })
  }

  async function fetchStates() {
    const { data, error } = await supabase
      .from('care_states')
      .select('*')
      .order('priority', { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    setStates(data || [])
  }

  useEffect(() => {
    setMounted(true)
    setViewportWidth(window.innerWidth)

    const savedAuth = window.localStorage.getItem('carecell_demo_auth')
    if (savedAuth === 'true') {
      setIsAuthenticated(true)
    }

    const handleResize = () => {
      setViewportWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    fetchBeds()
    fetchStates()

    const timer = setInterval(() => {
      setNowTick(Date.now())
    }, 5000)

    const channel = supabase
      .channel(`beds-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'beds',
        },
        () => {
          fetchBeds()
        }
      )
      .subscribe()

    return () => {
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [isAuthenticated])

  function handleLogin(e) {
    e.preventDefault()

    if (loginUsername === 'Hospital 1' && loginPassword === 'demo') {
      setIsAuthenticated(true)
      setLoginError('')
      window.localStorage.setItem('carecell_demo_auth', 'true')
      setLoginPassword('')
      return
    }

    setLoginError('Invalid username or password')
  }

  function handleSignOut() {
    setIsAuthenticated(false)
    setSelectedBed(null)
    setLoginUsername('')
    setLoginPassword('')
    setLoginError('')
    window.localStorage.removeItem('carecell_demo_auth')
  }

  async function updateBedState(bedId, stateId) {
    const newTimestamp = new Date().toISOString()

    const { error } = await supabase
      .from('beds')
      .update({
        state_id: stateId,
        state_updated_at: newTimestamp,
      })
      .eq('id', bedId)

    if (error) {
      console.error(error)
      setErrorMsg(error.message)
      return
    }

    setBeds((currentBeds) =>
      currentBeds.map((bed) => {
        if (bed.id !== bedId) return bed

        const nextState = states.find((state) => state.id === stateId)

        return {
          ...bed,
          state_id: stateId,
          state_updated_at: newTimestamp,
          care_states: nextState,
        }
      })
    )

    setNowTick(Date.now())
  }

  const mainPadding = isMobileLike ? '16px' : 'clamp(24px, 3vw, 40px)'
  const outerGap = isMobileLike ? '16px' : 'clamp(18px, 2vw, 28px)'
  const gridGap = isMobileLike ? '12px' : 'clamp(16px, 2vw, 28px)'
  const cardPadding = isMobileLike ? '12px' : 'clamp(14px, 1.8vw, 28px)'

  if (!mounted) {
    return null
  }

  if (!isAuthenticated) {
    return (
      <main
        style={{
          minHeight: '100dvh',
          width: '100vw',
          background: '#07111f',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            background: '#0d1730',
            border: '1px solid #1D2A4A',
            borderRadius: 24,
            padding: isMobileLike ? 20 : 28,
            boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
          }}
        >
          <div
            style={{
              fontSize: isMobileLike ? 28 : 34,
              fontWeight: 700,
              letterSpacing: 2,
              marginBottom: 10,
            }}
          >
            CARE CELL
          </div>

          <div
            style={{
              width: 56,
              height: 4,
              background: '#3B82F6',
              borderRadius: 999,
              marginBottom: 18,
            }}
          />

          <div
            style={{
              color: '#8DA2C0',
              fontSize: 14,
              letterSpacing: 1,
              marginBottom: 24,
            }}
          >
            DEMO LOGIN
          </div>

          <form
            onSubmit={handleLogin}
            style={{
              display: 'grid',
              gap: 14,
            }}
          >
            <input
              type="text"
              placeholder="Username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              style={{
                width: '100%',
                height: 46,
                borderRadius: 12,
                border: '1px solid #334155',
                background: '#111827',
                color: 'white',
                padding: '0 14px',
                boxSizing: 'border-box',
                fontSize: 14,
              }}
            />

            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              style={{
                width: '100%',
                height: 46,
                borderRadius: 12,
                border: '1px solid #334155',
                background: '#111827',
                color: 'white',
                padding: '0 14px',
                boxSizing: 'border-box',
                fontSize: 14,
              }}
            />

            {loginError && (
              <div
                style={{
                  color: '#ff6b6b',
                  fontSize: 13,
                }}
              >
                {loginError}
              </div>
            )}

            <button
              type="submit"
              style={{
                height: 46,
                borderRadius: 12,
                border: '1px solid #3B82F6',
                background: '#123A67',
                color: '#66B2FF',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1,
                cursor: 'pointer',
              }}
            >
              SIGN IN
            </button>
          </form>

          <div
            style={{
              marginTop: 18,
              color: '#64748B',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            Username: <strong>Hospital 1</strong>
            <br />
            Password: <strong>demo</strong>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        width: '100vw',
        background: '#07111f',
        color: 'white',
        padding: mainPadding,
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1800,
          margin: '0 auto',
          display: 'grid',
          gridTemplateRows: 'auto auto',
          gap: outerGap,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'start',
            gap: '16px',
          }}
        >
          <div style={{ minWidth: 0, justifySelf: 'start' }}>
            <div
              style={{
                fontSize: isMobileLike ? '28px' : 'clamp(28px, 4vw, 56px)',
                fontWeight: 700,
                letterSpacing: isMobileLike ? '2px' : 'clamp(2px, 0.35vw, 6px)',
                lineHeight: 1.05,
                whiteSpace: 'nowrap',
              }}
            >
              CARE CELL A
            </div>

            <div
              style={{
                width: isMobileLike ? 44 : 'clamp(44px, 5vw, 70px)',
                height: 4,
                background: '#3B82F6',
                marginTop: isMobileLike ? 10 : 'clamp(10px, 1.5vw, 18px)',
                marginBottom: isMobileLike ? 10 : 'clamp(10px, 1.5vw, 18px)',
                borderRadius: 999,
              }}
            />

            <div
              style={{
                fontSize: isMobileLike ? '14px' : 'clamp(12px, 1.6vw, 24px)',
                color: '#8DA2C0',
                letterSpacing: isMobileLike ? '1px' : 'clamp(1px, 0.2vw, 3px)',
                whiteSpace: 'nowrap',
              }}
            >
              ICU — FLOOR 3
            </div>
          </div>

          <div
            style={{
              justifySelf: 'center',
              alignSelf: 'start',
              paddingTop: 4,
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleSignOut()
              }}
              style={getHeaderButtonStyle(isMobileLike)}
            >
              SIGN OUT
            </button>
          </div>

          <div
            style={{
              justifySelf: 'end',
              textAlign: 'right',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: isMobileLike ? '24px' : 'clamp(24px, 4vw, 56px)',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                lineHeight: 1.05,
              }}
            >
              {new Date(nowTick).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </div>

            <div
              style={{
                color: '#8DA2C0',
                fontSize: isMobileLike ? '11px' : 'clamp(10px, 1.1vw, 18px)',
                letterSpacing: isMobileLike ? '1px' : 'clamp(1px, 0.15vw, 2px)',
                whiteSpace: 'nowrap',
              }}
            >
              {new Date(nowTick)
                .toLocaleDateString([], {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                })
                .toUpperCase()}
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDisplayMode('wall')
                }}
                style={getModeButtonStyle(isWallMode, isMobileLike)}
              >
                WALL DISPLAY
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDisplayMode('nurse')
                }}
                style={getModeButtonStyle(isNurseMode, isMobileLike)}
              >
                NURSE DISPLAY
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid #1F2A44',
            paddingTop: isMobileLike ? '12px' : 'clamp(16px, 2vw, 28px)',
            minHeight: 0,
            display: 'grid',
            gridTemplateRows: errorMsg
              ? 'auto minmax(0, 1fr)'
              : 'minmax(0, 1fr)',
            gap: '12px',
          }}
        >
          {errorMsg && <div style={{ color: '#ff6b6b' }}>{errorMsg}</div>}

          {isWallMode && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: isMobileLike
                  ? 'repeat(2, minmax(180px, 1fr))'
                  : 'repeat(2, minmax(280px, 1fr))',
                gap: gridGap,
                minHeight: 0,
              }}
            >
              {beds.slice(0, 4).map((bed) => {
                const minutes = getMinutesInState(bed.state_updated_at)
                const styles = getStateStyles(bed.care_states?.color)

                return (
                  <div
                    key={bed.id}
                    style={{
                      background: '#0d1730',
                      border: '1px solid #1D2A4A',
                      borderRadius: isMobileLike ? 16 : 'clamp(16px, 1.5vw, 28px)',
                      padding: cardPadding,
                      position: 'relative',
                      overflow: 'hidden',
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: '#8DA2C0',
                          fontSize: isMobileLike ? '12px' : 'clamp(12px, 1.2vw, 20px)',
                          letterSpacing: isMobileLike ? '1px' : 'clamp(1px, 0.25vw, 4px)',
                          marginBottom: isMobileLike ? '10px' : 'clamp(10px, 1.5vw, 24px)',
                          fontWeight: 600,
                        }}
                      >
                        BED {String(bed.bed_number).padStart(2, '0')}
                      </div>

                      <div
                        style={{
                          background: styles.background,
                          color: styles.text,
                          borderRadius: isMobileLike ? 12 : 'clamp(12px, 1.2vw, 20px)',
                          padding: isMobileLike
                            ? '14px 10px'
                            : 'clamp(14px, 1.8vw, 28px) clamp(12px, 1.6vw, 24px)',
                          fontSize: isMobileLike ? '15px' : 'clamp(14px, 1.2vw, 22px)',
                          fontWeight: 700,
                          textAlign: 'center',
                          marginBottom: isMobileLike ? '12px' : 'clamp(14px, 2vw, 28px)',
                          lineHeight: 1.15,
                          wordBreak: 'break-word',
                        }}
                      >
                        {bed.care_states?.display_name || 'NO STATE'}
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          color: '#5E7393',
                          fontSize: isMobileLike ? '10px' : 'clamp(10px, 0.8vw, 15px)',
                          letterSpacing: isMobileLike ? '1px' : 'clamp(1px, 0.2vw, 3px)',
                          marginBottom: isMobileLike ? '6px' : 'clamp(6px, 0.8vw, 12px)',
                        }}
                      >
                        TIME IN STATE
                      </div>

                      <div
                        style={{
                          fontSize: isMobileLike ? '24px' : 'clamp(22px, 2.4vw, 40px)',
                          fontWeight: 700,
                          color: getTimerColor(minutes),
                          lineHeight: 1.05,
                        }}
                      >
                        {getFormattedTimeInState(bed.state_updated_at)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {isNurseMode && selectedBedData && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobileLike ? '1fr' : 'minmax(0, 1fr) 240px',
                gap: isMobileLike ? 16 : 24,
                alignItems: 'start',
              }}
            >
              <div
                style={{
                  background: '#07111f',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    marginBottom: isMobileLike ? 16 : 22,
                  }}
                >
                  <div
                    style={{
                      fontSize: isMobileLike ? 28 : 'clamp(30px, 3vw, 44px)',
                      fontWeight: 700,
                      lineHeight: 1.05,
                      marginBottom: 12,
                    }}
                  >
                    Update Bed Status
                  </div>

                  <div
                    style={{
                      color: '#8DA2C0',
                      fontSize: isMobileLike ? 14 : 18,
                      letterSpacing: isMobileLike ? 2 : 3,
                      whiteSpace: 'normal',
                    }}
                  >
                    ICU — FLOOR 3 — CARE CELL A
                  </div>
                </div>

                <div
                  style={{
                    borderTop: '1px solid #1F2A44',
                    paddingTop: isMobileLike ? 16 : 24,
                    display: 'grid',
                    gap: isMobileLike ? 18 : 26,
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: '#5E7393',
                        fontSize: isMobileLike ? 12 : 14,
                        letterSpacing: isMobileLike ? 1.5 : 2.5,
                        fontWeight: 700,
                        marginBottom: 14,
                      }}
                    >
                      SELECT BED
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                        gap: isMobileLike ? 10 : 14,
                      }}
                    >
                      {beds.slice(0, 4).map((bed) => {
                        const active = selectedBedData?.id === bed.id

                        return (
                          <button
                            key={bed.id}
                            onClick={() => setSelectedBed(bed.id)}
                            style={{
                              height: isMobileLike ? 64 : 76,
                              borderRadius: 20,
                              border: active
                                ? '1px solid #E5E7EB'
                                : '1px solid #1D2A4A',
                              background: active ? '#E5E7EB' : '#17233C',
                              color: active ? '#111827' : '#8DA2C0',
                              fontSize: isMobileLike ? 24 : 34,
                              fontWeight: 700,
                              letterSpacing: isMobileLike ? 2 : 3,
                              cursor: 'pointer',
                            }}
                          >
                            {String(bed.bed_number).padStart(2, '0')}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid #1F2A44',
                      paddingTop: isMobileLike ? 18 : 26,
                    }}
                  >
                    <div
                      style={{
                        background: '#0d1730',
                        border: '1px solid #1D2A4A',
                        borderRadius: isMobileLike ? 18 : 24,
                        padding: isMobileLike ? 18 : 22,
                      }}
                    >
                      <div
                        style={{
                          color: '#5E7393',
                          fontSize: isMobileLike ? 12 : 14,
                          letterSpacing: isMobileLike ? 1.5 : 2.5,
                          fontWeight: 700,
                          marginBottom: 16,
                        }}
                      >
                        CURRENT STATUS
                      </div>

                      <div
                        style={{
                          color: getStateStyles(selectedBedData.care_states?.color).text,
                          fontSize: isMobileLike ? 28 : 'clamp(28px, 3vw, 46px)',
                          fontWeight: 700,
                          lineHeight: 1.05,
                          marginBottom: 18,
                          wordBreak: 'break-word',
                        }}
                      >
                        {selectedBedData.care_states?.display_name || 'NO STATE'}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              color: '#5E7393',
                              fontSize: isMobileLike ? 11 : 12,
                              letterSpacing: 1.5,
                              fontWeight: 700,
                              marginBottom: 6,
                            }}
                          >
                            TIME IN STATE
                          </div>

                          <div
                            style={{
                              fontSize: isMobileLike ? 24 : 34,
                              fontWeight: 700,
                              color: getTimerColor(
                                getMinutesInState(selectedBedData.state_updated_at)
                              ),
                              lineHeight: 1.05,
                            }}
                          >
                            {getFormattedTimeInState(selectedBedData.state_updated_at)}
                          </div>
                        </div>

                        <div
                          style={{
                            color: '#8DA2C0',
                            fontSize: isMobileLike ? 12 : 13,
                            letterSpacing: 1.5,
                            fontWeight: 700,
                            padding: '8px 12px',
                            borderRadius: 999,
                            border: '1px solid #334155',
                            background: '#111827',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          BED {String(selectedBedData.bed_number).padStart(2, '0')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid #1F2A44',
                      paddingTop: isMobileLike ? 18 : 26,
                    }}
                  >
                    <div
                      style={{
                        color: '#5E7393',
                        fontSize: isMobileLike ? 12 : 14,
                        letterSpacing: isMobileLike ? 1.5 : 2.5,
                        fontWeight: 700,
                        marginBottom: 14,
                      }}
                    >
                      UPDATE TO...
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gap: isMobileLike ? 10 : 14,
                      }}
                    >
                      {states.map((state) => {
                        const stateStyles = getStateStyles(state.color)
                        const isCurrent = selectedBedData.state_id === state.id

                        return (
                          <button
                            key={state.id}
                            onClick={() => updateBedState(selectedBedData.id, state.id)}
                            style={{
                              width: '100%',
                              minHeight: isMobileLike ? 58 : 74,
                              borderRadius: isMobileLike ? 16 : 22,
                              border: isCurrent
                                ? '2px solid #E5E7EB'
                                : '1px solid #334155',
                              background: stateStyles.background,
                              color: stateStyles.text,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 14,
                              padding: isMobileLike ? '14px 16px' : '18px 22px',
                              textAlign: 'left',
                              boxSizing: 'border-box',
                            }}
                          >
                            <span
                              style={{
                                fontSize: isMobileLike ? 14 : 18,
                                fontWeight: 700,
                                lineHeight: 1.15,
                                wordBreak: 'break-word',
                              }}
                            >
                              {state.display_name}
                            </span>

                            {isCurrent && (
                              <span
                                style={{
                                  flexShrink: 0,
                                  padding: isMobileLike ? '7px 10px' : '8px 12px',
                                  borderRadius: 999,
                                  background: 'rgba(255,255,255,0.12)',
                                  color: '#E5E7EB',
                                  fontSize: isMobileLike ? 10 : 12,
                                  fontWeight: 700,
                                  letterSpacing: 1,
                                }}
                              >
                                CURRENT
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: '#0d1730',
                  border: '1px solid #1D2A4A',
                  borderRadius: 24,
                  padding: isMobileLike ? 18 : 22,
                  height: 'fit-content',
                }}
              >
                <div
                  style={{
                    color: '#8DA2C0',
                    fontSize: isMobileLike ? 13 : 14,
                    letterSpacing: isMobileLike ? 2 : 2.5,
                    fontWeight: 700,
                    marginBottom: 16,
                  }}
                >
                  TIMER STATES
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      color: '#CBD5E1',
                      fontSize: isMobileLike ? 14 : 16,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: '#E5E7EB',
                        flexShrink: 0,
                      }}
                    />
                    <span>{'< 60 minutes'}</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      color: '#CBD5E1',
                      fontSize: isMobileLike ? 14 : 16,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: '#f5b000',
                        flexShrink: 0,
                      }}
                    />
                    <span>60-89 minutes</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      color: '#CBD5E1',
                      fontSize: isMobileLike ? 14 : 16,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: '#ff4d4f',
                        flexShrink: 0,
                      }}
                    />
                    <span>90+ minutes</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}