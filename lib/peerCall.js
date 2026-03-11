// PeerJS-based call manager — działa tak samo jak działający HTML
// PeerJS jest ładowany z CDN w _app.js

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
}

export async function waitForPeer() {
  // Czekaj aż PeerJS załaduje się z CDN (max 10 sekund)
  for (let i = 0; i < 100; i++) {
    if (typeof window !== 'undefined' && window.Peer) return true
    await new Promise(r => setTimeout(r, 100))
  }
  throw new Error('PeerJS nie załadował się. Sprawdź połączenie z internetem.')
}

export function createPeer(peerId) {
  if (typeof window === 'undefined' || !window.Peer) {
    throw new Error('PeerJS nie jest jeszcze załadowany.')
  }
  const config = {
    host: '0.peerjs.com',
    port: 443,
    secure: true,
    path: '/',
    config: { ...ICE_CONFIG, sdpSemantics: 'unified-plan' },
    debug: 1,
  }
  if (peerId) return new window.Peer(peerId, config)
  return new window.Peer(config)
}

export async function getMedia(withVideo) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: withVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
    })
    return stream
  } catch (err) {
    throw new Error('Brak dostępu do ' + (withVideo ? 'kamery/mikrofonu' : 'mikrofonu') + '. Sprawdź uprawnienia.')
  }
}
