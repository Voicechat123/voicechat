/**
 * VoiceCallManager - obsługuje połączenia głosowe WebRTC
 * Sygnalizacja przez Supabase Realtime (tabela call_signals)
 */

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

export class VoiceCallManager {
  constructor(supabase, currentUserId) {
    this.supabase = supabase
    this.currentUserId = currentUserId
    this.peerConnection = null
    this.localStream = null
    this.remoteAudio = null
    this.subscription = null

    // Callbacki - ustaw je przed rozpoczęciem połączenia
    this.onRemoteStream = null  // (stream) => void
    this.onCallEnded = null     // () => void
    this.onIceStateChange = null // (state) => void
  }

  /** Dzwoni do innego użytkownika */
  async startCall(remoteUserId) {
    await this._cleanup()
    this.localStream = await this._getAudio()
    this.peerConnection = this._createPeerConnection(remoteUserId)

    this.localStream.getTracks().forEach(track =>
      this.peerConnection.addTrack(track, this.localStream)
    )

    // Subskrybuj odpowiedzi od rozmówcy
    this._subscribeToSignals(remoteUserId)

    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)

    await this._sendSignal(remoteUserId, 'offer', offer)
  }

  /** Odbiera połączenie przychodzące */
  async answerCall(callerId, offer) {
    await this._cleanup()
    this.localStream = await this._getAudio()
    this.peerConnection = this._createPeerConnection(callerId)

    this.localStream.getTracks().forEach(track =>
      this.peerConnection.addTrack(track, this.localStream)
    )

    this._subscribeToSignals(callerId)

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(offer)
    )

    const answer = await this.peerConnection.createAnswer()
    await this.peerConnection.setLocalDescription(answer)

    await this._sendSignal(callerId, 'answer', answer)
  }

  /** Kończy aktywne połączenie */
  async endCall(remoteUserId) {
    if (remoteUserId) {
      await this._sendSignal(remoteUserId, 'end', {})
    }
    await this._cleanup()
  }

  /** Wycisza/odwycisza mikrofon */
  toggleMute() {
    if (!this.localStream) return false
    const audioTrack = this.localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      return !audioTrack.enabled // zwraca true jeśli wyciszony
    }
    return false
  }

  // ─── Prywatne metody ──────────────────────────────────────────

  async _getAudio() {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      })
    } catch (err) {
      throw new Error('Nie udało się uzyskać dostępu do mikrofonu. Sprawdź uprawnienia przeglądarki.')
    }
  }

  _createPeerConnection(remoteUserId) {
    const pc = new RTCPeerConnection(ICE_SERVERS)

    pc.ontrack = (event) => {
      if (this.onRemoteStream) this.onRemoteStream(event.streams[0])
    }

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await this._sendSignal(remoteUserId, 'ice-candidate', event.candidate)
      }
    }

    pc.oniceconnectionstatechange = () => {
      if (this.onIceStateChange) this.onIceStateChange(pc.iceConnectionState)
      if (['disconnected', 'failed', 'closed'].includes(pc.iceConnectionState)) {
        if (this.onCallEnded) this.onCallEnded()
        this._cleanup()
      }
    }

    return pc
  }

  _subscribeToSignals(remoteUserId) {
    if (this.subscription) this.subscription.unsubscribe()

    this.subscription = this.supabase
      .channel(`call:${this.currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `callee_id=eq.${this.currentUserId}`,
        },
        async (payload) => {
          const signal = payload.new
          if (signal.caller_id !== remoteUserId && signal.callee_id !== remoteUserId) return

          try {
            if (signal.type === 'answer' && this.peerConnection) {
              await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(signal.payload)
              )
            } else if (signal.type === 'ice-candidate' && this.peerConnection) {
              await this.peerConnection.addIceCandidate(
                new RTCIceCandidate(signal.payload)
              )
            } else if (signal.type === 'end') {
              if (this.onCallEnded) this.onCallEnded()
              this._cleanup()
            }
          } catch (err) {
            console.error('Błąd WebRTC signaling:', err)
          }
        }
      )
      .subscribe()
  }

  async _sendSignal(remoteUserId, type, payload) {
    const { error } = await this.supabase.from('call_signals').insert({
      caller_id: this.currentUserId,
      callee_id: remoteUserId,
      type,
      payload,
    })
    if (error) console.error('Błąd wysyłania sygnału:', error)
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
