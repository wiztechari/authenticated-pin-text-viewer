import React, { useRef, useState } from 'react'

export default function App() {
  const abortControllerRef = useRef(null)
  const [pin, setPin] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [responseData, setResponseData] = useState(null)
  const [lastRequestedPin, setLastRequestedPin] = useState('')

  const sanitizePin = (value) => value.replace(/\D/g, '').slice(0, 6)

  const getBasePath = () => {
    const configuredBase = import.meta.env.BASE_URL || '/'
    return configuredBase.endsWith('/') ? configuredBase.slice(0, -1) : configuredBase
  }

  const fetchPinData = async (pinValue) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setStatus({ type: 'loading', message: 'Loading local JSON...' })
    setResponseData(null)
    setLastRequestedPin(pinValue)

    try {
      const basePath = getBasePath()
      const response = await fetch(`${basePath}/mock-api/${pinValue}.json`, {
        method: 'GET',
        signal: controller.signal,
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No local JSON found for PIN ${pinValue}`)
        }
        throw new Error(`Failed to load JSON. Status: ${response.status}`)
      }

      const data = await response.json()

      setStatus({ type: 'success', message: 'Local JSON loaded successfully.' })
      setResponseData(data)
    } catch (error) {
      if (error.name === 'AbortError') {
        return
      }

      setStatus({
        type: 'error',
        message: error.message || 'Something went wrong while loading local JSON.',
      })
      setResponseData({
        pin: pinValue,
        status: 'not_found',
        message: `No local JSON file exists for PIN ${pinValue}`,
      })
    }
  }

  const handleInputChange = (event) => {
    const sanitized = sanitizePin(event.target.value)
    setPin(sanitized)

    if (sanitized.length < 6) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      setStatus({ type: '', message: '' })
      setResponseData(null)
      return
    }

    if (sanitized.length === 6 && sanitized !== lastRequestedPin) {
      fetchPinData(sanitized)
    }
  }

  return (
    <div className="app-shell">
      <div className="card">
        <h1>PIN Response Viewer</h1>
        <p className="subtitle">
          Enter a 6-digit PIN. The app fetches a JSON file from the same React project and displays the response below.
        </p>

        <div className="input-section">
          <label htmlFor="pinInput">6-Digit PIN</label>
          <input
            id="pinInput"
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoComplete="off"
            placeholder="Enter PIN"
            value={pin}
            onChange={handleInputChange}
          />
          <p className="hint">Only numbers are allowed.</p>
        </div>

        {status.message && (
          <div className={`status-box ${status.type}`}>
            {status.message}
          </div>
        )}

        {responseData !== null && (
          <div className="response-box">
            <h2>PIN JSON Response</h2>
            <pre>
              {JSON.stringify(responseData, null, 2)}
            </pre>
          </div>
        )}

        <p className="footnote">
          Add more files under <code>public/mock-api/</code> like <code>111111.json</code> or <code>560001.json</code>.
        </p>
      </div>
    </div>
  )
}
