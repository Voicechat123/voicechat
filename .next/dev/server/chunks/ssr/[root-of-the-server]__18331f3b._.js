module.exports = [
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/react-dom [external] (react-dom, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("react-dom", () => require("react-dom"));

module.exports = mod;
}),
"[project]/Documents/voicechat/lib/supabaseClient.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$supabase$2f$supabase$2d$js__$5b$external$5d$__$2840$supabase$2f$supabase$2d$js$2c$__esm_import$2c$__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f40$supabase$2f$supabase$2d$js$29$__ = __turbopack_context__.i("[externals]/@supabase/supabase-js [external] (@supabase/supabase-js, esm_import, [project]/Documents/voicechat/node_modules/@supabase/supabase-js)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f40$supabase$2f$supabase$2d$js__$5b$external$5d$__$2840$supabase$2f$supabase$2d$js$2c$__esm_import$2c$__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f40$supabase$2f$supabase$2d$js$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f40$supabase$2f$supabase$2d$js__$5b$external$5d$__$2840$supabase$2f$supabase$2d$js$2c$__esm_import$2c$__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f40$supabase$2f$supabase$2d$js$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://bzmadjzrjpqwcobtgnqs.supabase.co");
const supabaseAnonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bWFkanpyanBxd2NvYnRnbnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTMzMjQsImV4cCI6MjA4ODU2OTMyNH0.WlEeA6k0zMOBh3SYEB2rCievK81Urpne1Z7zMj2OkO8");
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
const supabase = (0, __TURBOPACK__imported__module__$5b$externals$5d2f40$supabase$2f$supabase$2d$js__$5b$external$5d$__$2840$supabase$2f$supabase$2d$js$2c$__esm_import$2c$__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f40$supabase$2f$supabase$2d$js$29$__["createClient"])(supabaseUrl, supabaseAnonKey);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/Documents/voicechat/lib/webrtc.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "VoiceCallManager",
    ()=>VoiceCallManager
]);
/**
 * VoiceCallManager - obsługuje połączenia głosowe WebRTC
 * Sygnalizacja przez Supabase Realtime (tabela call_signals)
 */ const ICE_SERVERS = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        },
        {
            urls: 'stun:stun1.l.google.com:19302'
        },
        {
            urls: 'stun:stun2.l.google.com:19302'
        }
    ]
};
class VoiceCallManager {
    constructor(supabase, currentUserId){
        this.supabase = supabase;
        this.currentUserId = currentUserId;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteAudio = null;
        this.subscription = null;
        // Callbacki - ustaw je przed rozpoczęciem połączenia
        this.onRemoteStream = null; // (stream) => void
        this.onCallEnded = null; // () => void
        this.onIceStateChange = null; // (state) => void
    }
    /** Dzwoni do innego użytkownika */ async startCall(remoteUserId) {
        await this._cleanup();
        this.localStream = await this._getAudio();
        this.peerConnection = this._createPeerConnection(remoteUserId);
        this.localStream.getTracks().forEach((track)=>this.peerConnection.addTrack(track, this.localStream));
        // Subskrybuj odpowiedzi od rozmówcy
        this._subscribeToSignals(remoteUserId);
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        await this._sendSignal(remoteUserId, 'offer', offer);
    }
    /** Odbiera połączenie przychodzące */ async answerCall(callerId, offer) {
        await this._cleanup();
        this.localStream = await this._getAudio();
        this.peerConnection = this._createPeerConnection(callerId);
        this.localStream.getTracks().forEach((track)=>this.peerConnection.addTrack(track, this.localStream));
        this._subscribeToSignals(callerId);
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        await this._sendSignal(callerId, 'answer', answer);
    }
    /** Kończy aktywne połączenie */ async endCall(remoteUserId) {
        if (remoteUserId) {
            await this._sendSignal(remoteUserId, 'end', {});
        }
        await this._cleanup();
    }
    /** Wycisza/odwycisza mikrofon */ toggleMute() {
        if (!this.localStream) return false;
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            return !audioTrack.enabled // zwraca true jeśli wyciszony
            ;
        }
        return false;
    }
    // ─── Prywatne metody ──────────────────────────────────────────
    async _getAudio() {
        try {
            return await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                },
                video: false
            });
        } catch (err) {
            throw new Error('Nie udało się uzyskać dostępu do mikrofonu. Sprawdź uprawnienia przeglądarki.');
        }
    }
    _createPeerConnection(remoteUserId) {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pc.ontrack = (event)=>{
            if (this.onRemoteStream) this.onRemoteStream(event.streams[0]);
        };
        pc.onicecandidate = async (event)=>{
            if (event.candidate) {
                await this._sendSignal(remoteUserId, 'ice-candidate', event.candidate);
            }
        };
        pc.oniceconnectionstatechange = ()=>{
            if (this.onIceStateChange) this.onIceStateChange(pc.iceConnectionState);
            if ([
                'disconnected',
                'failed',
                'closed'
            ].includes(pc.iceConnectionState)) {
                if (this.onCallEnded) this.onCallEnded();
                this._cleanup();
            }
        };
        return pc;
    }
    _subscribeToSignals(remoteUserId) {
        if (this.subscription) this.subscription.unsubscribe();
        this.subscription = this.supabase.channel(`call:${this.currentUserId}`).on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'call_signals',
            filter: `callee_id=eq.${this.currentUserId}`
        }, async (payload)=>{
            const signal = payload.new;
            if (signal.caller_id !== remoteUserId && signal.callee_id !== remoteUserId) return;
            try {
                if (signal.type === 'answer' && this.peerConnection) {
                    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.payload));
                } else if (signal.type === 'ice-candidate' && this.peerConnection) {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.payload));
                } else if (signal.type === 'end') {
                    if (this.onCallEnded) this.onCallEnded();
                    this._cleanup();
                }
            } catch (err) {
                console.error('Błąd WebRTC signaling:', err);
            }
        }).subscribe();
    }
    async _sendSignal(remoteUserId, type, payload) {
        const { error } = await this.supabase.from('call_signals').insert({
            caller_id: this.currentUserId,
            callee_id: remoteUserId,
            type,
            payload
        });
        if (error) console.error('Błąd wysyłania sygnału:', error);
    }
    async _cleanup() {
        if (this.localStream) {
            this.localStream.getTracks().forEach((t)=>t.stop());
            this.localStream = null;
        }
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }
}
}),
"[project]/Documents/voicechat/components/CallModal.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CallModal
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
;
;
function CallModal({ mode, remoteUser, onAnswer, onDecline, onEnd, remoteStream, iceState }) {
    const [muted, setMuted] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const [duration, setDuration] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(0);
    const audioRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(null);
    const timerRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(null);
    // Podłącz stream audio do elementu <audio>
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (remoteStream && audioRef.current) {
            audioRef.current.srcObject = remoteStream;
        }
    }, [
        remoteStream
    ]);
    // Timer czasu rozmowy
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (mode === 'active') {
            timerRef.current = setInterval(()=>setDuration((d)=>d + 1), 1000);
        }
        return ()=>clearInterval(timerRef.current);
    }, [
        mode
    ]);
    const formatTime = (s)=>{
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };
    const statusText = ()=>{
        if (mode === 'calling') return 'Dzwonię...';
        if (mode === 'incoming') return 'Połączenie przychodzące';
        if (iceState === 'checking') return 'Łączenie...';
        if (iceState === 'connected' || iceState === 'completed') return formatTime(duration);
        return formatTime(duration);
    };
    const initials = remoteUser?.nickname?.slice(0, 2).toUpperCase() || '??';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        className: "overlay",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("audio", {
                ref: audioRef,
                autoPlay: true,
                playsInline: true
            }, void 0, false, {
                fileName: "[project]/Documents/voicechat/components/CallModal.js",
                lineNumber: 62,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "animate-fade-in",
                style: {
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 28,
                    padding: '40px 36px',
                    width: '100%',
                    maxWidth: 340,
                    textAlign: 'center'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        style: {
                            position: 'relative',
                            display: 'inline-block',
                            marginBottom: 20
                        },
                        children: [
                            (mode === 'calling' || mode === 'incoming') && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        style: {
                                            position: 'absolute',
                                            inset: -12,
                                            borderRadius: '50%',
                                            border: '2px solid var(--primary)',
                                            animation: 'pulse-ring 1.5s ease-out infinite',
                                            opacity: 0.5
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/voicechat/components/CallModal.js",
                                        lineNumber: 76,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        style: {
                                            position: 'absolute',
                                            inset: -6,
                                            borderRadius: '50%',
                                            border: '2px solid var(--primary)',
                                            animation: 'pulse-ring 1.5s ease-out infinite 0.5s',
                                            opacity: 0.3
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/voicechat/components/CallModal.js",
                                        lineNumber: 82,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "avatar avatar-lg",
                                children: initials
                            }, void 0, false, {
                                fileName: "[project]/Documents/voicechat/components/CallModal.js",
                                lineNumber: 90,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/voicechat/components/CallModal.js",
                        lineNumber: 73,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h2", {
                        style: {
                            fontSize: 22,
                            fontWeight: 800,
                            marginBottom: 6
                        },
                        children: [
                            "@",
                            remoteUser?.nickname
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/voicechat/components/CallModal.js",
                        lineNumber: 93,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                        style: {
                            color: 'var(--text-muted)',
                            fontSize: 15,
                            marginBottom: 28
                        },
                        children: statusText()
                    }, void 0, false, {
                        fileName: "[project]/Documents/voicechat/components/CallModal.js",
                        lineNumber: 97,
                        columnNumber: 9
                    }, this),
                    mode === 'active' && (iceState === 'connected' || iceState === 'completed') && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                            height: 60,
                            marginBottom: 28
                        },
                        children: [
                            0,
                            1,
                            2,
                            3,
                            4
                        ].map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "wave-bar"
                            }, i, false, {
                                fileName: "[project]/Documents/voicechat/components/CallModal.js",
                                lineNumber: 108,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/Documents/voicechat/components/CallModal.js",
                        lineNumber: 103,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            gap: 12,
                            justifyContent: 'center'
                        },
                        children: [
                            mode === 'incoming' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(CallButton, {
                                        onClick: onDecline,
                                        color: "var(--red)",
                                        icon: "📵",
                                        label: "Odrzuć"
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/voicechat/components/CallModal.js",
                                        lineNumber: 117,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(CallButton, {
                                        onClick: onAnswer,
                                        color: "var(--green)",
                                        icon: "📞",
                                        label: "Odbierz"
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/voicechat/components/CallModal.js",
                                        lineNumber: 123,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true),
                            (mode === 'calling' || mode === 'active') && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["Fragment"], {
                                children: [
                                    mode === 'active' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(CallButton, {
                                        onClick: ()=>setMuted((m)=>!m),
                                        color: muted ? 'var(--red)' : 'var(--surface-3)',
                                        icon: muted ? '🔇' : '🎙️',
                                        label: muted ? 'Wyciszony' : 'Mikrofon',
                                        small: true
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/voicechat/components/CallModal.js",
                                        lineNumber: 135,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(CallButton, {
                                        onClick: onEnd,
                                        color: "var(--red)",
                                        icon: "📵",
                                        label: "Zakończ"
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/voicechat/components/CallModal.js",
                                        lineNumber: 143,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/voicechat/components/CallModal.js",
                        lineNumber: 114,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/voicechat/components/CallModal.js",
                lineNumber: 64,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/voicechat/components/CallModal.js",
        lineNumber: 60,
        columnNumber: 5
    }, this);
}
function CallButton({ onClick, color, icon, label, small }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                onClick: onClick,
                style: {
                    width: small ? 52 : 64,
                    height: small ? 52 : 64,
                    borderRadius: '50%',
                    background: color,
                    border: 'none',
                    fontSize: small ? 20 : 24,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.15s, filter 0.15s',
                    boxShadow: `0 4px 20px ${color}55`
                },
                onMouseEnter: (e)=>e.currentTarget.style.filter = 'brightness(1.15)',
                onMouseLeave: (e)=>e.currentTarget.style.filter = '',
                children: icon
            }, void 0, false, {
                fileName: "[project]/Documents/voicechat/components/CallModal.js",
                lineNumber: 160,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                style: {
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    fontWeight: 600
                },
                children: label
            }, void 0, false, {
                fileName: "[project]/Documents/voicechat/components/CallModal.js",
                lineNumber: 179,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/voicechat/components/CallModal.js",
        lineNumber: 159,
        columnNumber: 5
    }, this);
}
}),
"[project]/Documents/voicechat/pages/app.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "default",
    ()=>AppPage
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$next$2f$router$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/voicechat/node_modules/next/router.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$next$2f$head$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/voicechat/node_modules/next/head.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/voicechat/lib/supabaseClient.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$webrtc$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/voicechat/lib/webrtc.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$components$2f$CallModal$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/voicechat/components/CallModal.js [ssr] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
;
;
// ─── Utility ────────────────────────────────────────────────────────────────
function Avatar({ nickname, size = 'md' }) {
    const initials = (nickname || '?').slice(0, 2).toUpperCase();
    const s = size === 'lg' ? 56 : 40;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        style: {
            width: s,
            height: s,
            borderRadius: '50%',
            flexShrink: 0,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: s * 0.35,
            color: 'white',
            userSelect: 'none'
        },
        children: initials
    }, void 0, false, {
        fileName: "[project]/Documents/voicechat/pages/app.js",
        lineNumber: 14,
        columnNumber: 5
    }, this);
}
function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit'
    });
}
function AppPage() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$next$2f$router$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    // Auth
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [profile, setProfile] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [authLoading, setAuthLoading] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(true);
    // UI
    const [selectedContact, setSelectedContact] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [sidebarTab, setSidebarTab] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('chats') // 'chats' | 'search'
    ;
    const [searchQuery, setSearchQuery] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('');
    const [searchResults, setSearchResults] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]);
    const [searching, setSearching] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    // Messages
    const [messages, setMessages] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]);
    const [newMsg, setNewMsg] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('');
    const [sendingMsg, setSendingMsg] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const [conversations, setConversations] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]) // {profile, lastMsg}
    ;
    const messagesEndRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(null);
    // Voice call state
    const [callState, setCallState] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    // callState = { mode: 'calling'|'incoming'|'active', remoteUser, remoteStream, iceState }
    const callManagerRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(null);
    const [incomingSignal, setIncomingSignal] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    // ─── Auth ──────────────────────────────────────────────────────────────────
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getUser().then(async ({ data: { user } })=>{
            if (!user) {
                router.replace('/');
                return;
            }
            const { data: prof } = await __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["supabase"].from('profiles').select('*').eq('id', user.id).single();
            if (!prof) {
                router.replace('/setup');
                return;
            }
            setUser(user);
            setProfile(prof);
            setAuthLoading(false);
        });
    }, [
        router
    ]);
    // ─── Load conversations ────────────────────────────────────────────────────
    const loadConversations = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useCallback"])(async ()=>{
        if (!user) return;
        // Pobierz ostatnią wiadomość z każdą osobą
        const { data: msgs } = await __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["supabase"].from('messages').select('*, sender:profiles!messages_sender_id_fkey(id,nickname), receiver:profiles!messages_receiver_id_fkey(id,nickname)').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', {
            ascending: false
        });
        if (!msgs) return;
        // Zgrupuj po rozmówcy
        const convMap = new Map();
        for (const msg of msgs){
            const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
            const otherProfile = msg.sender_id === user.id ? msg.receiver : msg.sender;
            if (!convMap.has(otherId)) {
                convMap.set(otherId, {
                    profile: otherProfile,
                    lastMsg: msg
                });
            }
        }
        setConversations(Array.from(convMap.values()));
    }, [
        user
    ]);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (user) loadConversations();
    }, [
        user,
        loadConversations
    ]);
    // ─── Load messages for selected contact ───────────────────────────────────
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (!selectedContact || !user) return;
        const loadMessages = async ()=>{
            const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["supabase"].from('messages').select('*').or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedContact.id}),` + `and(sender_id.eq.${selectedContact.id},receiver_id.eq.${user.id})`).order('created_at', {
                ascending: true
            });
            setMessages(data || []);
            // Oznacz jako przeczytane
            await __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["supabase"].from('messages').update({
                read: true
            }).eq('sender_id', selectedContact.id).eq('receiver_id', user.id).eq('read', false);
        };
        loadMessages();
        // Realtime subscription for messages
        const channel = __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["supabase"].channel(`chat:${user.id}:${selectedContact.id}`).on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
        }, (payload)=>{
            const msg = payload.new;
            const isRelevant = msg.sender_id === user.id && msg.receiver_id === selectedContact.id || msg.sender_id === selectedContact.id && msg.receiver_id === user.id;
            if (isRelevant) {
                setMessages((prev)=>[
                        ...prev,
                        msg
                    ]);
                loadConversations();
            }
        }).subscribe();
        return ()=>channel.unsubscribe();
    }, [
        selectedContact,
        user,
        loadConversations
    ]);
    // Scroll to bottom on new message
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth'
        });
    }, [
        messages
    ]);
    // ─── Incoming call listener ────────────────────────────────────────────────
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (!user) return;
        const channel = __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["supabase"].channel(`incoming:${user.id}`).on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'call_signals',
            filter: `callee_id=eq.${user.id}`
        }, async (payload)=>{
            const signal = payload.new;
            if (signal.type === 'offer' && !callState) {
                // Incoming call — pobierz profil dzwoniącego
                const { data: callerProfile } = await __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["supabase"].from('profiles').select('*').eq('id', signal.caller_id).single();
                setIncomingSignal({
                    callerId: signal.caller_id,
                    offer: signal.payload
                });
                setCallState({
                    mode: 'incoming',
                    remoteUser: callerProfile,
                    remoteStream: null,
                    iceState: null
                });
            }
        }).subscribe();
        return ()=>channel.unsubscribe();
    }, [
        user,
        callState
    ]);
    // ─── Send message ──────────────────────────────────────────────────────────
    const sendMessage = async (e)=>{
        e.preventDefault();
        if (!newMsg.trim() || !selectedContact || !user) return;
        setSendingMsg(true);
        const content = newMsg.trim();
        setNewMsg('');
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["supabase"].from('messages').insert({
            sender_id: user.id,
            receiver_id: selectedContact.id,
            content
        });
        if (error) {
            setNewMsg(content);
            alert('Błąd wysyłania wiadomości: ' + error.message);
        } else {
            loadConversations();
        }
        setSendingMsg(false);
    };
    // ─── Search users ──────────────────────────────────────────────────────────
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async ()=>{
            setSearching(true);
            const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["supabase"].from('profiles').select('*').ilike('nickname', `%${searchQuery}%`).neq('id', user?.id).limit(10);
            setSearchResults(data || []);
            setSearching(false);
        }, 400);
        return ()=>clearTimeout(timer);
    }, [
        searchQuery,
        user
    ]);
    // ─── Voice call — start ────────────────────────────────────────────────────
    const startCall = async (remoteUser)=>{
        if (!user) return;
        callManagerRef.current = new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$webrtc$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["VoiceCallManager"](__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["supabase"], user.id);
        callManagerRef.current.onRemoteStream = (stream)=>{
            setCallState((prev)=>({
                    ...prev,
                    remoteStream: stream
                }));
        };
        callManagerRef.current.onCallEnded = ()=>{
            setCallState(null);
            callManagerRef.current = null;
        };
        callManagerRef.current.onIceStateChange = (state)=>{
            setCallState((prev)=>{
                if (!prev) return null;
                const mode = state === 'connected' || state === 'completed' ? 'active' : prev.mode;
                return {
                    ...prev,
                    iceState: state,
                    mode
                };
            });
        };
        setCallState({
            mode: 'calling',
            remoteUser,
            remoteStream: null,
            iceState: null
        });
        try {
            await callManagerRef.current.startCall(remoteUser.id);
        } catch (err) {
            alert(err.message);
            setCallState(null);
            callManagerRef.current = null;
        }
    };
    // ─── Voice call — answer ───────────────────────────────────────────────────
    const answerCall = async ()=>{
        if (!user || !incomingSignal) return;
        callManagerRef.current = new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$webrtc$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["VoiceCallManager"](__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["supabase"], user.id);
        callManagerRef.current.onRemoteStream = (stream)=>{
            setCallState((prev)=>({
                    ...prev,
                    remoteStream: stream
                }));
        };
        callManagerRef.current.onCallEnded = ()=>{
            setCallState(null);
            callManagerRef.current = null;
        };
        callManagerRef.current.onIceStateChange = (state)=>{
            setCallState((prev)=>{
                if (!prev) return null;
                const mode = state === 'connected' || state === 'completed' ? 'active' : prev.mode;
                return {
                    ...prev,
                    iceState: state,
                    mode
                };
            });
        };
        setCallState((prev)=>({
                ...prev,
                mode: 'active'
            }));
        try {
            await callManagerRef.current.answerCall(incomingSignal.callerId, incomingSignal.offer);
            setIncomingSignal(null);
        } catch (err) {
            alert(err.message);
            setCallState(null);
            callManagerRef.current = null;
        }
    };
    // ─── Voice call — end ──────────────────────────────────────────────────────
    const endCall = async ()=>{
        if (callManagerRef.current) {
            const remoteId = callState?.remoteUser?.id || incomingSignal?.callerId;
            await callManagerRef.current.endCall(remoteId);
            callManagerRef.current = null;
        }
        setCallState(null);
        setIncomingSignal(null);
    };
    // ─── Logout ────────────────────────────────────────────────────────────────
    const logout = async ()=>{
        await endCall();
        await __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.signOut();
        router.replace('/');
    };
    // ─── Render ────────────────────────────────────────────────────────────────
    if (authLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
            style: {
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "spinner",
                style: {
                    width: 32,
                    height: 32
                }
            }, void 0, false, {
                fileName: "[project]/Documents/voicechat/pages/app.js",
                lineNumber: 345,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/Documents/voicechat/pages/app.js",
            lineNumber: 344,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$next$2f$head$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("title", {
                    children: "VoiceChat"
                }, void 0, false, {
                    fileName: "[project]/Documents/voicechat/pages/app.js",
                    lineNumber: 353,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/Documents/voicechat/pages/app.js",
                lineNumber: 352,
                columnNumber: 7
            }, this),
            callState && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$components$2f$CallModal$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                mode: callState.mode,
                remoteUser: callState.remoteUser,
                remoteStream: callState.remoteStream,
                iceState: callState.iceState,
                onAnswer: answerCall,
                onDecline: endCall,
                onEnd: endCall
            }, void 0, false, {
                fileName: "[project]/Documents/voicechat/pages/app.js",
                lineNumber: 358,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: {
                    display: 'flex',
                    height: '100vh',
                    overflow: 'hidden'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("aside", {
                        style: {
                            width: 300,
                            flexShrink: 0,
                            background: 'var(--surface)',
                            borderRight: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '18px 16px',
                                    borderBottom: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(Avatar, {
                                        nickname: profile?.nickname
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/voicechat/pages/app.js",
                                        lineNumber: 386,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        style: {
                                            flex: 1,
                                            overflow: 'hidden'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontWeight: 700,
                                                    fontSize: 15,
                                                    truncate: true
                                                },
                                                children: [
                                                    "@",
                                                    profile?.nickname
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Documents/voicechat/pages/app.js",
                                                lineNumber: 388,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: 12,
                                                    color: 'var(--text-muted)'
                                                },
                                                children: profile?.email
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/voicechat/pages/app.js",
                                                lineNumber: 391,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Documents/voicechat/pages/app.js",
                                        lineNumber: 387,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                        onClick: logout,
                                        title: "Wyloguj",
                                        style: {
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer',
                                            fontSize: 18,
                                            padding: 4,
                                            borderRadius: 6,
                                            transition: 'color 0.2s'
                                        },
                                        onMouseEnter: (e)=>e.currentTarget.style.color = 'var(--red)',
                                        onMouseLeave: (e)=>e.currentTarget.style.color = 'var(--text-muted)',
                                        children: "⬡"
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/voicechat/pages/app.js",
                                        lineNumber: 395,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Documents/voicechat/pages/app.js",
                                lineNumber: 381,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    borderBottom: '1px solid var(--border)'
                                },
                                children: [
                                    'chats',
                                    'search'
                                ].map((tab)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setSidebarTab(tab),
                                        style: {
                                            flex: 1,
                                            padding: '10px 0',
                                            background: 'none',
                                            border: 'none',
                                            color: sidebarTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                                            fontFamily: 'Nunito, sans-serif',
                                            fontWeight: 700,
                                            fontSize: 13,
                                            cursor: 'pointer',
                                            borderBottom: `2px solid ${sidebarTab === tab ? 'var(--primary)' : 'transparent'}`,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            transition: 'color 0.2s'
                                        },
                                        children: tab === 'chats' ? '💬 Czaty' : '🔍 Szukaj'
                                    }, tab, false, {
                                        fileName: "[project]/Documents/voicechat/pages/app.js",
                                        lineNumber: 417,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/Documents/voicechat/pages/app.js",
                                lineNumber: 412,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                style: {
                                    flex: 1,
                                    overflowY: 'auto',
                                    padding: '8px 0'
                                },
                                children: sidebarTab === 'chats' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["Fragment"], {
                                    children: conversations.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        style: {
                                            padding: 24,
                                            textAlign: 'center',
                                            color: 'var(--text-muted)',
                                            fontSize: 14,
                                            lineHeight: 1.7
                                        },
                                        children: [
                                            "Brak rozmów.",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("br", {}, void 0, false, {
                                                fileName: "[project]/Documents/voicechat/pages/app.js",
                                                lineNumber: 446,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                onClick: ()=>setSidebarTab('search'),
                                                style: {
                                                    color: 'var(--primary)',
                                                    cursor: 'pointer',
                                                    fontWeight: 600
                                                },
                                                children: "Znajdź kogoś"
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/voicechat/pages/app.js",
                                                lineNumber: 447,
                                                columnNumber: 21
                                            }, this),
                                            ' ',
                                            "po nicku i napisz!"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Documents/voicechat/pages/app.js",
                                        lineNumber: 442,
                                        columnNumber: 19
                                    }, this) : conversations.map(({ profile: p, lastMsg })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(ContactRow, {
                                            profile: p,
                                            subtitle: lastMsg?.content,
                                            active: selectedContact?.id === p.id,
                                            onClick: ()=>setSelectedContact(p)
                                        }, p.id, false, {
                                            fileName: "[project]/Documents/voicechat/pages/app.js",
                                            lineNumber: 457,
                                            columnNumber: 21
                                        }, this))
                                }, void 0, false) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    style: {
                                        padding: '10px 12px'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                            className: "input",
                                            placeholder: "Szukaj po nicku...",
                                            value: searchQuery,
                                            onChange: (e)=>setSearchQuery(e.target.value),
                                            autoFocus: true,
                                            style: {
                                                marginBottom: 8
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/voicechat/pages/app.js",
                                            lineNumber: 469,
                                            columnNumber: 17
                                        }, this),
                                        searching && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                            style: {
                                                textAlign: 'center',
                                                padding: 16
                                            },
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                className: "spinner",
                                                style: {
                                                    margin: 'auto'
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/voicechat/pages/app.js",
                                                lineNumber: 479,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/voicechat/pages/app.js",
                                            lineNumber: 478,
                                            columnNumber: 19
                                        }, this),
                                        !searching && searchQuery.length >= 2 && searchResults.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                            style: {
                                                padding: '12px 4px',
                                                color: 'var(--text-muted)',
                                                fontSize: 14
                                            },
                                            children: [
                                                "Nie znaleziono użytkownika „",
                                                searchQuery,
                                                '".'
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/voicechat/pages/app.js",
                                            lineNumber: 483,
                                            columnNumber: 19
                                        }, this),
                                        searchResults.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(ContactRow, {
                                                profile: p,
                                                subtitle: p.email,
                                                active: selectedContact?.id === p.id,
                                                onClick: ()=>{
                                                    setSelectedContact(p);
                                                    setSidebarTab('chats');
                                                    setSearchQuery('');
                                                    setSearchResults([]);
                                                }
                                            }, p.id, false, {
                                                fileName: "[project]/Documents/voicechat/pages/app.js",
                                                lineNumber: 488,
                                                columnNumber: 19
                                            }, this))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/voicechat/pages/app.js",
                                    lineNumber: 468,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/Documents/voicechat/pages/app.js",
                                lineNumber: 438,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/voicechat/pages/app.js",
                        lineNumber: 373,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("main", {
                        style: {
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        },
                        children: selectedContact ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    style: {
                                        padding: '14px 20px',
                                        borderBottom: '1px solid var(--border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        background: 'var(--surface)'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(Avatar, {
                                            nickname: selectedContact.nickname
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/voicechat/pages/app.js",
                                            lineNumber: 517,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                            style: {
                                                flex: 1
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontWeight: 700,
                                                        fontSize: 16
                                                    },
                                                    children: [
                                                        "@",
                                                        selectedContact.nickname
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/voicechat/pages/app.js",
                                                    lineNumber: 519,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontSize: 12,
                                                        color: 'var(--text-muted)'
                                                    },
                                                    children: selectedContact.email
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/voicechat/pages/app.js",
                                                    lineNumber: 522,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/voicechat/pages/app.js",
                                            lineNumber: 518,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                            onClick: ()=>startCall(selectedContact),
                                            disabled: !!callState,
                                            title: "Zadzwoń",
                                            style: {
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                background: callState ? 'var(--surface-3)' : 'var(--green)',
                                                border: 'none',
                                                fontSize: 18,
                                                cursor: callState ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'background 0.2s, transform 0.1s',
                                                opacity: callState ? 0.5 : 1
                                            },
                                            onMouseEnter: (e)=>{
                                                if (!callState) e.currentTarget.style.transform = 'scale(1.1)';
                                            },
                                            onMouseLeave: (e)=>e.currentTarget.style.transform = '',
                                            children: "📞"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/voicechat/pages/app.js",
                                            lineNumber: 528,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/voicechat/pages/app.js",
                                    lineNumber: 511,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    style: {
                                        flex: 1,
                                        overflowY: 'auto',
                                        padding: '20px 20px 10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8
                                    },
                                    children: [
                                        messages.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                            style: {
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'var(--text-muted)',
                                                fontSize: 14,
                                                flexDirection: 'column',
                                                gap: 8,
                                                opacity: 0.7
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontSize: 32
                                                    },
                                                    children: "👋"
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/voicechat/pages/app.js",
                                                    lineNumber: 559,
                                                    columnNumber: 21
                                                }, this),
                                                "Napisz pierwszą wiadomość do @",
                                                selectedContact.nickname,
                                                "!"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/voicechat/pages/app.js",
                                            lineNumber: 554,
                                            columnNumber: 19
                                        }, this),
                                        messages.map((msg, i)=>{
                                            const isOwn = msg.sender_id === user.id;
                                            const prevMsg = messages[i - 1];
                                            const showTime = !prevMsg || new Date(msg.created_at) - new Date(prevMsg.created_at) > 5 * 60 * 1000;
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                children: [
                                                    showTime && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            textAlign: 'center',
                                                            fontSize: 11.5,
                                                            color: 'var(--text-muted)',
                                                            margin: '8px 0'
                                                        },
                                                        children: formatTime(msg.created_at)
                                                    }, void 0, false, {
                                                        fileName: "[project]/Documents/voicechat/pages/app.js",
                                                        lineNumber: 572,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                        className: isOwn ? 'msg-out' : 'msg-in',
                                                        style: {
                                                            animation: 'fadeIn 0.2s ease'
                                                        },
                                                        children: msg.content
                                                    }, void 0, false, {
                                                        fileName: "[project]/Documents/voicechat/pages/app.js",
                                                        lineNumber: 579,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, msg.id, true, {
                                                fileName: "[project]/Documents/voicechat/pages/app.js",
                                                lineNumber: 570,
                                                columnNumber: 21
                                            }, this);
                                        }),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                            ref: messagesEndRef
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/voicechat/pages/app.js",
                                            lineNumber: 587,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/voicechat/pages/app.js",
                                    lineNumber: 548,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("form", {
                                    onSubmit: sendMessage,
                                    style: {
                                        padding: '12px 16px',
                                        borderTop: '1px solid var(--border)',
                                        display: 'flex',
                                        gap: 10,
                                        alignItems: 'center',
                                        background: 'var(--surface)'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                            className: "input",
                                            placeholder: `Napisz do @${selectedContact.nickname}...`,
                                            value: newMsg,
                                            onChange: (e)=>setNewMsg(e.target.value),
                                            style: {
                                                flex: 1
                                            },
                                            onKeyDown: (e)=>{
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    sendMessage(e);
                                                }
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/voicechat/pages/app.js",
                                            lineNumber: 600,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                            type: "submit",
                                            disabled: !newMsg.trim() || sendingMsg,
                                            style: {
                                                width: 42,
                                                height: 42,
                                                borderRadius: '50%',
                                                background: newMsg.trim() ? 'var(--primary)' : 'var(--surface-3)',
                                                border: 'none',
                                                cursor: newMsg.trim() ? 'pointer' : 'default',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 18,
                                                flexShrink: 0,
                                                transition: 'background 0.2s, transform 0.1s',
                                                boxShadow: newMsg.trim() ? '0 2px 12px var(--primary-glow)' : 'none'
                                            },
                                            onMouseEnter: (e)=>{
                                                if (newMsg.trim()) e.currentTarget.style.transform = 'scale(1.08)';
                                            },
                                            onMouseLeave: (e)=>e.currentTarget.style.transform = '',
                                            children: sendingMsg ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                className: "spinner",
                                                style: {
                                                    width: 16,
                                                    height: 16
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/voicechat/pages/app.js",
                                                lineNumber: 628,
                                                columnNumber: 33
                                            }, this) : '➤'
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/voicechat/pages/app.js",
                                            lineNumber: 613,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/voicechat/pages/app.js",
                                    lineNumber: 591,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true) : // Empty state
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            style: {
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 12,
                                color: 'var(--text-muted)'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontSize: 52
                                    },
                                    children: "🎙️"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/voicechat/pages/app.js",
                                    lineNumber: 639,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h2", {
                                    style: {
                                        fontFamily: 'Syne, sans-serif',
                                        fontSize: 22,
                                        fontWeight: 800,
                                        color: 'var(--text)'
                                    },
                                    children: "VoiceChat"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/voicechat/pages/app.js",
                                    lineNumber: 640,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                    style: {
                                        fontSize: 15,
                                        textAlign: 'center',
                                        maxWidth: 280,
                                        lineHeight: 1.6
                                    },
                                    children: [
                                        "Wybierz rozmowę z listy lub",
                                        ' ',
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                            onClick: ()=>setSidebarTab('search'),
                                            style: {
                                                color: 'var(--primary)',
                                                cursor: 'pointer',
                                                fontWeight: 600
                                            },
                                            children: "znajdź użytkownika"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/voicechat/pages/app.js",
                                            lineNumber: 648,
                                            columnNumber: 17
                                        }, this),
                                        ' ',
                                        "po nicku."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/voicechat/pages/app.js",
                                    lineNumber: 646,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/voicechat/pages/app.js",
                            lineNumber: 634,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Documents/voicechat/pages/app.js",
                        lineNumber: 507,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/voicechat/pages/app.js",
                lineNumber: 370,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
// ─── Contact row component ──────────────────────────────────────────────────
function ContactRow({ profile, subtitle, active, onClick }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        onClick: onClick,
        style: {
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            cursor: 'pointer',
            background: active ? 'var(--surface-3)' : 'transparent',
            borderLeft: `3px solid ${active ? 'var(--primary)' : 'transparent'}`,
            transition: 'background 0.15s'
        },
        onMouseEnter: (e)=>{
            if (!active) e.currentTarget.style.background = 'var(--surface-2)';
        },
        onMouseLeave: (e)=>{
            if (!active) e.currentTarget.style.background = 'transparent';
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(Avatar, {
                nickname: profile?.nickname
            }, void 0, false, {
                fileName: "[project]/Documents/voicechat/pages/app.js",
                lineNumber: 680,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: {
                    flex: 1,
                    overflow: 'hidden'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        style: {
                            fontWeight: 700,
                            fontSize: 14
                        },
                        children: [
                            "@",
                            profile?.nickname
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/voicechat/pages/app.js",
                        lineNumber: 682,
                        columnNumber: 9
                    }, this),
                    subtitle && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        style: {
                            fontSize: 12.5,
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 180
                        },
                        children: subtitle
                    }, void 0, false, {
                        fileName: "[project]/Documents/voicechat/pages/app.js",
                        lineNumber: 686,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/voicechat/pages/app.js",
                lineNumber: 681,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/voicechat/pages/app.js",
        lineNumber: 668,
        columnNumber: 5
    }, this);
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__18331f3b._.js.map