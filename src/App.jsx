import React, { useRef, useState } from 'react'

export default function App() {
  const API_URL = 'https://raw.githubusercontent.com/wiztechari/json/refs/heads/master/quick-m.json'
  const REQUEST_METHOD = 'GET'
  const REQUEST_HEADERS = {
    'Content-Type': 'application/json',
  }

  const abortControllerRef = useRef(null)
  const [pin, setPin] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [responseData, setResponseData] = useState(null)
  const [lastRequestedPin, setLastRequestedPin] = useState('')

  const sanitizePin = (value) => value.replace(/\D/g, '').slice(0, 6)

  const fetchPinData = async (pinValue) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setStatus({ type: 'loading', message: 'Calling API...' })
    setResponseData(null)
    setLastRequestedPin(pinValue)

    try {
      let response

      if (REQUEST_METHOD === 'GET') {
        const url = new URL(API_URL)
        url.searchParams.set('pin', pinValue)

        response = await fetch(url.toString(), {
          method: 'GET',
          headers: REQUEST_HEADERS,
          signal: controller.signal,
        })
      } else {
        response = await fetch(API_URL, {
          method: REQUEST_METHOD,
          headers: REQUEST_HEADERS,
          body: JSON.stringify({ pin: pinValue }),
          signal: controller.signal,
        })
      }

      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json')
        ? await response.json()
        : await response.text()

      if (!response.ok) {
        const errorText = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

      setStatus({ type: 'success', message: 'API call completed successfully.' })
      setResponseData(data)
    } catch (error) {
      if (error.name === 'AbortError') {
        return
      }

      setStatus({
        type: 'error',
        message: error.message || 'Something went wrong while calling the API.',
      })
      setResponseData(null)
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
          Enter a 6-digit PIN. As soon as all 6 digits are entered, the app automatically calls the API and displays the response below.
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
            <h2>API Response</h2>
            <pre>
              {typeof responseData === 'string'
                ? responseData
                : JSON.stringify(responseData, null, 2)}
            </pre>
          </div>
        )}

        <p className="footnote">
          Update <code>API_URL</code>, <code>REQUEST_METHOD</code>, and request format to match your real API.
        </p>
      </div>
    </div>
  )
}
