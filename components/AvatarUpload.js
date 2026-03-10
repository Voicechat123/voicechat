import { useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const GRAD = {
  purple: 'linear-gradient(135deg,#6c63ff,#a78bfa)',
  teal:   'linear-gradient(135deg,#00d4ff,#00e5a0)',
  pink:   'linear-gradient(135deg,#f472b6,#fb7185)',
  orange: 'linear-gradient(135deg,#fb923c,#fbbf24)',
  green:  'linear-gradient(135deg,#34d399,#10b981)',
}

// Kadrowanie zdjęcia na kółko przez canvas
async function cropCircle(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const size = Math.min(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = 256; canvas.height = 256
      const ctx = canvas.getContext('2d')
      ctx.beginPath()
      ctx.arc(128, 128, 128, 0, Math.PI * 2)
      ctx.clip()
      const sx = (img.width - size) / 2
      const sy = (img.height - size) / 2
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 256, 256)
      URL.revokeObjectURL(url)
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    }
    img.src = url
  })
}

export default function AvatarUpload({ userId, currentAvatarUrl, nickname, avatarColor, size = 80, onUploadDone }) {
  const [uploading, setUploading] = useState(false)
  const [hover, setHover] = useState(false)
  const [localPreview, setLocalPreview] = useState(null)
  const inputRef = useRef(null)

  const displayUrl = localPreview || currentAvatarUrl

  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Zdjęcie max 5 MB.'); return }
    if (!file.type.startsWith('image/')) { alert('Tylko pliki graficzne.'); return }

    setUploading(true)
    try {
      const blob = await cropCircle(file)
      const preview = URL.createObjectURL(blob)
      setLocalPreview(preview)

      const ext = 'jpg'
      const path = `avatars/${userId}.${ext}`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

      if (error) { alert('Błąd uploadu: ' + error.message); setLocalPreview(null); return }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = data.publicUrl + '?t=' + Date.now()

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
      onUploadDone?.(publicUrl)
    } catch (err) {
      alert('Błąd: ' + err.message)
      setLocalPreview(null)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [userId, onUploadDone])

  const initials = (nickname || '?').slice(0, 2).toUpperCase()

  return (
    <div
      style={{ position: 'relative', width: size, height: size, cursor: 'pointer', flexShrink: 0 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      {/* Avatar circle */}
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: displayUrl ? 'transparent' : GRAD[avatarColor || 'purple'],
        overflow: 'hidden',
        border: hover ? '2px solid var(--primary)' : '2px solid transparent',
        transition: 'border-color 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.32, fontWeight: 800, color: 'white',
        userSelect: 'none',
      }}>
        {displayUrl ? (
          <img src={displayUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : initials}
      </div>

      {/* Hover overlay */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        opacity: hover || uploading ? 1 : 0,
        transition: 'opacity 0.2s',
        gap: 2,
      }}>
        {uploading ? (
          <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        ) : (
          <>
            <span style={{ fontSize: size * 0.28, lineHeight: 1 }}>📷</span>
            <span style={{ fontSize: 10, color: 'white', fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>Zmień</span>
          </>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
    </div>
  )
}
