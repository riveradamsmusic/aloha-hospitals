export default function ScopeSelector({
    isMobileLike,
    currentHospitalName,
    availableUnits,
    availableCareCells,
    selectedUnitId,
    setSelectedUnitId,
    selectedCareCellId,
    setSelectedCareCellId,
    loginError,
    loadCareCellsForUnit,
    handleOpenSelectedCareCell,
    handleSignOut,
  }) {
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
            maxWidth: 520,
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
            SELECT DISPLAY
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
              marginBottom: 20,
            }}
          >
            {currentHospitalName || 'HOSPITAL'}
          </div>
  
          <div
            style={{
              display: 'grid',
              gap: 14,
            }}
          >
            <div style={{ display: 'grid', gap: 10 }}>
              {availableUnits.map((unit) => {
                const active = selectedUnitId === unit.id
  
                return (
                  <button
                    key={unit.id}
                    onClick={async () => {
                      setSelectedUnitId(unit.id)
                      setSelectedCareCellId('')
                      await loadCareCellsForUnit(unit.id)
                    }}
                    style={{
                      height: 46,
                      borderRadius: 12,
                      border: active ? '1px solid #E5E7EB' : '1px solid #334155',
                      background: active ? '#E5E7EB' : '#0F172A',
                      color: active ? '#111827' : '#E2E8F0',
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: 1,
                      cursor: 'pointer',
                    }}
                  >
                    {unit.name}
                  </button>
                )
              })}
            </div>
  
            <div style={{ display: 'grid', gap: 10 }}>
              {availableCareCells.map((cell) => {
                const active = selectedCareCellId === cell.id
  
                return (
                  <button
                    key={cell.id}
                    onClick={() => {
                      setSelectedCareCellId(cell.id)
                    }}
                    style={{
                      height: 46,
                      borderRadius: 12,
                      border: active ? '1px solid #E5E7EB' : '1px solid #334155',
                      background: active ? '#E5E7EB' : '#0F172A',
                      color: active ? '#111827' : '#E2E8F0',
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: 1,
                      cursor: 'pointer',
                    }}
                  >
                    {cell.name}
                  </button>
                )
              })}
            </div>
  
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
              onClick={handleOpenSelectedCareCell}
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
              OPEN CARE CELL
            </button>
  
            <button
              onClick={handleSignOut}
              style={{
                height: 46,
                borderRadius: 12,
                border: '1px solid #475569',
                background: '#111827',
                color: '#E2E8F0',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1,
                cursor: 'pointer',
              }}
            >
              SIGN OUT
            </button>
          </div>
        </div>
      </main>
    )
  }