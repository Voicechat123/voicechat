(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime-types.d.ts" />
/// <reference path="../../runtime/base/dev-globals.d.ts" />
/// <reference path="../../runtime/base/dev-protocol.d.ts" />
/// <reference path="../../runtime/base/dev-extensions.ts" />
__turbopack_context__.s([
    "connect",
    ()=>connect,
    "setHooks",
    ()=>setHooks,
    "subscribeToUpdate",
    ()=>subscribeToUpdate
]);
function connect({ addMessageListener, sendMessage, onUpdateError = console.error }) {
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: ([chunkPath, callback])=>{
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        const deletedModules = new Set(updateA.modules ?? []);
        const addedModules = new Set(updateB.modules ?? []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        const added = new Set([
            ...updateA.added ?? [],
            ...updateB.added ?? []
        ]);
        const deleted = new Set([
            ...updateA.deleted ?? [],
            ...updateB.deleted ?? []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        const modules = new Set([
            ...updateA.modules ?? [],
            ...updateB.added ?? []
        ]);
        for (const moduleId of updateB.deleted ?? []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set(updateB.modules ?? []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error(`Invariant: ${message}`);
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/Documents/voicechat/lib/supabaseClient.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/Documents/voicechat/node_modules/next/dist/build/polyfills/process.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/voicechat/node_modules/@supabase/supabase-js/dist/index.mjs [client] (ecmascript) <locals>");
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://bzmadjzrjpqwcobtgnqs.supabase.co");
const supabaseAnonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bWFkanpyanBxd2NvYnRnbnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTMzMjQsImV4cCI6MjA4ODU2OTMyNH0.WlEeA6k0zMOBh3SYEB2rCievK81Urpne1Z7zMj2OkO8");
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseAnonKey);
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/voicechat/lib/webrtc.js [client] (ecmascript)", ((__turbopack_context__) => {
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/voicechat/components/CallModal.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CallModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/voicechat/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/voicechat/node_modules/react/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
function CallModal({ mode, remoteUser, onAnswer, onDecline, onEnd, remoteStream, iceState }) {
    _s();
    const [muted, setMuted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [duration, setDuration] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const audioRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const timerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Podłącz stream audio do elementu <audio>
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CallModal.useEffect": ()=>{
            if (remoteStream && audioRef.current) {
                audioRef.current.srcObject = remoteStream;
            }
        }
    }["CallModal.useEffect"], [
        remoteStream
    ]);
    // Timer czasu rozmowy
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CallModal.useEffect": ()=>{
            if (mode === 'active') {
                timerRef.current = setInterval({
                    "CallModal.useEffect": ()=>setDuration({
                            "CallModal.useEffect": (d)=>d + 1
                        }["CallModal.useEffect"])
                }["CallModal.useEffect"], 1000);
            }
            return ({
                "CallModal.useEffect": ()=>clearInterval(timerRef.current)
            })["CallModal.useEffect"];
        }
    }["CallModal.useEffect"], [
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "overlay",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("audio", {
                ref: audioRef,
                autoPlay: true,
                playsInline: true
            }, void 0, false, {
                fileName: "[project]/Documents/voicechat/components/CallModal.js",
                lineNumber: 62,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            position: 'relative',
                            display: 'inline-block',
                            marginBottom: 20
                        },
                        children: [
                            (mode === 'calling' || mode === 'incoming') && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
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
                    mode === 'active' && (iceState === 'connected' || iceState === 'completed') && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                        ].map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            gap: 12,
                            justifyContent: 'center'
                        },
                        children: [
                            mode === 'incoming' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CallButton, {
                                        onClick: onDecline,
                                        color: "var(--red)",
                                        icon: "📵",
                                        label: "Odrzuć"
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/voicechat/components/CallModal.js",
                                        lineNumber: 117,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CallButton, {
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
                            (mode === 'calling' || mode === 'active') && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    mode === 'active' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CallButton, {
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
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CallButton, {
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
_s(CallModal, "dWcgjP8iZ61CPhvWGYnm9dNcYRg=");
_c = CallModal;
function CallButton({ onClick, color, icon, label, small }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
_c1 = CallButton;
var _c, _c1;
__turbopack_context__.k.register(_c, "CallModal");
__turbopack_context__.k.register(_c1, "CallButton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/voicechat/pages/app.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AppPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/voicechat/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/voicechat/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/voicechat/node_modules/next/router.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$next$2f$head$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/voicechat/node_modules/next/head.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/voicechat/lib/supabaseClient.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$webrtc$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/voicechat/lib/webrtc.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$components$2f$CallModal$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/voicechat/components/CallModal.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
_c = Avatar;
function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit'
    });
}
function AppPage() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"])();
    // Auth
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [profile, setProfile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [authLoading, setAuthLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(true);
    // UI
    const [selectedContact, setSelectedContact] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [sidebarTab, setSidebarTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('chats') // 'chats' | 'search'
    ;
    const [searchQuery, setSearchQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [searchResults, setSearchResults] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [searching, setSearching] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Messages
    const [messages, setMessages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [newMsg, setNewMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [sendingMsg, setSendingMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [conversations, setConversations] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]) // {profile, lastMsg}
    ;
    const messagesEndRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Voice call state
    const [callState, setCallState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // callState = { mode: 'calling'|'incoming'|'active', remoteUser, remoteStream, iceState }
    const callManagerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [incomingSignal, setIncomingSignal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // ─── Auth ──────────────────────────────────────────────────────────────────
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AppPage.useEffect": ()=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["supabase"].auth.getUser().then({
                "AppPage.useEffect": async ({ data: { user } })=>{
                    if (!user) {
                        router.replace('/');
                        return;
                    }
                    const { data: prof } = await __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["supabase"].from('profiles').select('*').eq('id', user.id).single();
                    if (!prof) {
                        router.replace('/setup');
                        return;
                    }
                    setUser(user);
                    setProfile(prof);
                    setAuthLoading(false);
                }
            }["AppPage.useEffect"]);
        }
    }["AppPage.useEffect"], [
        router
    ]);
    // ─── Load conversations ────────────────────────────────────────────────────
    const loadConversations = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppPage.useCallback[loadConversations]": async ()=>{
            if (!user) return;
            // Pobierz ostatnią wiadomość z każdą osobą
            const { data: msgs } = await __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["supabase"].from('messages').select('*, sender:profiles!messages_sender_id_fkey(id,nickname), receiver:profiles!messages_receiver_id_fkey(id,nickname)').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', {
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
        }
    }["AppPage.useCallback[loadConversations]"], [
        user
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AppPage.useEffect": ()=>{
            if (user) loadConversations();
        }
    }["AppPage.useEffect"], [
        user,
        loadConversations
    ]);
    // ─── Load messages for selected contact ───────────────────────────────────
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AppPage.useEffect": ()=>{
            if (!selectedContact || !user) return;
            const loadMessages = {
                "AppPage.useEffect.loadMessages": async ()=>{
                    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["supabase"].from('messages').select('*').or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedContact.id}),` + `and(sender_id.eq.${selectedContact.id},receiver_id.eq.${user.id})`).order('created_at', {
                        ascending: true
                    });
                    setMessages(data || []);
                    // Oznacz jako przeczytane
                    await __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["supabase"].from('messages').update({
                        read: true
                    }).eq('sender_id', selectedContact.id).eq('receiver_id', user.id).eq('read', false);
                }
            }["AppPage.useEffect.loadMessages"];
            loadMessages();
            // Realtime subscription for messages
            const channel = __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["supabase"].channel(`chat:${user.id}:${selectedContact.id}`).on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, {
                "AppPage.useEffect.channel": (payload)=>{
                    const msg = payload.new;
                    const isRelevant = msg.sender_id === user.id && msg.receiver_id === selectedContact.id || msg.sender_id === selectedContact.id && msg.receiver_id === user.id;
                    if (isRelevant) {
                        setMessages({
                            "AppPage.useEffect.channel": (prev)=>[
                                    ...prev,
                                    msg
                                ]
                        }["AppPage.useEffect.channel"]);
                        loadConversations();
                    }
                }
            }["AppPage.useEffect.channel"]).subscribe();
            return ({
                "AppPage.useEffect": ()=>channel.unsubscribe()
            })["AppPage.useEffect"];
        }
    }["AppPage.useEffect"], [
        selectedContact,
        user,
        loadConversations
    ]);
    // Scroll to bottom on new message
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AppPage.useEffect": ()=>{
            messagesEndRef.current?.scrollIntoView({
                behavior: 'smooth'
            });
        }
    }["AppPage.useEffect"], [
        messages
    ]);
    // ─── Incoming call listener ────────────────────────────────────────────────
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AppPage.useEffect": ()=>{
            if (!user) return;
            const channel = __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["supabase"].channel(`incoming:${user.id}`).on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'call_signals',
                filter: `callee_id=eq.${user.id}`
            }, {
                "AppPage.useEffect.channel": async (payload)=>{
                    const signal = payload.new;
                    if (signal.type === 'offer' && !callState) {
                        // Incoming call — pobierz profil dzwoniącego
                        const { data: callerProfile } = await __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["supabase"].from('profiles').select('*').eq('id', signal.caller_id).single();
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
                }
            }["AppPage.useEffect.channel"]).subscribe();
            return ({
                "AppPage.useEffect": ()=>channel.unsubscribe()
            })["AppPage.useEffect"];
        }
    }["AppPage.useEffect"], [
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
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["supabase"].from('messages').insert({
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
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AppPage.useEffect": ()=>{
            if (!searchQuery.trim() || searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }
            const timer = setTimeout({
                "AppPage.useEffect.timer": async ()=>{
                    setSearching(true);
                    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["supabase"].from('profiles').select('*').ilike('nickname', `%${searchQuery}%`).neq('id', user?.id).limit(10);
                    setSearchResults(data || []);
                    setSearching(false);
                }
            }["AppPage.useEffect.timer"], 400);
            return ({
                "AppPage.useEffect": ()=>clearTimeout(timer)
            })["AppPage.useEffect"];
        }
    }["AppPage.useEffect"], [
        searchQuery,
        user
    ]);
    // ─── Voice call — start ────────────────────────────────────────────────────
    const startCall = async (remoteUser)=>{
        if (!user) return;
        callManagerRef.current = new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$webrtc$2e$js__$5b$client$5d$__$28$ecmascript$29$__["VoiceCallManager"](__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["supabase"], user.id);
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
        callManagerRef.current = new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$webrtc$2e$js__$5b$client$5d$__$28$ecmascript$29$__["VoiceCallManager"](__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["supabase"], user.id);
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
        await __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$lib$2f$supabaseClient$2e$js__$5b$client$5d$__$28$ecmascript$29$__["supabase"].auth.signOut();
        router.replace('/');
    };
    // ─── Render ────────────────────────────────────────────────────────────────
    if (authLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$next$2f$head$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("title", {
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
            callState && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$components$2f$CallModal$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: 'flex',
                    height: '100vh',
                    overflow: 'hidden'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                        style: {
                            width: 300,
                            flexShrink: 0,
                            background: 'var(--surface)',
                            borderRight: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '18px 16px',
                                    borderBottom: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Avatar, {
                                        nickname: profile?.nickname
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/voicechat/pages/app.js",
                                        lineNumber: 386,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            flex: 1,
                                            overflow: 'hidden'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    borderBottom: '1px solid var(--border)'
                                },
                                children: [
                                    'chats',
                                    'search'
                                ].map((tab)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    flex: 1,
                                    overflowY: 'auto',
                                    padding: '8px 0'
                                },
                                children: sidebarTab === 'chats' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: conversations.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            padding: 24,
                                            textAlign: 'center',
                                            color: 'var(--text-muted)',
                                            fontSize: 14,
                                            lineHeight: 1.7
                                        },
                                        children: [
                                            "Brak rozmów.",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                                fileName: "[project]/Documents/voicechat/pages/app.js",
                                                lineNumber: 446,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                    }, this) : conversations.map(({ profile: p, lastMsg })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ContactRow, {
                                            profile: p,
                                            subtitle: lastMsg?.content,
                                            active: selectedContact?.id === p.id,
                                            onClick: ()=>setSelectedContact(p)
                                        }, p.id, false, {
                                            fileName: "[project]/Documents/voicechat/pages/app.js",
                                            lineNumber: 457,
                                            columnNumber: 21
                                        }, this))
                                }, void 0, false) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        padding: '10px 12px'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
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
                                        searching && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                textAlign: 'center',
                                                padding: 16
                                            },
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                        !searching && searchQuery.length >= 2 && searchResults.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                        searchResults.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ContactRow, {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                        style: {
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        },
                        children: selectedContact ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        padding: '14px 20px',
                                        borderBottom: '1px solid var(--border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        background: 'var(--surface)'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Avatar, {
                                            nickname: selectedContact.nickname
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/voicechat/pages/app.js",
                                            lineNumber: 517,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                flex: 1
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        flex: 1,
                                        overflowY: 'auto',
                                        padding: '20px 20px 10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8
                                    },
                                    children: [
                                        messages.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    showTime && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
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
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
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
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                                            children: sendingMsg ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontSize: 52
                                    },
                                    children: "🎙️"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/voicechat/pages/app.js",
                                    lineNumber: 639,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
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
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    style: {
                                        fontSize: 15,
                                        textAlign: 'center',
                                        maxWidth: 280,
                                        lineHeight: 1.6
                                    },
                                    children: [
                                        "Wybierz rozmowę z listy lub",
                                        ' ',
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
_s(AppPage, "6zfYGuq1Cat4SAwaVfpbHiflhWw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c1 = AppPage;
// ─── Contact row component ──────────────────────────────────────────────────
function ContactRow({ profile, subtitle, active, onClick }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Avatar, {
                nickname: profile?.nickname
            }, void 0, false, {
                fileName: "[project]/Documents/voicechat/pages/app.js",
                lineNumber: 680,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    flex: 1,
                    overflow: 'hidden'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                    subtitle && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$voicechat$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
_c2 = ContactRow;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "Avatar");
__turbopack_context__.k.register(_c1, "AppPage");
__turbopack_context__.k.register(_c2, "ContactRow");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/Documents/voicechat/pages/app.js [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/app";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/Documents/voicechat/pages/app.js [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if (module.hot) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/Documents/voicechat/pages/app\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/Documents/voicechat/pages/app.js [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__3874b3dd._.js.map