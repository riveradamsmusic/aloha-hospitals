'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import LoginScreen from './components/LoginScreen'
import ScopeSelector from './components/ScopeSelector'
import WallDisplay from './components/WallDisplay'
import NurseDisplay from './components/NurseDisplay'

// ======================
// HELPERS
// ======================

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

function getTimerColor() {
  return '#F8FAFC'
}

function getWallHighlightStyles(minutes) {
  if (minutes >= 60) {
    return {
      borderColor: '#F9A8D4',
      boxShadow: '0 0 0 2px rgba(249, 168, 212, 0.34)',
    }
  }

  if (minutes >= 30) {
    return {
      borderColor: '#FACC15',
      boxShadow: '0 0 0 2px rgba(250, 204, 21, 0.28)',
    }
  }

  return {
    borderColor: '#1D2A4A',
    boxShadow: 'none',
  }
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
      care_cell_id: row.care_cell_id,
      care_states: normalizedState,
    }
  })
}

function getModeButtonStyle(active, isMobileLike) {
  return {
    width: isMobileLike ? 118 : 140,
    height: isMobileLike ? 34 : 40,
    borderRadius: 999,
    border: active ? '1px solid #3B82F6' : '1px solid #334155',
    background: active ? '#123A67' : '#111827',
    color: active ? '#66B2FF' : '#CBD5E1',
    fontSize: isMobileLike ? 10 : 12,
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
    width: isMobileLike ? 108 : 128,
    height: isMobileLike ? 34 : 40,
    borderRadius: 999,
    border: '1px solid #475569',
    background: '#111827',
    color: '#E2E8F0',
    fontSize: isMobileLike ? 10 : 12,
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

// ======================
// PAGE
// ======================

export default function Home() {
  // ======================
  // STATE
  // ======================

  const [beds, setBeds] = useState([])
  const [states, setStates] = useState([])
  const [selectedBed, setSelectedBed] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [nowTick, setNowTick] = useState(Date.now())
  const [mounted, setMounted] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(1440)
  const [displayMode, setDisplayMode] = useState('wall')

  const [authMode, setAuthMode] = useState('demo')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionType, setSessionType] = useState(null)

  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [staffEmail, setStaffEmail] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const [currentProfile, setCurrentProfile] = useState(null)

  const [currentHospitalId, setCurrentHospitalId] = useState(null)
  const [currentHospitalName, setCurrentHospitalName] = useState('')
  const [currentUnitId, setCurrentUnitId] = useState(null)
  const [currentUnitName, setCurrentUnitName] = useState('')
  const [currentCareCellId, setCurrentCareCellId] = useState(null)
  const [currentCareCellName, setCurrentCareCellName] = useState('')

  const [availableUnits, setAvailableUnits] = useState([])
  const [availableCareCells, setAvailableCareCells] = useState([])
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [selectedCareCellId, setSelectedCareCellId] = useState('')
  const [hasSelectedScope, setHasSelectedScope] = useState(false)

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

  // ======================
  // DATA FETCHING
  // ======================

  async function fetchBeds(careCellId = currentCareCellId) {
    if (!careCellId) return

    const { data, error } = await supabase
      .from('beds')
      .select(`
        id,
        bed_number,
        state_updated_at,
        state_id,
        care_cell_id,
        care_states (
          id,
          name,
          display_name,
          color,
          priority,
          care_cell_id
        )
      `)
      .eq('care_cell_id', careCellId)
      .order('bed_number', { ascending: true })

    if (error) {
      console.error(error)
      setErrorMsg(error.message)
      return
    }

    const normalized = normalizeBeds(data || [])
    setBeds(normalized)

    setSelectedBed((currentSelectedBed) => {
      if (
        currentSelectedBed &&
        normalized.some((bed) => bed.id === currentSelectedBed)
      ) {
        return currentSelectedBed
      }
      return normalized[0]?.id || null
    })
  }

  async function fetchStates(careCellId = currentCareCellId) {
    if (!careCellId) return

    const { data, error } = await supabase
      .from('care_states')
      .select('*')
      .eq('care_cell_id', careCellId)
      .order('priority', { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    const filtered = (data || []).filter((state) =>
      state.is_active === undefined || state.is_active === null
        ? true
        : state.is_active === true
    )

    setStates(filtered)
  }

  async function loadDemoScope(username = 'Hospital 1', password = 'demo') {
    const { data: loginRow, error: loginRowError } = await supabase
      .from('demo_logins')
      .select(`
        username,
        hospital_id,
        unit_id,
        care_cell_id,
        hospitals ( id, name, code ),
        units ( id, name, code ),
        care_cells ( id, name, code )
      `)
      .eq('username', username)
      .eq('password', password)
      .single()

    if (loginRowError || !loginRow) {
      throw new Error('Demo login not found')
    }

    setCurrentHospitalId(loginRow.hospital_id)
    setCurrentHospitalName(loginRow.hospitals?.name || '')
    setCurrentUnitId(loginRow.unit_id)
    setCurrentUnitName(loginRow.units?.name || '')
    setCurrentCareCellId(loginRow.care_cell_id)
    setCurrentCareCellName(loginRow.care_cells?.name || '')
    setHasSelectedScope(true)

    return loginRow
  }

  async function loadProfileFromSession(user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('Profile not found')
    }

    setCurrentProfile(profile)
    setCurrentHospitalId(profile.hospital_id || null)
    setCurrentUnitId(profile.unit_id || null)
    setCurrentCareCellId(profile.care_cell_id || null)

    if (profile.hospital_id) {
      const { data: hospital } = await supabase
        .from('hospitals')
        .select('id, name')
        .eq('id', profile.hospital_id)
        .single()

      setCurrentHospitalName(hospital?.name || '')
    }

    return profile
  }

  async function loadUnitsForProfile(profile) {
    if (!profile?.hospital_id) return []

    let query = supabase
      .from('units')
      .select('id, name, code, hospital_id')
      .eq('hospital_id', profile.hospital_id)
      .order('name', { ascending: true })

    if (profile.role === 'unit_user' && profile.unit_id) {
      query = query.eq('id', profile.unit_id)
    }

    const { data, error } = await query

    if (error) {
      console.error(error)
      throw new Error('Could not load units')
    }

    setAvailableUnits(data || [])
    return data || []
  }

  async function loadCareCellsForUnit(unitId) {
    if (!unitId) {
      setAvailableCareCells([])
      return []
    }

    const { data, error } = await supabase
      .from('care_cells')
      .select('id, name, code, unit_id')
      .eq('unit_id', unitId)
      .order('name', { ascending: true })

    if (error) {
      console.error(error)
      throw new Error('Could not load care cells')
    }

    setAvailableCareCells(data || [])
    return data || []
  }

  // ======================
  // AUTH / SESSION
  // ======================

  useEffect(() => {
    setMounted(true)
    setViewportWidth(window.innerWidth)

    async function restoreSession() {
      try {
        const savedDemoAuth = window.localStorage.getItem('carecell_demo_auth')
        const savedDemoUsername = window.localStorage.getItem('carecell_demo_username')

        if (savedDemoAuth === 'true' && savedDemoUsername) {
          setAuthMode('demo')
          setSessionType('demo')
          await loadDemoScope(savedDemoUsername, 'demo')
          setIsAuthenticated(true)
          setLoginError('')
          return
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          setAuthMode('staff')
          setSessionType('staff')
          setIsAuthenticated(true)

          const profile = await loadProfileFromSession(session.user)
          const units = await loadUnitsForProfile(profile)

          if (profile.role === 'wall_display' && profile.care_cell_id) {
            const unitIdToUse = profile.unit_id || ''
            setSelectedUnitId(unitIdToUse)
            await loadCareCellsForUnit(unitIdToUse)
            setCurrentUnitId(profile.unit_id || null)
            setCurrentCareCellId(profile.care_cell_id)
            setHasSelectedScope(true)
            return
          }

          const savedScopeRaw = window.localStorage.getItem('carecell_staff_scope')
          const savedScope = savedScopeRaw ? JSON.parse(savedScopeRaw) : null

          if (profile.role === 'unit_user' && profile.unit_id) {
            setSelectedUnitId(profile.unit_id)
            const careCells = await loadCareCellsForUnit(profile.unit_id)

            let careCellIdToUse = profile.care_cell_id || savedScope?.careCellId || ''
            if (!careCellIdToUse && careCells[0]) {
              careCellIdToUse = careCells[0].id
            }

            setSelectedCareCellId(careCellIdToUse)

            if (careCellIdToUse) {
              const unit = units.find((item) => item.id === profile.unit_id)
              const careCell = careCells.find((item) => item.id === careCellIdToUse)

              setCurrentUnitName(unit?.name || '')
              setCurrentCareCellName(careCell?.name || '')
              setCurrentUnitId(profile.unit_id)
              setCurrentCareCellId(careCellIdToUse)
              setHasSelectedScope(true)
            }

            return
          }

          if (savedScope?.unitId) {
            setSelectedUnitId(savedScope.unitId)
            const careCells = await loadCareCellsForUnit(savedScope.unitId)
            setSelectedCareCellId(savedScope.careCellId || '')

            if (savedScope.careCellId) {
              const unit = units.find((item) => item.id === savedScope.unitId)
              const careCell = careCells.find((item) => item.id === savedScope.careCellId)

              if (unit && careCell) {
                setCurrentUnitName(unit.name)
                setCurrentCareCellName(careCell.name)
                setCurrentUnitId(unit.id)
                setCurrentCareCellId(careCell.id)
                setHasSelectedScope(true)
              }
            }
          }
        }
      } catch (error) {
        console.error(error)
      }
    }

    restoreSession()

    const handleResize = () => {
      setViewportWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !hasSelectedScope || !currentCareCellId) return

    fetchBeds(currentCareCellId)
    fetchStates(currentCareCellId)

    const timer = setInterval(() => {
      setNowTick(Date.now())
    }, 5000)

    const channel = supabase
      .channel(`beds-realtime-${currentCareCellId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'beds',
        },
        () => {
          fetchBeds(currentCareCellId)
        }
      )
      .subscribe()

    return () => {
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [isAuthenticated, hasSelectedScope, currentCareCellId])

  async function handleDemoLogin(e) {
    e.preventDefault()

    try {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }

      await loadDemoScope(loginUsername, loginPassword)

      setSessionType('demo')
      setIsAuthenticated(true)
      setLoginError('')
      window.localStorage.setItem('carecell_demo_auth', 'true')
      window.localStorage.setItem('carecell_demo_username', loginUsername)
      setLoginPassword('')
    } catch (error) {
      console.error(error)
      setLoginError('Invalid username or password')
    }
  }

  async function handleStaffLogin(e) {
    e.preventDefault()

    try {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: staffEmail,
        password: staffPassword,
      })

      if (error || !data.user) {
        throw new Error(error?.message || 'Sign in failed')
      }

      const profile = await loadProfileFromSession(data.user)
      const units = await loadUnitsForProfile(profile)

      setSessionType('staff')
      setIsAuthenticated(true)
      setLoginError('')
      setHasSelectedScope(false)
      setBeds([])
      setStates([])
      window.localStorage.removeItem('carecell_demo_auth')
      window.localStorage.removeItem('carecell_demo_username')

      if (profile.role === 'unit_user' && profile.unit_id) {
        setSelectedUnitId(profile.unit_id)
        const careCells = await loadCareCellsForUnit(profile.unit_id)

        let careCellIdToUse = profile.care_cell_id || ''
        if (!careCellIdToUse && careCells[0]) {
          careCellIdToUse = careCells[0].id
        }

        if (careCellIdToUse) {
          setSelectedCareCellId(careCellIdToUse)
          const unit = units.find((item) => item.id === profile.unit_id)
          const careCell = careCells.find((item) => item.id === careCellIdToUse)

          setCurrentUnitName(unit?.name || '')
          setCurrentCareCellName(careCell?.name || '')
          setCurrentUnitId(profile.unit_id)
          setCurrentCareCellId(careCellIdToUse)
          setHasSelectedScope(true)

          window.localStorage.setItem(
            'carecell_staff_scope',
            JSON.stringify({
              unitId: profile.unit_id,
              careCellId: careCellIdToUse,
            })
          )
        }
      }

      if (profile.role === 'wall_display' && profile.unit_id && profile.care_cell_id) {
        setSelectedUnitId(profile.unit_id)
        await loadCareCellsForUnit(profile.unit_id)
        setSelectedCareCellId(profile.care_cell_id)
        setCurrentUnitId(profile.unit_id)
        setCurrentCareCellId(profile.care_cell_id)
        setHasSelectedScope(true)

        window.localStorage.setItem(
          'carecell_staff_scope',
          JSON.stringify({
            unitId: profile.unit_id,
            careCellId: profile.care_cell_id,
          })
        )
      }

      setStaffPassword('')
    } catch (error) {
      console.error(error)
      setLoginError('Invalid email or password')
    }
  }

  async function handleOpenSelectedCareCell() {
    try {
      if (!selectedUnitId) {
        setLoginError('Please select a unit')
        return
      }

      const careCells = availableCareCells.length
        ? availableCareCells
        : await loadCareCellsForUnit(selectedUnitId)

      if (!selectedCareCellId) {
        setLoginError('Please select a care cell')
        return
      }

      const unit = availableUnits.find((item) => item.id === selectedUnitId)
      const careCell = careCells.find((item) => item.id === selectedCareCellId)

      setCurrentUnitId(selectedUnitId)
      setCurrentUnitName(unit?.name || '')
      setCurrentCareCellId(selectedCareCellId)
      setCurrentCareCellName(careCell?.name || '')
      setHasSelectedScope(true)
      setLoginError('')

      window.localStorage.setItem(
        'carecell_staff_scope',
        JSON.stringify({
          unitId: selectedUnitId,
          careCellId: selectedCareCellId,
        })
      )
    } catch (error) {
      console.error(error)
      setLoginError('Could not open selected care cell')
    }
  }

  async function handleSignOut() {
    if (sessionType === 'staff') {
      await supabase.auth.signOut()
    }

    setIsAuthenticated(false)
    setSessionType(null)
    setCurrentProfile(null)
    setSelectedBed(null)
    setLoginUsername('')
    setLoginPassword('')
    setStaffEmail('')
    setStaffPassword('')
    setLoginError('')
    setCurrentHospitalId(null)
    setCurrentHospitalName('')
    setCurrentUnitId(null)
    setCurrentUnitName('')
    setCurrentCareCellId(null)
    setCurrentCareCellName('')
    setSelectedUnitId('')
    setSelectedCareCellId('')
    setAvailableUnits([])
    setAvailableCareCells([])
    setHasSelectedScope(false)
    setBeds([])
    setStates([])

    window.localStorage.removeItem('carecell_demo_auth')
    window.localStorage.removeItem('carecell_demo_username')
    window.localStorage.removeItem('carecell_staff_scope')
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

  // ======================
  // LAYOUT VALUES
  // ======================

  const mainPadding = isMobileLike ? '12px' : 'clamp(24px, 3vw, 40px)'
  const outerGap = isMobileLike ? '12px' : 'clamp(18px, 2vw, 28px)'
  const gridGap = isMobileLike ? '10px' : 'clamp(16px, 2vw, 28px)'
  const cardPadding = isMobileLike ? '10px' : 'clamp(12px, 1.4vw, 22px)'

  // ======================
  // EARLY RETURNS
  // ======================

  if (!mounted) {
    return null
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        isMobileLike={isMobileLike}
        authMode={authMode}
        setAuthMode={setAuthMode}
        loginUsername={loginUsername}
        setLoginUsername={setLoginUsername}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        staffEmail={staffEmail}
        setStaffEmail={setStaffEmail}
        staffPassword={staffPassword}
        setStaffPassword={setStaffPassword}
        loginError={loginError}
        handleDemoLogin={handleDemoLogin}
        handleStaffLogin={handleStaffLogin}
      />
    )
  }

  if (sessionType === 'staff' && !hasSelectedScope) {
    return (
      <ScopeSelector
        isMobileLike={isMobileLike}
        currentHospitalName={currentHospitalName}
        availableUnits={availableUnits}
        availableCareCells={availableCareCells}
        selectedUnitId={selectedUnitId}
        setSelectedUnitId={setSelectedUnitId}
        selectedCareCellId={selectedCareCellId}
        setSelectedCareCellId={setSelectedCareCellId}
        loginError={loginError}
        loadCareCellsForUnit={loadCareCellsForUnit}
        handleOpenSelectedCareCell={handleOpenSelectedCareCell}
        handleSignOut={handleSignOut}
      />
    )
  }

  // ======================
  // MAIN UI
  // ======================

  return (
    <main
      style={{
        height: isWallMode && !isMobileLike ? '100dvh' : 'auto',
        minHeight: '100dvh',
        width: '100vw',
        background: '#07111f',
        color: 'white',
        padding: mainPadding,
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        overflowY: isWallMode && !isMobileLike ? 'hidden' : 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1800,
          height: isWallMode && !isMobileLike ? '100%' : 'auto',
          margin: '0 auto',
          display: 'grid',
          gridTemplateRows: isWallMode && !isMobileLike
            ? 'auto auto minmax(0, 1fr)'
            : 'auto auto auto',
          gap: outerGap,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            alignItems: 'start',
            gap: '12px',
          }}
        >
          <div style={{ minWidth: 0, justifySelf: 'start' }}>
            <div
              style={{
                fontSize: isMobileLike ? '24px' : 'clamp(28px, 4vw, 56px)',
                fontWeight: 700,
                letterSpacing: isMobileLike ? '1.5px' : 'clamp(2px, 0.35vw, 6px)',
                lineHeight: 1.05,
                whiteSpace: 'nowrap',
              }}
            >
              {(currentCareCellName || 'CARE CELL').toUpperCase()}
            </div>

            <div
              style={{
                width: isMobileLike ? 40 : 'clamp(44px, 5vw, 70px)',
                height: 4,
                background: '#3B82F6',
                marginTop: isMobileLike ? 8 : 'clamp(10px, 1.5vw, 18px)',
                marginBottom: isMobileLike ? 8 : 'clamp(10px, 1.5vw, 18px)',
                borderRadius: 999,
              }}
            />

            <div
              style={{
                fontSize: isMobileLike ? '12px' : 'clamp(12px, 1.6vw, 24px)',
                color: '#8DA2C0',
                letterSpacing: isMobileLike ? '0.8px' : 'clamp(1px, 0.2vw, 3px)',
                whiteSpace: 'nowrap',
              }}
            >
              {currentUnitName
                ? `${currentUnitName.toUpperCase()} — ${currentHospitalName.toUpperCase()}`
                : 'UNIT — HOSPITAL'}
            </div>
          </div>

          <div
            style={{
              justifySelf: 'end',
              textAlign: 'right',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: isMobileLike ? 6 : 10,
            }}
          >
            <div
              style={{
                fontSize: isMobileLike ? '20px' : 'clamp(24px, 4vw, 56px)',
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
                fontSize: isMobileLike ? '10px' : 'clamp(10px, 1.1vw, 18px)',
                letterSpacing: isMobileLike ? '0.8px' : 'clamp(1px, 0.15vw, 2px)',
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
                flexDirection: isMobileLike ? 'column' : 'row',
                alignItems: 'flex-end',
                gap: 8,
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
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: isMobileLike ? 2 : 0,
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          {sessionType === 'staff' && (
            <button
              onClick={() => {
                setHasSelectedScope(false)
                setSelectedBed(null)
              }}
              style={getHeaderButtonStyle(isMobileLike)}
            >
              DISPLAY
            </button>
          )}

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
            borderTop: '1px solid #1F2A44',
            paddingTop: isMobileLike ? '10px' : 'clamp(14px, 1.6vw, 22px)',
            minHeight: 0,
            display: 'grid',
            gridTemplateRows: errorMsg
              ? 'auto minmax(0, 1fr)'
              : 'minmax(0, 1fr)',
            gap: '10px',
          }}
        >
          {errorMsg && <div style={{ color: '#ff6b6b' }}>{errorMsg}</div>}

          {isWallMode && (
            <WallDisplay
              beds={beds}
              isMobileLike={isMobileLike}
              gridGap={gridGap}
              cardPadding={cardPadding}
              getMinutesInState={getMinutesInState}
              getStateStyles={getStateStyles}
              getWallHighlightStyles={getWallHighlightStyles}
              getFormattedTimeInState={getFormattedTimeInState}
              getTimerColor={getTimerColor}
            />
          )}

          {isNurseMode && selectedBedData && (
            <NurseDisplay
              beds={beds}
              states={states}
              selectedBedData={selectedBedData}
              setSelectedBed={setSelectedBed}
              updateBedState={updateBedState}
              isMobileLike={isMobileLike}
              currentUnitName={currentUnitName}
              currentHospitalName={currentHospitalName}
              currentCareCellName={currentCareCellName}
              getStateStyles={getStateStyles}
              getFormattedTimeInState={getFormattedTimeInState}
              getTimerColor={getTimerColor}
            />
          )}
        </div>
      </div>
    </main>
  )
}