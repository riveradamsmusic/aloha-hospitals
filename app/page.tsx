'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type CareState = {
  id: string
  name: string
  display_name: string
  color: string
  priority: number
}

type Bed = {
  id: string
  bed_number: number
  state_updated_at: string
  state_id: string
  care_states?: CareState
}

function getMinutesInState(timestamp: string) {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  return Math.max(0, Math.floor((now - then) / 60000))
}

function getStateStyles(color?: string) {
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

export default function Home() {
  const [beds, setBeds] = useState<Bed[]>([])
  const [states, setStates] = useState<CareState[]>([])
  const [selectedBed, setSelectedBed] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [nowTick, setNowTick] = useState(Date.now())
  const [mounted, setMounted] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(1440)

  const isMobileLike = viewportWidth < 900

  useEffect(() => {
    setMounted(true)
    setViewportWidth(window.innerWidth)

    const handleResize = () => {
      setViewportWidth(window.innerWidth)
    }

    fetchBeds()
    fetchStates()

    const timer = setInterval(() => {
      setNowTick(Date.now())
    }, 5000)

    window.addEventListener('resize', handleResize)

    return () => {
      clearInterval(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

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

    setBeds((data as Bed[]) || [])
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

    setStates((data as CareState[]) || [])
  }

  async function updateBedState(bedId: string, stateId: string) {
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
          }}
        >
          <div style={{ minWidth: 0 }}>
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

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: isMobileLike ? '24px' : 'clamp(24px, 4vw, 56px)',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                lineHeight: 1.05,
              }}
            >
              {mounted
                ? new Date(nowTick).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })
                : '--:--'}
            </div>

            <div
              style={{
                color: '#8DA2C0',
                fontSize: isMobileLike ? '11px' : 'clamp(10px, 1.1vw, 18px)',
                letterSpacing: isMobileLike ? '1px' : 'clamp(1px, 0.15vw, 2px)',
                marginTop: 4,
                whiteSpace: 'nowrap',
              }}
            >
              {mounted
                ? new Date(nowTick)
                    .toLocaleDateString([], {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    })
                    .toUpperCase()
                : '--- -- ---'}
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
                    e.stopPropagation()
                    setSelectedBed(selectedBed === bed.id ? null : bed.id)
                  }}
                  style={{
                    background: '#0d1730',
                    border: '1px solid #1D2A4A',
                    borderRadius: isMobileLike ? 16 : 'clamp(16px, 1.5vw, 28px)',
                    padding: cardPadding,
                    position: 'relative',
                    cursor: 'pointer',
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
                        fontSize: isMobileLike ? '15px' : 'clamp(14px, 1.8vw, 28px)',
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
                        fontSize: isMobileLike ? '10px' : 'clamp(10px, 1vw, 18px)',
                        letterSpacing: isMobileLike ? '1px' : 'clamp(1px, 0.2vw, 3px)',
                        marginBottom: isMobileLike ? '6px' : 'clamp(6px, 0.8vw, 12px)',
                      }}
                    >
                      TIME IN STATE
                    </div>

                    <div
                      style={{
                        fontSize: isMobileLike ? '24px' : 'clamp(24px, 4vw, 54px)',
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

                  {selectedBed === bed.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        left: isMobileLike ? 8 : 12,
                        right: isMobileLike ? 8 : 12,
                        bottom: isMobileLike ? 8 : 12,
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
                              padding: isMobileLike ? '8px 6px' : '8px 10px',
                              cursor: 'pointer',
                              fontSize: isMobileLike ? 10 : 11,
                              fontWeight: 700,
                              letterSpacing: 0.4,
                              lineHeight: 1.1,
                              minHeight: isMobileLike ? 38 : 42,
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
    </main>
  )
}