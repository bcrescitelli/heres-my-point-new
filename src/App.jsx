import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  collection, 
  serverTimestamp
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Mic2, 
  Users, 
  Clock, 
  Trophy, 
  Megaphone, 
  Ghost, 
  Laugh, 
  ArrowRight,
  Monitor,
  Smartphone,
  Loader2,
  AlertTriangle
} from 'lucide-react';

// --- Configuration ---
// Your specific Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWQWZdm-tGIQ1kxZLqr9gcAA4EY85MXx8",
  authDomain: "heres-my-point.firebaseapp.com",
  projectId: "heres-my-point",
  storageBucket: "heres-my-point.firebasestorage.app",
  messagingSenderId: "979742060620",
  appId: "1:979742060620:web:67c625cb61c0728dffc4e9"
};

// For production, we use a fixed App ID or an environment variable
const appId = "heres-my-point-production";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const TOPICS = [
  "Is cereal a soup?",
  "Hot dogs are sandwiches.",
  "Pineapple belongs on pizza.",
  "The toilet paper roll should go 'over' not 'under'.",
  "Water is wet.",
  "A straw only has one hole.",
  "Golf is not a sport.",
  "Marvel movies are just high-budget soap operas.",
  "Morning people are more productive than night owls.",
  "Coffee is better than tea.",
  "Boneless wings are just expensive chicken nuggets.",
  "The book is always better than the movie.",
  "Reality TV is actually good for society.",
  "Taco is a sandwich.",
  "Cats are better roommates than dogs."
];

const HECKLES = {
  AIRHORN: { label: 'Airhorn', icon: <Megaphone className="w-5 h-5" />, color: 'bg-red-500' },
  LAUGH: { label: 'Laugh Track', icon: <Laugh className="w-5 h-5" />, color: 'bg-yellow-500' },
  CRICKETS: { label: 'Crickets', icon: <Ghost className="w-5 h-5" />, color: 'bg-emerald-500' }
};

// --- Audio Engine ---
const playSynthesizedSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'AIRHORN') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(); osc.stop(now + 0.5);
    } else if (type === 'LAUGH') {
      osc.type = 'sine';
      for(let i=0; i<5; i++) {
        osc.frequency.setValueAtTime(300 + (i*50), now + (i*0.1));
        gain.gain.setValueAtTime(0.1, now + (i*0.1));
        gain.gain.exponentialRampToValueAtTime(0.01, now + (i*0.1) + 0.08);
      }
      osc.start(); osc.stop(now + 0.6);
    } else if (type === 'CRICKETS') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(2500, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(); osc.stop(now + 0.2);
    }
  } catch (e) {}
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [lastHeckle, setLastHeckle] = useState(null);

  // Auth Initialization 
  useEffect(() => {
    const init = async () => {
      try {
        // Standard production auth: use Anonymous sign-in
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
        setError("Firebase Auth failed. Ensure 'Anonymous Auth' is enabled in your Firebase Console.");
      } finally {
        setAuthLoading(false);
      }
    };
    init();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // Room Listener
  useEffect(() => {
    if (!roomCode || !user) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const unsubRoom = onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoom(data);
        if (data.lastHeckle?.id !== lastHeckle?.id) {
          setLastHeckle(data.lastHeckle);
          if (role === 'host') playSynthesizedSound(data.lastHeckle.type);
        }
      } else if (role === 'player') {
        setRoom(null);
        setError('Room no longer exists.');
      }
    }, (err) => {
      console.error("Firestore Error:", err);
      setError(`Sync Error: ${err.code === 'permission-denied' ? 'Permission Denied. Check Firestore Rules.' : err.message}`);
    });

    const playersRef = collection(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players');
    const unsubPlayers = onSnapshot(playersRef, (snap) => {
      setPlayers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    }, (err) => {
      console.error("Players Sync Error:", err);
    });

    return () => { unsubRoom(); unsubPlayers(); };
  }, [roomCode, user, role, lastHeckle]);

  // Actions
  const createRoom = async () => {
    if (!user) {
      setError("Waiting for connection... please try again in a moment.");
      return;
    }
    setError('');
    setAuthLoading(true);
    try {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code);
      await setDoc(roomRef, {
        code,
        status: 'LOBBY',
        hostUid: user.uid,
        currentSpeakerUid: null,
        topic: '',
        round: 0,
        createdAt: serverTimestamp(),
        lastHeckle: null
      });
      setRoomCode(code);
      setRole('host');
    } catch (err) {
      console.error(err);
      setError(err.code === 'permission-denied' 
        ? "Permission Denied. Ensure Firestore rules allow nested paths." 
        : "Failed to create room. check console.");
    } finally {
      setAuthLoading(false);
    }
  };

  const joinRoom = async (e) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    const code = roomCode.toUpperCase();
    if (code.length < 4) return setError('Enter a 4-letter code.');
    
    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return setError('Room not found.');
      
      const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code, 'players', user.uid);
      await setDoc(pRef, {
        uid: user.uid,
        name: playerName || `Player ${user.uid.slice(0, 3)}`,
        score: 0,
        hecklesLeft: 3
      });
      setRoomCode(code);
      setRole('player');
    } catch (err) {
      setError("Join failed. Check your connection.");
    }
  };

  const startGame = async () => {
    if (players.length < 2) return setError('Need 2+ players.');
    nextTurn();
  };

  const nextTurn = async () => {
    let nextSpeaker = !room.currentSpeakerUid ? players[0] : players[players.findIndex(p => p.uid === room.currentSpeakerUid) + 1] || players[0];
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    await updateDoc(roomRef, {
      status: 'TOPIC_REVEAL',
      currentSpeakerUid: nextSpeaker.uid,
      topic: TOPICS[Math.floor(Math.random() * TOPICS.length)],
      round: (room.round || 0) + 1
    });
    for (const p of players) {
      const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', p.uid);
      await updateDoc(pRef, { hecklesLeft: 3, lastTurnTime: 0, lastTurnScore: 0 });
    }
  };

  const startDefense = () => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { status: 'SPEAKING', speakerStartTime: Date.now() });
  
  const stopDefense = async (duration) => {
    const points = Math.max(0, Math.floor(1000 - (Math.abs(30.0 - duration) * 100))) + (Math.abs(30.0 - duration) <= 0.2 ? 500 : 0);
    const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', user.uid);
    const pSnap = await getDoc(pRef);
    await updateDoc(pRef, { score: (pSnap.data().score || 0) + points, lastTurnTime: duration, lastTurnScore: points });
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { status: 'RESULTS' });
  };

  const sendHeckle = async (type) => {
    const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', user.uid);
    const pSnap = await getDoc(pRef);
    if (pSnap.data().hecklesLeft <= 0) return;
    await updateDoc(pRef, { hecklesLeft: pSnap.data().hecklesLeft - 1 });
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), {
      lastHeckle: { id: Math.random().toString(), type, sender: pSnap.data().name }
    });
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-indigo-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="space-y-2">
            <h1 className="text-5xl font-black italic tracking-tighter text-yellow-400">HERE'S MY POINT!</h1>
            <p className="text-indigo-200 uppercase tracking-widest font-bold text-sm">Unpopular Opinion Debate</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={createRoom}
              disabled={authLoading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all p-6 rounded-2xl flex items-center justify-between border-b-4 border-indigo-800 shadow-xl"
            >
              <div className="text-left">
                <p className="font-bold text-xl uppercase">Host a Game</p>
                <p className="text-indigo-300 text-sm">Open lobby on big screen</p>
              </div>
              {authLoading ? <Loader2 className="animate-spin w-8 h-8" /> : <Monitor className="w-8 h-8" />}
            </button>

            <div className="bg-white/10 p-6 rounded-2xl space-y-4 border-b-4 border-black/20 text-left">
              <div className="flex items-center gap-2 text-indigo-300"><Smartphone className="w-4 h-4" /><p className="font-bold uppercase text-xs">Join Room</p></div>
              <form onSubmit={joinRoom} className="space-y-3">
                <input type="text" placeholder="CODE" maxLength={4} className="w-full bg-white text-indigo-900 font-black text-center text-3xl p-3 rounded-xl uppercase focus:outline-none ring-4 ring-transparent focus:ring-yellow-400 transition-all" value={roomCode} onChange={e => setRoomCode(e.target.value)} />
                <input type="text" placeholder="NAME" className="w-full bg-indigo-800 text-white font-bold p-3 rounded-xl focus:outline-none" value={playerName} onChange={e => setPlayerName(e.target.value)} />
                <button type="submit" disabled={authLoading} className="w-full bg-yellow-400 hover:bg-yellow-300 text-indigo-900 font-black py-4 rounded-xl uppercase transition-all flex items-center justify-center gap-2">
                  {authLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Join Lobby <ArrowRight className="w-5 h-5" /></>}
                </button>
              </form>
            </div>
          </div>
          {error && <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-xl flex items-start gap-3 text-left">
            <AlertTriangle className="shrink-0 w-5 h-5" />
            <p className="text-sm font-bold">{error}</p>
          </div>}
        </div>
      </div>
    );
  }

  return role === 'host' ? (
    <HostView room={room} players={players} roomCode={roomCode} startGame={startGame} nextTurn={nextTurn} lastHeckle={lastHeckle} />
  ) : (
    <PlayerView room={room} players={players} user={user} startDefense={startDefense} stopDefense={stopDefense} sendHeckle={sendHeckle} />
  );
}

function HostView({ room, players, roomCode, startGame, nextTurn, lastHeckle }) {
  const currentSpeaker = players.find(p => p.uid === room?.currentSpeakerUid);
  if (!room) return <div className="min-h-screen bg-indigo-950 flex items-center justify-center text-white italic">Establishing connection...</div>;

  return (
    <div className="min-h-screen bg-indigo-950 text-white flex flex-col font-sans">
      <div className="p-8 flex justify-between items-center bg-indigo-900 shadow-2xl">
        <h2 className="text-3xl font-black italic tracking-tighter text-yellow-400 uppercase">Here's My Point!</h2>
        <div className="flex gap-4">
          <div className="bg-indigo-950 px-6 py-2 rounded-full border border-indigo-700 font-black text-2xl uppercase">Room: {roomCode}</div>
          <div className="bg-indigo-800/50 px-6 py-2 rounded-full border border-indigo-700 font-bold text-indigo-300 uppercase text-xs flex items-center">{players.length} Players</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-12 relative">
        {room.status === 'LOBBY' && (
          <div className="text-center space-y-12">
            <h3 className="text-7xl font-black uppercase tracking-tighter animate-pulse">Waiting for Players</h3>
            <div className="grid grid-cols-4 gap-4">
              {players.map(p => <div key={p.uid} className="bg-indigo-800 p-4 rounded-xl border-b-4 border-indigo-950 font-black text-xl">{p.name}</div>)}
            </div>
            {players.length >= 2 && <button onClick={startGame} className="bg-yellow-400 text-indigo-950 font-black text-3xl px-12 py-6 rounded-2xl uppercase shadow-[0_10px_0_rgb(202,138,4)] active:translate-y-2 active:shadow-none transition-all">Start Show</button>}
          </div>
        )}

        {room.status === 'TOPIC_REVEAL' && (
          <div className="text-center space-y-8 animate-in slide-in-from-bottom">
            <div className="bg-indigo-800 px-8 py-2 rounded-full font-black text-indigo-400 uppercase">Speaker: {currentSpeaker?.name}</div>
            <h1 className="text-7xl font-black italic">"{room.topic}"</h1>
            <p className="text-2xl text-yellow-400 font-bold animate-pulse uppercase tracking-widest">Speaker: Hit Start on your phone!</p>
          </div>
        )}

        {room.status === 'SPEAKING' && (
          <div className="text-center space-y-12 w-full">
            <h1 className="text-8xl font-black italic">"{room.topic}"</h1>
            <div className="flex flex-col items-center gap-6">
              <div className="w-32 h-32 rounded-full border-8 border-indigo-800 border-t-yellow-400 animate-spin"></div>
              <p className="text-4xl font-black text-indigo-200 uppercase tracking-widest">{currentSpeaker?.name} is defending!</p>
            </div>
            {lastHeckle && (
              <div key={lastHeckle.id} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-in zoom-in duration-300">
                <div className={`p-12 rounded-3xl text-white font-black text-7xl flex items-center gap-8 ${HECKLES[lastHeckle.type].color} shadow-2xl border-8 border-white/20`}>
                  {HECKLES[lastHeckle.type].icon} {HECKLES[lastHeckle.type].label}!
                </div>
                <p className="text-center mt-4 text-3xl font-bold bg-black/60 p-3 rounded-xl">From: {lastHeckle.sender}</p>
              </div>
            )}
          </div>
        )}

        {room.status === 'RESULTS' && (
          <div className="text-center space-y-12 w-full max-w-4xl">
            <h2 className="text-5xl font-black uppercase">Turn Results</h2>
            <div className="bg-indigo-900 p-12 rounded-3xl border-4 border-white/10 grid grid-cols-2 gap-12">
              <div><p className="text-indigo-400 font-bold uppercase text-xl">Time</p><p className="text-8xl font-black text-yellow-400">{(currentSpeaker?.lastTurnTime || 0).toFixed(2)}s</p></div>
              <div className="border-l-4 border-indigo-800"><p className="text-indigo-400 font-bold uppercase text-xl">Points</p><p className="text-8xl font-black text-white">+{currentSpeaker?.lastTurnScore || 0}</p></div>
            </div>
            <button onClick={nextTurn} className="bg-indigo-600 text-white font-black text-3xl px-12 py-6 rounded-2xl uppercase shadow-[0_10px_0_rgb(49,46,129)] active:translate-y-2 active:shadow-none transition-all">Next Round <ArrowRight className="inline-block ml-2" /></button>
          </div>
        )}
      </div>

      <div className="bg-indigo-900/80 p-6 flex justify-center flex-wrap gap-8 border-t border-white/5">
        {[...players].sort((a,b) => b.score - a.score).map((p, i) => (
          <div key={p.uid} className="flex items-center gap-4 bg-indigo-950/50 p-4 rounded-2xl border border-indigo-800">
            <div className="w-8 h-8 rounded-lg bg-indigo-700 flex items-center justify-center font-bold">#{i+1}</div>
            <div className="text-left"><p className="font-black text-sm uppercase truncate max-w-[100px]">{p.name}</p><p className="font-bold text-yellow-400">{p.score} pts</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerView({ room, players, user, startDefense, stopDefense, sendHeckle }) {
  const me = players.find(p => p.uid === user?.uid);
  const isSpeaker = room?.currentSpeakerUid === user?.uid;
  const currentSpeaker = players.find(p => p.uid === room?.currentSpeakerUid);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [startTime, setStartTime] = useState(0);

  const handleStart = () => { setIsTimerRunning(true); setStartTime(Date.now()); startDefense(); };
  const handleStop = () => { stopDefense((Date.now() - startTime) / 1000); setIsTimerRunning(false); };

  if (!room) return <div className="min-h-screen bg-indigo-900 flex items-center justify-center text-white font-bold text-center p-12">Syncing Room...</div>;

  return (
    <div className="min-h-[100dvh] bg-indigo-900 text-white flex flex-col touch-none select-none">
      <div className="p-4 bg-indigo-950 flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-2 font-bold uppercase"><div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-indigo-900">{me?.name?.charAt(0)}</div>{me?.name}</div>
        <div className="text-right"><p className="text-[10px] uppercase font-bold text-indigo-400">Score</p><p className="text-xl font-black text-yellow-400">{me?.score || 0}</p></div>
      </div>

      <div className="flex-1 p-6 flex flex-col">
        {room.status === 'LOBBY' && <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
          <Users className="w-16 h-16 text-indigo-400" /><h2 className="text-4xl font-black uppercase italic">In Lobby</h2><p className="text-indigo-300">Wait for the Host to start!</p>
        </div>}

        {room.status === 'TOPIC_REVEAL' && <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
          {isSpeaker ? <>
            <div className="bg-yellow-400 text-indigo-950 px-6 py-1 rounded-full font-black uppercase text-sm animate-bounce">Your Turn!</div>
            <h2 className="text-4xl font-black italic">"{room.topic}"</h2>
            <button onClick={handleStart} className="w-full bg-emerald-500 py-12 rounded-3xl font-black text-4xl shadow-[0_10px_0_rgb(6,95,70)] active:translate-y-2 uppercase">Start!</button>
          </> : <>
            <h2 className="text-2xl font-bold opacity-30 italic">"{room.topic}"</h2>
            <p className="text-xl font-black uppercase">{currentSpeaker?.name} is readying...</p>
          </>}
        </div>}

        {room.status === 'SPEAKING' && <div className="flex-1 flex flex-col">
          {isSpeaker ? <div className="flex-1 flex flex-col items-center justify-center space-y-12">
            <h2 className="text-3xl font-black italic">DEFEND YOUR POINT!</h2>
            <div className="w-64 h-64 border-8 border-indigo-800 rounded-full flex items-center justify-center"><Clock className="w-16 h-16 text-yellow-400 opacity-20" /></div>
            <button onClick={handleStop} className="w-full bg-red-500 py-12 rounded-3xl font-black text-4xl shadow-[0_10px_0_rgb(153,27,27)] active:translate-y-2 uppercase">Stop!</button>
          </div> : <div className="flex-1 flex flex-col space-y-4">
            <div className="bg-indigo-950/50 p-4 rounded-xl text-center"><p className="text-xs font-bold text-indigo-400 uppercase">Speaker: {currentSpeaker?.name}</p><h3 className="font-black italic">"{room.topic}"</h3></div>
            {Object.entries(HECKLES).map(([type, data]) => (
              <button key={type} onClick={() => sendHeckle(type)} disabled={me?.hecklesLeft <= 0} className={`flex items-center justify-between p-5 rounded-2xl border-b-4 border-black/30 ${data.color} active:translate-y-1 disabled:opacity-30`}>
                <div className="flex items-center gap-4">{data.icon}<span className="font-black uppercase">{data.label}</span></div>
                <span className="bg-black/20 px-4 py-1 rounded-full text-xs font-bold uppercase">Distract</span>
              </button>
            ))}
            <div className="mt-auto flex justify-center gap-2 py-4">
              {[...Array(3)].map((_, i) => <div key={i} className={`w-10 h-10 rounded-xl ${i < (me?.hecklesLeft || 0) ? 'bg-yellow-400 shadow-[0_4px_0_rgb(202,138,4)]' : 'bg-indigo-950 opacity-30'}`}></div>)}
            </div>
          </div>}
        </div>}

        {room.status === 'RESULTS' && <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          <Trophy className="w-16 h-16 text-yellow-400" /><h2 className="text-4xl font-black uppercase">Round Over</h2>
          <div className="bg-indigo-950/50 p-6 rounded-2xl border border-indigo-700 w-full flex justify-between">
            <div><p className="text-xs font-bold text-indigo-400 uppercase">Time</p><p className="text-3xl font-black">{(me?.lastTurnTime || 0).toFixed(2)}s</p></div>
            <div className="text-right"><p className="text-xs font-bold text-indigo-400 uppercase">Score</p><p className="text-3xl font-black text-yellow-400">+{me?.lastTurnScore || 0}</p></div>
          </div>
        </div>}
      </div>
    </div>
  );
}