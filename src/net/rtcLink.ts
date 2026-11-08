// Two browsers, one data channel. The host opens a room on play-api and waits; the guest joins by code.
// The Room relays the offer, answer and ICE, then a negotiated, ordered, reliable channel carries the game.
import { createRoom, PLAY_API, socketUrl, TRENCHESS_PROTOCOL } from "./playApi";
import { closeText, parseToGuest, parseToHost, type GuestSignal, type HostSignal, type IceCandidate, type IceServer, type RoomReport } from "./signal";

/** Set up the same way on both ends, so no in-band negotiation is needed. */
const GAME_CHANNEL: RTCDataChannelInit = { negotiated: true, id: 0, ordered: true };
/** The Room counts a host silent after 75 s; ping well inside that. */
const HOST_PING_MS = 20_000;

/** One open line to the other player. Text in, text out, in order. */
export interface Link {
  send(text: string): void;
  onMessage: (text: string) => void;
  /** Fires at most once, and never after close(). */
  onClosed: (reason: string) => void;
  close(): void;
}

export interface HostedRoom {
  readonly code: string;
  /** Resolves when a guest's channel opens. */
  readonly guest: Promise<Link>;
  /** Closes the room (and the link, once there is one). */
  close(): void;
}

export type Hosting = { ok: true; room: HostedRoom } | { ok: false; reason: string };

const rtcConfig = (iceServers: IceServer[], relayOnly: boolean): RTCConfiguration => ({
  iceServers,
  iceTransportPolicy: relayOnly ? "relay" : "all",
});

const candidateOf = (event: RTCPeerConnectionIceEvent): IceCandidate | null => {
  const c = event.candidate;
  return c?.candidate ? { candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex } : null;
};

const isLive = (ws: WebSocket | null): ws is WebSocket => ws?.readyState === WebSocket.OPEN;

/** Wraps an open data channel as a Link. */
function linkOf(channel: RTCDataChannel, pc: RTCPeerConnection, onClose: () => void): Link {
  let isDone = false;
  const link: Link = {
    send: (text) => {
      if (channel.readyState === "open") channel.send(text);
    },
    onMessage: () => {},
    onClosed: () => {},
    close: () => {
      isDone = true;
      channel.close();
      pc.close();
      onClose();
    },
  };
  const drop = (): void => {
    if (isDone) return;
    isDone = true;
    pc.close();
    onClose();
    link.onClosed("Your opponent's connection dropped.");
  };
  channel.onmessage = (event) => {
    if (typeof event.data === "string") link.onMessage(event.data);
  };
  channel.onclose = drop;
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed") drop();
  };
  return link;
}

const report = (seats: number, phase: RoomReport["phase"]): RoomReport => ({
  seats,
  taken: (1 << seats) - 1,
  level: 1,
  highest: 1,
  phase,
  locked: seats >= 2,
});

/** Opens a private room and waits for one guest. */
export async function hostRoom(label = "", api: string = PLAY_API): Promise<Hosting> {
  const created = await createRoom(label, api);
  if (!created.ok) return created;
  const { code, hostKey } = created;
  let signal: WebSocket | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;
  let iceServers: IceServer[] = [];
  let relayOnly = false;
  let isClosed = false;
  let isMatched = false;
  const peers = new Map<string, { pc: RTCPeerConnection; early: IceCandidate[]; remoteSet: boolean }>();
  let settle: { resolve: (link: Link) => void; reject: (error: Error) => void } | null = null;
  const guest = new Promise<Link>((resolve, reject) => (settle = { resolve, reject }));

  const tell = (message: HostSignal): void => {
    if (isLive(signal)) signal.send(JSON.stringify(message));
  };

  const shutRoom = (): void => {
    if (ping) clearInterval(ping);
    ping = null;
    const ws = signal;
    signal = null;
    if (!ws) return;
    ws.onmessage = null;
    ws.onclose = null;
    if (isLive(ws)) ws.send(JSON.stringify({ type: "end" } satisfies HostSignal));
    ws.close(1000, "host left");
  };

  const close = (): void => {
    if (isClosed) return;
    isClosed = true;
    shutRoom();
    for (const peer of peers.values()) peer.pc.close();
    peers.clear();
    settle?.reject(new Error("closed"));
  };

  const accept = async (peerId: string, sdp: string): Promise<void> => {
    if (isMatched) return;
    const pc = new RTCPeerConnection(rtcConfig(iceServers, relayOnly));
    const peer = { pc, early: [] as IceCandidate[], remoteSet: false };
    peers.set(peerId, peer);
    const channel = pc.createDataChannel("game", GAME_CHANNEL);
    pc.onicecandidate = (event) => {
      const ice = candidateOf(event);
      if (ice) tell({ type: "ice", peerId, ice });
    };
    channel.onopen = () => {
      if (isMatched) return channel.close();
      isMatched = true;
      peers.delete(peerId);
      for (const other of peers.values()) other.pc.close();
      peers.clear();
      tell({ type: "report", report: report(2, "playing") });
      // The room has done its job: two seats, locked. Leave it so the Lobby can let it go.
      shutRoom();
      settle?.resolve(linkOf(channel, pc, () => {}));
    };
    try {
      await pc.setRemoteDescription({ type: "offer", sdp });
      peer.remoteSet = true;
      for (const ice of peer.early) await pc.addIceCandidate(ice);
      peer.early = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      tell({ type: "answer", peerId, sdp: answer.sdp ?? "" });
    } catch {
      pc.close();
      peers.delete(peerId);
    }
  };

  const addIce = async (peerId: string, ice: IceCandidate): Promise<void> => {
    const peer = peers.get(peerId);
    if (!peer) return;
    if (!peer.remoteSet) {
      peer.early.push(ice);
      return;
    }
    try {
      await peer.pc.addIceCandidate(ice);
    } catch {
      // chemx-allow: best-effort a late or duplicate candidate; the connection carries on without it
    }
  };

  const fromRoom = async (raw: unknown): Promise<void> => {
    const message = parseToHost(raw);
    if (!message) return;
    if (message.type === "ready") {
      iceServers = message.iceServers;
      relayOnly = message.relayOnly;
      tell({ type: "report", report: report(1, "muster") });
    } else if (message.type === "offer") {
      await accept(message.peerId, message.sdp);
    } else if (message.type === "ice") {
      await addIce(message.peerId, message.ice);
    } else {
      const peer = peers.get(message.peerId);
      const isHalfOpen = peer && peer.pc.connectionState !== "connected";
      if (isHalfOpen) {
        peer.pc.close();
        peers.delete(message.peerId);
      }
    }
  };

  const ws = new WebSocket(socketUrl(api, `/v1/rooms/${code}/host`));
  signal = ws;
  ws.onopen = () => ws.send(JSON.stringify({ type: "auth", hostKey } satisfies HostSignal));
  ws.onmessage = (event) => void fromRoom(event.data);
  ws.onclose = (event) => {
    signal = null;
    if (isMatched || isClosed) return;
    isClosed = true;
    settle?.reject(new Error(closeText(event.code)));
  };
  ping = setInterval(() => {
    if (isLive(signal)) signal.send("ping");
  }, HOST_PING_MS);
  return { ok: true, room: { code, guest, close } };
}

/** Joins a host's room by code. Resolves once the data channel is open, or with what to tell the player. */
export function joinRoom(code: string, api: string = PLAY_API): Promise<{ ok: true; link: Link } | { ok: false; reason: string }> {
  return new Promise((resolve) => {
    let pc: RTCPeerConnection | null = null;
    let channel: RTCDataChannel | null = null;
    let early: IceCandidate[] = [];
    let isAnswered = false;
    let isSettled = false;
    const signal = new WebSocket(socketUrl(api, `/v1/rooms/${code}/guest?protocol=${TRENCHESS_PROTOCOL}`));

    const fail = (reason: string): void => {
      if (isSettled) return;
      isSettled = true;
      signal.onmessage = null;
      signal.onclose = null;
      if (signal.readyState <= WebSocket.OPEN) signal.close(1000, "bye");
      channel?.close();
      pc?.close();
      resolve({ ok: false, reason });
    };

    const tell = (message: GuestSignal): void => {
      if (isLive(signal)) signal.send(JSON.stringify(message));
    };

    const offer = async (iceServers: IceServer[], relayOnly: boolean): Promise<void> => {
      const peer = new RTCPeerConnection(rtcConfig(iceServers, relayOnly));
      pc = peer;
      const open = peer.createDataChannel("game", GAME_CHANNEL);
      channel = open;
      open.onopen = () => {
        if (isSettled) return;
        isSettled = true;
        signal.onclose = null;
        signal.close(1000, "connected");
        resolve({ ok: true, link: linkOf(open, peer, () => {}) });
      };
      peer.onicecandidate = (event) => {
        const ice = candidateOf(event);
        if (ice) tell({ type: "ice", ice });
      };
      const local = await peer.createOffer();
      await peer.setLocalDescription(local);
      tell({ type: "offer", sdp: local.sdp ?? "" });
    };

    const answer = async (sdp: string): Promise<void> => {
      const cannotAnswer = !pc || isAnswered;
      if (cannotAnswer) return;
      await pc!.setRemoteDescription({ type: "answer", sdp });
      isAnswered = true;
      const waiting = early;
      early = [];
      for (const ice of waiting) await pc!.addIceCandidate(ice);
    };

    const addIce = async (ice: IceCandidate): Promise<void> => {
      const isEarly = !pc || !isAnswered;
      if (isEarly) {
        early.push(ice);
        return;
      }
      await pc!.addIceCandidate(ice);
    };

    signal.onmessage = async (event) => {
      const message = parseToGuest(event.data);
      if (!message) return;
      try {
        if (message.type === "admitted") await offer(message.iceServers, message.relayOnly);
        else if (message.type === "answer") await answer(message.sdp);
        else if (message.type === "ice") await addIce(message.ice);
        else fail(closeText(4016));
      } catch {
        fail(closeText(0));
      }
    };
    signal.onclose = (event) => fail(closeText(event.code));
  });
}
