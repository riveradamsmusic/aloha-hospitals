export default function NurseDisplay({
  beds,
  states,
  selectedBedData,
  setSelectedBed,
  updateBedState,
  isMobileLike,
  currentUnitName,
  currentHospitalName,
  currentCareCellName,
  getStateStyles,
  getFormattedTimeInState,
  getTimerColor,
  messageTemplates,
  activeMessage,
  sendMessageForBed,
}) {
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 820,
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: isMobileLike ? 12 : 14,
          alignItems: 'start',
        }}
      >
        <div style={{ background: '#07111f', minWidth: 0 }}>
          <div
            style={{
              marginBottom: isMobileLike ? 10 : 12,
            }}
          >
            <div
              style={{
                fontSize: isMobileLike ? 22 : 28,
                fontWeight: 700,
                lineHeight: 1.05,
                marginBottom: 6,
                textAlign: isMobileLike ? 'left' : 'center',
              }}
            >
              Update Bed Status
            </div>

            <div
              style={{
                color: '#8DA2C0',
                fontSize: isMobileLike ? 12 : 14,
                letterSpacing: isMobileLike ? 1.2 : 1.8,
                whiteSpace: 'normal',
                textAlign: isMobileLike ? 'left' : 'center',
              }}
            >
              {(currentUnitName || 'UNIT').toUpperCase()} — {(currentHospitalName || 'HOSPITAL').toUpperCase()} — {(currentCareCellName || 'CARE CELL').toUpperCase()}
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid #1F2A44',
              paddingTop: isMobileLike ? 12 : 14,
              display: 'grid',
              gap: isMobileLike ? 12 : 14,
            }}
          >
            <div>
              <div
                style={{
                  color: '#5E7393',
                  fontSize: isMobileLike ? 11 : 12,
                  letterSpacing: isMobileLike ? 1.2 : 1.8,
                  fontWeight: 700,
                  marginBottom: 8,
                  textAlign: isMobileLike ? 'left' : 'center',
                }}
              >
                SELECT BED
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: isMobileLike ? 8 : 10,
                }}
              >
                {beds.slice(0, 4).map((bed) => {
                  const active = selectedBedData?.id === bed.id

                  return (
                    <button
                      key={bed.id}
                      onClick={() => setSelectedBed(bed.id)}
                      style={{
                        height: isMobileLike ? 48 : 52,
                        borderRadius: 14,
                        border: active
                          ? '1px solid #E5E7EB'
                          : '1px solid #1D2A4A',
                        background: active ? '#E5E7EB' : '#17233C',
                        color: active ? '#111827' : '#8DA2C0',
                        fontSize: isMobileLike ? 18 : 22,
                        fontWeight: 700,
                        letterSpacing: 1.5,
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
                background: '#0d1730',
                border: '1px solid #1D2A4A',
                borderRadius: isMobileLike ? 14 : 18,
                padding: isMobileLike ? 12 : 14,
              }}
            >
              <div
                style={{
                  color: '#5E7393',
                  fontSize: isMobileLike ? 11 : 12,
                  letterSpacing: isMobileLike ? 1.2 : 1.8,
                  fontWeight: 700,
                  marginBottom: 8,
                  textAlign: isMobileLike ? 'left' : 'center',
                }}
              >
                CURRENT STATUS
              </div>

              <div
                style={{
                  color: getStateStyles(selectedBedData.care_states?.color).text,
                  fontSize: isMobileLike ? 20 : 26,
                  fontWeight: 700,
                  lineHeight: 1.05,
                  marginBottom: 10,
                  wordBreak: 'break-word',
                  textAlign: isMobileLike ? 'left' : 'center',
                }}
              >
                {selectedBedData.care_states?.display_name || 'NO STATE'}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div
                    style={{
                      color: '#5E7393',
                      fontSize: isMobileLike ? 10 : 11,
                      letterSpacing: 1.1,
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    TIME IN STATE
                  </div>

                  <div
                    style={{
                      fontSize: isMobileLike ? 18 : 22,
                      fontWeight: 700,
                      color: getTimerColor(),
                      lineHeight: 1.05,
                    }}
                  >
                    {getFormattedTimeInState(selectedBedData.state_updated_at)}
                  </div>
                </div>

                <div
                  style={{
                    color: '#8DA2C0',
                    fontSize: isMobileLike ? 10 : 11,
                    letterSpacing: 1.1,
                    fontWeight: 700,
                    padding: '5px 8px',
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

            <div
              style={{
                background: '#0d1730',
                border: '1px solid #1D2A4A',
                borderRadius: isMobileLike ? 14 : 18,
                padding: isMobileLike ? 12 : 14,
              }}
            >
              <div
                style={{
                  color: '#5E7393',
                  fontSize: isMobileLike ? 11 : 12,
                  letterSpacing: isMobileLike ? 1.2 : 1.8,
                  fontWeight: 700,
                  marginBottom: 8,
                  textAlign: isMobileLike ? 'left' : 'center',
                }}
              >
                ACTIVE SIGNAL
              </div>

              <div
                style={{
                  color: activeMessage ? '#F8FAFC' : '#8DA2C0',
                  fontSize: isMobileLike ? 13 : 14,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  textAlign: isMobileLike ? 'left' : 'center',
                }}
              >
                {activeMessage ? activeMessage.message_label : 'No active signal'}
              </div>
            </div>

            <div>
              <div
                style={{
                  color: '#5E7393',
                  fontSize: isMobileLike ? 11 : 12,
                  letterSpacing: isMobileLike ? 1.2 : 1.8,
                  fontWeight: 700,
                  marginBottom: 8,
                  textAlign: isMobileLike ? 'left' : 'center',
                }}
              >
                SEND SIGNAL
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: isMobileLike ? 8 : 9,
                }}
              >
                {messageTemplates.length === 0 ? (
                  <div style={{ color: '#ff6b6b', fontSize: 13 }}>
                    No message templates found for this Care Cell.
                  </div>
                ) : (
                  messageTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => sendMessageForBed(selectedBedData.id, template)}
                      style={{
                        width: '100%',
                        minHeight: isMobileLike ? 44 : 48,
                        borderRadius: isMobileLike ? 12 : 14,
                        border: '1px solid #334155',
                        background: '#111827',
                        color: '#E2E8F0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: isMobileLike ? '10px 12px' : '10px 14px',
                        textAlign: 'center',
                        boxSizing: 'border-box',
                        fontSize: isMobileLike ? 12 : 13,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        lineHeight: 1.15,
                      }}
                    >
                      {template.label}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div>
              <div
                style={{
                  color: '#5E7393',
                  fontSize: isMobileLike ? 11 : 12,
                  letterSpacing: isMobileLike ? 1.2 : 1.8,
                  fontWeight: 700,
                  marginBottom: 8,
                  textAlign: isMobileLike ? 'left' : 'center',
                }}
              >
                UPDATE TO...
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: isMobileLike ? 8 : 9,
                }}
              >
                {states.length === 0 ? (
                  <div style={{ color: '#ff6b6b', fontSize: 13 }}>
                    No care states found for this Care Cell.
                  </div>
                ) : (
                  states.map((state) => {
                    const stateStyles = getStateStyles(state.color)
                    const isCurrent = selectedBedData.state_id === state.id

                    return (
                      <button
                        key={state.id}
                        onClick={() =>
                          updateBedState(selectedBedData.id, state.id)
                        }
                        style={{
                          width: '100%',
                          minHeight: isMobileLike ? 46 : 50,
                          borderRadius: isMobileLike ? 12 : 14,
                          border: isCurrent
                            ? '2px solid #E5E7EB'
                            : '1px solid #334155',
                          background: stateStyles.background,
                          color: stateStyles.text,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          padding: isMobileLike ? '10px 12px' : '10px 14px',
                          textAlign: 'left',
                          boxSizing: 'border-box',
                        }}
                      >
                        <span
                          style={{
                            fontSize: isMobileLike ? 13 : 14,
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
                              padding: isMobileLike ? '4px 7px' : '5px 8px',
                              borderRadius: 999,
                              background: 'rgba(255,255,255,0.12)',
                              color: '#E5E7EB',
                              fontSize: isMobileLike ? 8 : 9,
                              fontWeight: 700,
                              letterSpacing: 0.7,
                            }}
                          >
                            CURRENT
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}