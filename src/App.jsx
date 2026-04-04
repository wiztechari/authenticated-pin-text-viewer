import React, { useMemo, useRef, useState } from 'react'

export default function App() {
  const [pin, setPin] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [originalMessage, setOriginalMessage] = useState('')
  const [lastRequestedPin, setLastRequestedPin] = useState('')
  const abortControllerRef = useRef(null)

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  const querySecretKey = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('secretKey') || ''
  }, [])

  const sanitizePin = (value) => value.replace(/\D/g, '').slice(0, 6)

  const handleInputChange = async (event) => {
    const sanitized = sanitizePin(event.target.value)
    setPin(sanitized)

    if (sanitized.length < 6) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      setStatus({ type: '', message: '' })
      setOriginalMessage('')
      return
    }

    if (sanitized.length === 6 && sanitized !== lastRequestedPin) {
      await fetchPinData(sanitized)
    }
  }

  const fetchPinData = async (pinValue) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setStatus({ type: 'loading', message: 'Loading response...' })
    setOriginalMessage('')
    setLastRequestedPin(pinValue)

    try {
      const response = await fetch(`${basePath}/mock-api/${pinValue}.json`, {
        method: 'GET',
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`PIN data not found for ${pinValue}`)
      }

      const data = await response.json()

      let finalMessage = ''

      if (
        data.message &&
        data.messageEncoding === 'RC5-32/12/16 ECB PKCS7 base64' &&
        typeof data.caesarShift === 'number'
      ) {
        const secretKeyToUse = querySecretKey || data.secretKey
        if (!secretKeyToUse) {
          throw new Error('secretKey missing in query param and JSON.')
        }

        const decrypted = decryptPinMessage({
          ...data,
          secretKey: secretKeyToUse,
        })
        finalMessage = decrypted.originalMessage
      } else if (data.message) {
        finalMessage = data.message
      } else {
        finalMessage = 'No message available.'
      }

      setOriginalMessage(finalMessage)
      setStatus({ type: 'success', message: 'Message loaded successfully.' })
    } catch (error) {
      if (error.name === 'AbortError') {
        return
      }

      setStatus({
        type: 'error',
        message: error.message || 'Something went wrong while loading the response.',
      })
      setOriginalMessage('')
    }
  }

  return (
    <div className="app-shell">
      <div className="card">
        <h1>PIN Response Viewer</h1>
        <p className="subtitle">
          Enter a 6-digit PIN. The app loads local JSON, decrypts the message,
          and shows only the original message below.
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
          <p className="hint">
            Secret key source: <code>{querySecretKey ? 'query param' : 'json fallback'}</code>
          </p>
        </div>

        {status.message && (
          <div className={`status-box ${status.type}`}>
            {status.message}
          </div>
        )}

        {originalMessage && (
          <div className="response-box">
            <h2>Original Message</h2>
            <pre>{originalMessage}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

function decryptPinMessage(jsonData) {
  const {
    message,
    secretKey,
    caesarShift,
    messageEncoding
  } = jsonData

  if (messageEncoding !== 'RC5-32/12/16 ECB PKCS7 base64') {
    throw new Error('Unsupported encoding: ' + messageEncoding)
  }

  const rc5DecryptedText = rc5DecryptBase64EcbPkcs7(message, secretKey, 12, 16)
  const originalMessage = caesarDecrypt(rc5DecryptedText, caesarShift)

  return {
    rc5DecryptedText,
    originalMessage
  }
}

function caesarDecrypt(text, shift) {
  return text.replace(/[a-zA-Z]/g, (ch) => {
    const isUpper = ch >= 'A' && ch <= 'Z'
    const base = isUpper ? 65 : 97
    const code = ch.charCodeAt(0) - base
    return String.fromCharCode(((code - shift + 26) % 26) + base)
  })
}

const P32 = 0xB7E15163 >>> 0
const Q32 = 0x9E3779B9 >>> 0

function rc5DecryptBase64EcbPkcs7(base64Ciphertext, keyString, rounds = 12, keyBytesLength = 16) {
  const keyBytes = normalizeKeyLength(utf8ToBytes(keyString), keyBytesLength)
  const S = rc5KeySchedule(keyBytes, rounds)

  const cipherBytes = base64ToBytes(base64Ciphertext)
  if (cipherBytes.length % 8 !== 0) {
    throw new Error('Invalid ciphertext length. Must be multiple of 8 bytes.')
  }

  const plainBytes = []

  for (let i = 0; i < cipherBytes.length; i += 8) {
    const block = cipherBytes.slice(i, i + 8)
    const decryptedBlock = rc5DecryptBlock(block, S, rounds)
    plainBytes.push(...decryptedBlock)
  }

  const unpadded = pkcs7Unpad(plainBytes, 8)
  return bytesToUtf8(unpadded)
}

function rc5KeySchedule(keyBytes, rounds) {
  const u = 4
  const c = Math.max(1, Math.ceil(keyBytes.length / u))
  const L = new Array(c).fill(0)

  for (let i = keyBytes.length - 1; i >= 0; i--) {
    L[Math.floor(i / u)] = (((L[Math.floor(i / u)] << 8) >>> 0) + keyBytes[i]) >>> 0
  }

  const t = 2 * (rounds + 1)
  const S = new Array(t)
  S[0] = P32
  for (let i = 1; i < t; i++) {
    S[i] = (S[i - 1] + Q32) >>> 0
  }

  let A = 0
  let B = 0
  let i = 0
  let j = 0
  const n = 3 * Math.max(t, c)

  for (let k = 0; k < n; k++) {
    A = S[i] = rotl32((S[i] + A + B) >>> 0, 3)
    B = L[j] = rotl32((L[j] + A + B) >>> 0, (A + B) & 31)
    i = (i + 1) % t
    j = (j + 1) % c
  }

  return S
}

function rc5DecryptBlock(block8, S, rounds) {
  let A = bytesToUint32LE(block8, 0)
  let B = bytesToUint32LE(block8, 4)

  for (let i = rounds; i >= 1; i--) {
    B = (rotr32((B - S[2 * i + 1]) >>> 0, A & 31) ^ A) >>> 0
    A = (rotr32((A - S[2 * i]) >>> 0, B & 31) ^ B) >>> 0
  }

  B = (B - S[1]) >>> 0
  A = (A - S[0]) >>> 0

  const out = new Array(8)
  uint32ToBytesLE(A, out, 0)
  uint32ToBytesLE(B, out, 4)
  return out
}

function rotl32(x, y) {
  y &= 31
  return ((x << y) | (x >>> (32 - y))) >>> 0
}

function rotr32(x, y) {
  y &= 31
  return ((x >>> y) | (x << (32 - y))) >>> 0
}

function bytesToUint32LE(bytes, offset) {
  return (
    (bytes[offset]) |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0
}

function uint32ToBytesLE(value, out, offset) {
  out[offset] = value & 0xFF
  out[offset + 1] = (value >>> 8) & 0xFF
  out[offset + 2] = (value >>> 16) & 0xFF
  out[offset + 3] = (value >>> 24) & 0xFF
}

function utf8ToBytes(str) {
  return Array.from(new TextEncoder().encode(str))
}

function bytesToUtf8(bytes) {
  return new TextDecoder().decode(new Uint8Array(bytes))
}

function normalizeKeyLength(keyBytes, targetLength) {
  const out = new Array(targetLength).fill(0)
  for (let i = 0; i < Math.min(keyBytes.length, targetLength); i++) {
    out[i] = keyBytes[i]
  }
  return out
}

function pkcs7Unpad(bytes, blockSize) {
  if (bytes.length === 0 || bytes.length % blockSize !== 0) {
    throw new Error('Invalid PKCS7 padded data length.')
  }

  const pad = bytes[bytes.length - 1]
  if (pad < 1 || pad > blockSize) {
    throw new Error('Invalid PKCS7 padding.')
  }

  for (let i = bytes.length - pad; i < bytes.length; i++) {
    if (bytes[i] !== pad) {
      throw new Error('Invalid PKCS7 padding.')
    }
  }

  return bytes.slice(0, bytes.length - pad)
}

function base64ToBytes(base64) {
  const binary = atob(base64)
  const out = new Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}
