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

  const selectedBedData = useMemo(
    () => beds.find((bed) => bed.id === selectedBed) || null,
    [beds, selectedBed]
  )

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

    setBeds(normalizeBeds(data || []))
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
    setSelectedBed(null)
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
        height: '100dvh',
        width: '100vw',
        background: '#07111f',
        color: 'white',
        padding: mainPadding,
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        overflowY: isMobileLike ? 'auto' : 'hidden',
      }}
      onClick={() => setSelectedBed(null)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1800,
          height: isMobileLike ? 'auto' : '100%',
          minHeight: isMobileLike ? '100%' : 0,
          margin: '0 auto',
          display: 'grid',
          gridTemplateRows: isMobileLike ? 'auto auto' : 'auto minmax(0, 1fr)',
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
                  setSelectedBed(null)
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

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: isMobileLike
                ? 'repeat(2, minmax(180px, 1fr))'
                : 'repeat(2, minmax(0, 1fr))',
              gap: gridGap,
              minHeight: 0,
              height: isMobileLike ? 'auto' : '100%',
            }}
          >
            {beds.slice(0, 4).map((bed) => {
              const minutes = getMinutesInState(bed.state_updated_at)
              const styles = getStateStyles(bed.care_states?.color)

              return (
                <div
                  key={bed.id}
                  onClick={(e) => {
                    if (!isNurseMode) return
                    e.stopPropagation()
                    setSelectedBed(selectedBed === bed.id ? null : bed.id)
                  }}
                  style={{
                    background: '#0d1730',
                    border:
                      isNurseMode && selectedBed === bed.id
                        ? '1px solid #3B82F6'
                        : '1px solid #1D2A4A',
                    borderRadius: isMobileLike ? 16 : 'clamp(16px, 1.5vw, 28px)',
                    padding: cardPadding,
                    position: 'relative',
                    cursor: isNurseMode ? 'pointer' : 'default',
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
                        color:
                          minutes >= 90
                            ? '#ff4d4f'
                            : minutes >= 60
                            ? '#f5b000'
                            : '#f8fafc',
                        lineHeight: 1.05,
                      }}
                    >
                      {minutes >= 60
                        ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
                        : `${minutes}m`}
                    </div>
                  </div>

                  {!isMobileLike && isNurseMode && selectedBed === bed.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        left: 12,
                        right: 12,
                        bottom: 12,
                        background: '#111827',
                        border: '1px solid #374151',
                        borderRadius: 12,
                        padding: 8,
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 6,
                        zIndex: 10,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                      }}
                    >
                      {states.map((state) => {
                        const stateStyles = getStateStyles(state.color)

                        return (
                          <button
                            key={state.id}
                            onClick={() => updateBedState(bed.id, state.id)}
                            style={{
                              background: stateStyles.background,
                              color: stateStyles.text,
                              border: '1px solid #374151',
                              borderRadius: 10,
                              padding: '8px 10px',
                              cursor: 'pointer',
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: 0.4,
                              lineHeight: 1.1,
                              minHeight: 42,
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              overflowWrap: 'anywhere',
                              boxSizing: 'border-box',
                              width: '100%',
                              textAlign: 'center',
                            }}
                          >
                            {state.display_name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {isMobileLike && isNurseMode && selectedBedData && (
        <div
          onClick={() => setSelectedBed(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 12,
            boxSizing: 'border-box',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              background: '#111827',
              border: '1px solid #374151',
              borderRadius: 16,
              padding: 12,
              boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                color: '#8DA2C0',
                fontSize: 12,
                letterSpacing: 1,
                marginBottom: 10,
                fontWeight: 700,
                whiteSpace: 'normal',
                wordBreak: 'break-word',
              }}
            >
              BED {String(selectedBedData.bed_number).padStart(2, '0')} STATUS
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: 8,
                width: '100%',
              }}
            >
              {states.map((state) => {
                const stateStyles = getStateStyles(state.color)

                return (
                  <button
                    key={state.id}
                    onClick={() => updateBedState(selectedBedData.id, state.id)}
                    style={{
                      background: stateStyles.background,
                      color: stateStyles.text,
                      border: '1px solid #374151',
                      borderRadius: 10,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      lineHeight: 1.2,
                      minHeight: 42,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                      boxSizing: 'border-box',
                      width: '100%',
                      maxWidth: '100%',
                      textAlign: 'center',
                    }}
                  >
                    {state.display_name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}