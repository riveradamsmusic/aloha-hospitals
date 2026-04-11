export default function WallDisplay({
  beds,
  isMobileLike,
  gridGap,
  cardPadding,
  getMinutesInState,
  getStateStyles,
  getWallHighlightStyles,
  getFormattedTimeInState,
  getTimerColor,
  getActiveMessageForBed,
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: isMobileLike
          ? 'repeat(2, minmax(0, 1fr))'
          : 'repeat(2, minmax(0, 1fr))',
        gap: gridGap,
        minHeight: 0,
        height: isMobileLike ? 'calc(100dvh - 230px)' : '100%',
        alignContent: 'stretch',
      }}
    >
      {beds.slice(0, 4).map((bed) => {
        const minutes = getMinutesInState(bed.state_updated_at)
        const styles = getStateStyles(bed.care_states?.color)
        const highlightStyles = getWallHighlightStyles(minutes)
        const activeMessage = getActiveMessageForBed(bed.id)

        return (
          <div
            key={bed.id}
            style={{
              background: '#0d1730',
              border: `1px solid ${highlightStyles.borderColor}`,
              boxShadow: highlightStyles.boxShadow,
              borderRadius: isMobileLike ? 16 : 'clamp(16px, 1.5vw, 28px)',
              padding: cardPadding,
              position: 'relative',
              overflow: 'hidden',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
            }}
          >
            <div
              style={{
                color: '#8DA2C0',
                fontSize: isMobileLike ? '12px' : 'clamp(12px, 1.1vw, 18px)',
                letterSpacing: isMobileLike ? '1px' : 'clamp(1px, 0.2vw, 4px)',
                marginBottom: isMobileLike ? '8px' : 'clamp(8px, 1vw, 18px)',
                fontWeight: 600,
              }}
            >
              BED {String(bed.bed_number).padStart(2, '0')}
            </div>

            <div
              style={{
                background: styles.background,
                color: styles.text,
                borderRadius: isMobileLike ? 12 : 'clamp(12px, 1vw, 18px)',
                padding: isMobileLike
                  ? '12px 10px'
                  : 'clamp(12px, 1.2vw, 20px) clamp(10px, 1.2vw, 18px)',
                fontSize: isMobileLike ? '15px' : 'clamp(14px, 1vw, 20px)',
                fontWeight: 700,
                textAlign: 'center',
                marginBottom: isMobileLike ? '10px' : 'clamp(10px, 1.2vw, 18px)',
                lineHeight: 1.12,
                wordBreak: 'break-word',
              }}
            >
              {bed.care_states?.display_name || 'NO STATE'}
            </div>

            {activeMessage && (
              <div
                style={{
                  marginBottom: isMobileLike ? '10px' : '12px',
                  padding: isMobileLike ? '8px 10px' : '10px 12px',
                  borderRadius: 12,
                  background: '#1f2937',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: isMobileLike ? 11 : 13,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  textAlign: 'center',
                }}
              >
                {activeMessage.message_label}
              </div>
            )}

            <div style={{ marginTop: 'auto' }}>
              <div
                style={{
                  color: '#5E7393',
                  fontSize: isMobileLike ? '10px' : 'clamp(10px, 0.7vw, 14px)',
                  letterSpacing: isMobileLike ? '1px' : 'clamp(1px, 0.15vw, 2px)',
                  marginBottom: isMobileLike ? '4px' : 'clamp(4px, 0.5vw, 8px)',
                }}
              >
                TIME IN STATE
              </div>

              <div
                style={{
                  fontSize: isMobileLike ? '22px' : 'clamp(20px, 2vw, 34px)',
                  fontWeight: 700,
                  color: getTimerColor(),
                  lineHeight: 1.02,
                }}
              >
                {getFormattedTimeInState(bed.state_updated_at)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}