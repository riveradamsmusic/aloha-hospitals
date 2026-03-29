export default function LoginScreen({
    isMobileLike,
    authMode,
    setAuthMode,
    loginUsername,
    setLoginUsername,
    loginPassword,
    setLoginPassword,
    staffEmail,
    setStaffEmail,
    staffPassword,
    setStaffPassword,
    loginError,
    handleDemoLogin,
    handleStaffLogin,
  }) {
    function getLoginModeButtonStyle(active) {
      return {
        flex: 1,
        height: 42,
        borderRadius: 12,
        border: active ? '1px solid #3B82F6' : '1px solid #334155',
        background: active ? '#123A67' : '#111827',
        color: active ? '#66B2FF' : '#CBD5E1',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.8,
        cursor: 'pointer',
      }
    }
  
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
            maxWidth: 440,
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
              display: 'flex',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <button
              onClick={() => setAuthMode('demo')}
              style={getLoginModeButtonStyle(authMode === 'demo')}
            >
              DEMO LOGIN
            </button>
  
            <button
              onClick={() => setAuthMode('staff')}
              style={getLoginModeButtonStyle(authMode === 'staff')}
            >
              STAFF LOGIN
            </button>
          </div>
  
          {authMode === 'demo' ? (
            <>
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
                onSubmit={handleDemoLogin}
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
                    fontSize: 16,
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
                    fontSize: 16,
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
            </>
          ) : (
            <>
              <div
                style={{
                  color: '#8DA2C0',
                  fontSize: 14,
                  letterSpacing: 1,
                  marginBottom: 24,
                }}
              >
                STAFF LOGIN
              </div>
  
              <form
                onSubmit={handleStaffLogin}
                style={{
                  display: 'grid',
                  gap: 14,
                }}
              >
                <input
                  type="email"
                  placeholder="Email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  style={{
                    width: '100%',
                    height: 46,
                    borderRadius: 12,
                    border: '1px solid #334155',
                    background: '#111827',
                    color: 'white',
                    padding: '0 14px',
                    boxSizing: 'border-box',
                    fontSize: 16,
                  }}
                />
  
                <input
                  type="password"
                  placeholder="Password"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: 46,
                    borderRadius: 12,
                    border: '1px solid #334155',
                    background: '#111827',
                    color: 'white',
                    padding: '0 14px',
                    boxSizing: 'border-box',
                    fontSize: 16,
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
            </>
          )}
        </div>
      </main>
    )
  }