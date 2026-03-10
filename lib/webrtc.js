// WebRTC oparty na sprawdzonym kodzie z działającego Video Chat
// Używa tych samych ICE servers + logiki co działający HTML

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
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
  sdpSemantics: 'unified-plan',
  iceCandidatePoolSize: 10,
}

export class VoiceCallManager {
  constructor(supabase, currentUserId) {
    this.supabase = supabase
    this.currentUserId = currentUserId
    this.peerConnection = null
    this.localStream = null
    this.subscription = null

    // Callbacks
    this.onRemoteStream = null
    this.onCallEnded = null
    this.onIceStateChange = null
  }

  // ── Dzwoniący ────────────────────────────────────────────────────────────────
  async startCall(remoteUserId, withVideo = false) {
    await this._cleanup()
    this.localStream = await this._getMedia(withVideo)
    this.peerConnection = this._createPC(remoteUserId)

    // Dodaj wszystkie tracki do połączenia
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream)
    })

    // Subskrybuj sygnały zanim wyślemy offer
    this._subscribeSignals(remoteUserId)

    // Stwórz i wyślij offer
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: withVideo,
    })
    await this.peerConnection.setLocalDescription(offer)
    await this._send(remoteUserId, 'offer', {
      type: offer.type,
      sdp: offer.sdp,
      withVideo,
    })
  }

  // ── Odbierający ──────────────────────────────────────────────────────────────
  async answerCall(callerId, offerPayload) {
    await this._cleanup()
    this.localStream = await this._getMedia(offerPayload.withVideo || false)
    this.peerConnection = this._createPC(callerId)

    // Dodaj tracki
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream)
    })

    // Subskrybuj sygnały
    this._subscribeSignals(callerId)

    // Ustaw remote description z offer
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription({ type: offerPayload.type, sdp: offerPayload.sdp })
    )

    // Stwórz i wyślij answer
    const answer = await this.peerConnection.createAnswer()
    await this.peerConnection.setLocalDescription(answer)
    await this._send(callerId, 'answer', {
      type: answer.type,
      sdp: answer.sdp,
    })
  }

  // ── Zakończ ──────────────────────────────────────────────────────────────────
  async endCall(remoteUserId) {
    if (remoteUserId) {
      await this._send(remoteUserId, 'end', {}).catch(() => {})
    }
    await this._cleanup()
  }

  toggleMute() {
    if (!this.localStream) return false
    const track = this.localStream.getAudioTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      return !track.enabled // true = wyciszony
    }
    return false
  }

  getLocalStream() {
    return this.localStream
  }

  // ── Prywatne ─────────────────────────────────────────────────────────────────
  async _getMedia(withVideo) {
    // Audio processing jak w działającym HTML
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: withVideo
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        : false,
    }).catch(() => {
      throw new Error(
        'Nie można uzyskać dostępu do ' +
        (withVideo ? 'kamery/mikrofonu' : 'mikrofonu') +
        '. Sprawdź uprawnienia przeglądarki.'
      )
    })

    return stream
  }

  _createPC(remoteUserId) {
    const pc = new RTCPeerConnection(ICE_SERVERS)

    // Gdy dostaniemy stream od rozmówcy
    pc.ontrack = (event) => {
      console.log('[WebRTC] ontrack:', event.track.kind)
      if (event.streams && event.streams[0]) {
        if (this.onRemoteStream) this.onRemoteStream(event.streams[0])
      } else {
        // Fallback — zbuduj stream ręcznie
        const stream = new MediaStream()
        stream.addTrack(event.track)
        if (this.onRemoteStream) this.onRemoteStream(stream)
      }
    }

    // ICE candidates — wysyłaj do drugiej strony
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('[WebRTC] Sending ICE candidate:', event.candidate.type)
        await this._send(remoteUserId, 'ice-candidate', event.candidate.toJSON())
      }
    }

    // Stan połączenia ICE
    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state:', pc.iceConnectionState)
      if (this.onIceStateChange) this.onIceStateChange(pc.iceConnectionState)

      if (['disconnected', 'failed', 'closed'].includes(pc.iceConnectionState)) {
        if (this.onCallEnded) this.onCallEnded()
        this._cleanup()
      }
    }

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState)
    }

    pc.onicegatheringstatechange = () => {
      console.log('[WebRTC] ICE gathering:', pc.iceGatheringState)
    }

    return pc
  }

  _subscribeSignals(remoteUserId) {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }

    const channel = `call_signals_${this.currentUserId}_${Date.now()}`

    this.subscription = this.supabase
      .channel(channel)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `callee_id=eq.${this.currentUserId}`,
        },
        async (payload) => {
          const sig = payload.new
          // Przyjmuj tylko sygnały od naszego rozmówcy
          if (sig.caller_id !== remoteUserId && sig.callee_id !== remoteUserId) return

          console.log('[WebRTC] Received signal:', sig.type)

          try {
            if (sig.type === 'answer' && this.peerConnection) {
              if (this.peerConnection.signalingState === 'have-local-offer') {
                await this.peerConnection.setRemoteDescription(
                  new RTCSessionDescription({ type: sig.payload.type, sdp: sig.payload.sdp })
                )
                console.log('[WebRTC] Remote description set (answer)')
              }
            } else if (sig.type === 'ice-candidate' && this.peerConnection) {
              if (this.peerConnection.remoteDescription) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(sig.payload))
                console.log('[WebRTC] ICE candidate added')
              }
            } else if (sig.type === 'end') {
              if (this.onCallEnded) this.onCallEnded()
              await this._cleanup()
            }
          } catch (err) {
            console.error('[WebRTC] Signal handling error:', err)
          }
        }
      )
      .subscribe((status) => {
        console.log('[WebRTC] Realtime subscription:', status)
      })
  }

  async _send(remoteUserId, type, payload) {
    const { error } = await this.supabase.from('call_signals').insert({
      caller_id: this.currentUserId,
      callee_id: remoteUserId,
      type,
      payload,
    })
    if (error) console.error('[WebRTC] Send signal error:', error)
  }

  async _cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop())
      this.localStream = null
    }
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }
    if (this.subscription) {
      this.subscription.unsubscribe()
      this.subscription = null
    }
  }
}
