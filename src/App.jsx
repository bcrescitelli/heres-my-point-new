import React, { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  Zap,
  Swords,
  MessageSquare,
  FastForward
} from 'lucide-react';

// --- Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDWQWZdm-tGIQ1kxZLqr9gcAA4EY85MXx8",
  authDomain: "heres-my-point.firebaseapp.com",
  projectId: "heres-my-point",
  storageBucket: "heres-my-point.firebasestorage.app",
  messagingSenderId: "979742060620",
  appId: "1:979742060620:web:67c625cb61c0728dffc4e9"
};

const appId = "heres-my-point-production";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const TOPICS = [
  "Is cereal a soup?", "Hot dogs are sandwiches.", "Pineapple belongs on pizza.",
  "Toilet paper: Over or Under?", "Water is wet.", "Golf is not a sport.",
  "Marvel is just soap opera.", "Morning people are better.", "Coffee vs Tea.",
  "Cats are better than dogs.", "AI will save us.", "Social media is poison.",
  "Reality TV is educational.", "Books are better than movies.", "Summer is better than Winter."
];

const HECKLE_LIBRARY = [
  "Boring!", "Next!", "Prove it!", "Lies!", "I disagree!", "My grandma is louder!",
  "Make it snappy!", "Is this a joke?", "Yawn...", "Wrong!", "Nice tie!", "Whatever!",
  "Tell a story!", "Unbelievable!", "Wake up!", "Where's the proof?", "Fake news!",
  "Nonsense!", "Absurd!", "Preach!", "Keep going!", "Louder!"
];

const ROUND_DETAILS = {
  1: {
    title: "Solo Standard",
    description: "Defend your prompt for exactly 30 seconds. Pure internal timing. No distractions (except heckles).",
    icon: <Mic2 className="w-12 h-12 text-yellow-400" />
  },
  2: {
    title: "The Sneaky Word",
    description: "An audience member (The Plant) picks a secret word. You must use it naturally in your 30s speech.",
    icon: <MessageSquare className="w-12 h-12 text-emerald-400" />
  },
  3: {
    title: "The Face-Off",
    description: "Two speakers, one topic. 15s each. We flash SWITCH at the midpoint. Audience picks the winner.",
    icon: <Swords className="w-12 h-12 text-pink-400" />
  }
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
    if (type === 'HECKLE') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(); osc.stop(now + 0.3);
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

  useEffect(() => {
    const init = async () => {
      try { await signInAnonymously(auth); } 
      catch (err) { setError("Auth failed. Enable Anonymous Auth."); } 
      finally { setAuthLoading(false); }
    };
    init();
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!roomCode || !user) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const unsubRoom = onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoom(data);
        if (data.lastHeckle?.id !== lastHeckle?.id) {
          setLastHeckle(data.lastHeckle);
          if (role === 'host') playSynthesizedSound('HECKLE');
        }
      } else if (role === 'player') { setRoom(null); setError('Room closed.'); }
    });
    const playersRef = collection(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players');
    const unsubPlayers = onSnapshot(playersRef, (snap) => {
      setPlayers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    });
    return () => { unsubRoom(); unsubPlayers(); };
  }, [roomCode, user, role, lastHeckle]);

  // --- Core Game Actions ---
  const createRoom = async () => {
    if (!user) return;
    try {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code), {
        code, status: 'LOBBY', hostUid: user.uid, roundNum: 0, lastHeckle: null
      });
      setRoomCode(code); setRole('host');
    } catch (err) { setError("Permission denied."); }
  };

  const joinRoom = async (e) => {
    e.preventDefault();
    if (!user || roomCode.length < 4) return;
    try {
      const code = roomCode.toUpperCase();
      const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code));
      if (!snap.exists()) return setError('Not found.');
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code, 'players', user.uid), {
        uid: user.uid, name: playerName || `Player ${user.uid.slice(0, 3)}`, score: 0, hecklesLeft: 3
      });
      setRoomCode(code); setRole('player');
    } catch (err) { setError("Join failed."); }
  };

  const startNextRound = async () => {
    const nextRound = (room.roundNum || 0) + 1;
    if (nextRound > 3) return updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { status: 'FINAL_PODIUM' });
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), {
      status: 'ROUND_INTRO',
      roundNum: nextRound,
      roundType: nextRound
    });
  };

  const setupTurn = async () => {
    const roundType = room.roundType;
    let turnData = { status: 'TOPIC_REVEAL', topic: TOPICS[Math.floor(Math.random() * TOPICS.length)], plantUid: null, sneakyWord: null, opponentUid: null };
    
    if (roundType === 1 || roundType === 2) {
      const currentIdx = players.findIndex(p => p.uid === room.currentSpeakerUid);
      const nextSpeaker = players[currentIdx + 1] || players[0];
      turnData.currentSpeakerUid = nextSpeaker.uid;
      
      if (roundType === 2) {
        const others = players.filter(p => p.uid !== nextSpeaker.uid);
        turnData.plantUid = others[Math.floor(Math.random() * others.length)].uid;
      }
    } else {
      const shuffled = [...players].sort(() => 0.5 - Math.random());
      turnData.currentSpeakerUid = shuffled[0].uid;
      turnData.opponentUid = shuffled[1].uid;
    }

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), turnData);
  };

  const startPrepTimer = async () => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { status: 'PREPARING' });
  };

  const startSpeaking = async () => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { 
      status: 'SPEAKING', 
      startTime: Date.now(),
      isSecondHalf: false
    });
  };

  const stopSpeaking = async (duration) => {
    const isR3 = room.roundType === 3;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    
    let points = Math.max(0, Math.floor(1000 - (Math.abs(30.0 - duration) * 100)));
    if (Math.abs(30.0 - duration) <= 0.2) points += 500;

    const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', user.uid);
    const pSnap = await getDoc(pRef);
    const currentScore = pSnap.data().score || 0;

    if (isR3) {
      await updateDoc(pRef, { score: currentScore + (points / 2), lastTurnScore: points / 2, lastTurnTime: duration });
      const opRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', room.opponentUid);
      const opSnap = await getDoc(opRef);
      await updateDoc(opRef, { score: (opSnap.data().score || 0) + (points / 2) });
      await updateDoc(roomRef, { status: 'VOTING', votes: {} });
    } else {
      await updateDoc(pRef, { score: currentScore + points, lastTurnScore: points, lastTurnTime: duration });
      await updateDoc(roomRef, { status: 'RESULTS' });
    }
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-indigo-950 text-white flex flex-col items-center justify-center p-8 font-sans">
        <div className="max-w-md w-full text-center space-y-12 animate-in fade-in duration-700">
          <div className="space-y-4">
            <h1 className="text-6xl font-black italic text-yellow-400 uppercase tracking-tighter drop-shadow-lg transform -rotate-2">
              Here's My Point!
            </h1>
            <p className="text-indigo-400 font-bold uppercase text-sm tracking-[0.3em]">The Unpopular Opinion Game</p>
          </div>

          <div className="grid gap-6">
            <button 
              onClick={createRoom}
              disabled={authLoading}
              className="group relative bg-indigo-600 hover:bg-indigo-500 p-8 rounded-[2.5rem] flex items-center justify-between border-b-8 border-indigo-900 transition-all active:translate-y-2 active:border-b-0 shadow-2xl"
            >
              <div className="text-left">
                <p className="font-black text-2xl uppercase italic leading-none mb-1">Host a Game</p>
                <p className="text-indigo-300 text-sm font-bold">Show on a TV or Monitor</p>
              </div>
              <Monitor className="w-12 h-12 text-indigo-300 group-hover:text-yellow-400 transition-colors" />
            </button>

            <div className="bg-indigo-900/40 p-8 rounded-[2.5rem] border-2 border-indigo-800 backdrop-blur-md space-y-6 text-left shadow-xl">
              <div className="flex items-center gap-2 text-indigo-300">
                <Smartphone className="w-5 h-5" />
                <p className="font-black uppercase text-xs tracking-[0.2em]">Join as a Player</p>
              </div>
              <form onSubmit={joinRoom} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="ROOM CODE" 
                  maxLength={4} 
                  className="w-full bg-indigo-950 text-center font-black text-5xl py-4 rounded-3xl uppercase text-white border-2 border-indigo-800 shadow-inner focus:outline-none focus:ring-4 focus:ring-yellow-400 transition-all" 
                  value={roomCode} 
                  onChange={e => setRoomCode(e.target.value)} 
                />
                <input 
                  type="text" 
                  placeholder="YOUR NAME" 
                  className="w-full bg-indigo-900 p-5 rounded-2xl font-bold border-2 border-indigo-800 focus:outline-none focus:border-indigo-400" 
                  value={playerName} 
                  onChange={e => setPlayerName(e.target.value)} 
                />
                <button type="submit" className="w-full bg-yellow-400 text-indigo-950 py-6 rounded-[2rem] font-black text-2xl uppercase tracking-tighter shadow-lg hover:bg-yellow-300 transition-colors">
                  Join Lobby
                </button>
              </form>
            </div>
          </div>
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl text-red-200 font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return role === 'host' ? (
    <HostView room={room} players={players} roomCode={roomCode} startNextRound={startNextRound} setupTurn={setupTurn} startPrepTimer={startPrepTimer} startSpeaking={startSpeaking} lastHeckle={lastHeckle} />
  ) : (
    <PlayerView room={room} players={players} user={user} joinRoom={joinRoom} startSpeaking={startSpeaking} stopSpeaking={stopSpeaking} />
  );
}

// --- Host View ---
function HostView({ room, players, roomCode, startNextRound, setupTurn, startPrepTimer, startSpeaking, lastHeckle }) {
  const [prepTime, setPrepTime] = useState(10);
  const [speakTime, setSpeakTime] = useState(0);

  useEffect(() => {
    let timer;
    if (room?.status === 'PREPARING' && prepTime > 0) {
      timer = setInterval(() => setPrepTime(p => p - 1), 1000);
    } else if (room?.status === 'PREPARING' && prepTime === 0) {
      startSpeaking();
    }
    return () => clearInterval(timer);
  }, [room?.status, prepTime]);

  useEffect(() => {
    let speakTimer;
    if (room?.status === 'SPEAKING') {
      speakTimer = setInterval(() => {
        const diff = (Date.now() - room.startTime) / 1000;
        setSpeakTime(diff);
        if (room.roundType === 3 && diff >= 15 && !room.isSecondHalf) {
          updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { isSecondHalf: true });
        }
      }, 100);
    } else { setSpeakTime(0); setPrepTime(10); }
    return () => clearInterval(speakTimer);
  }, [room?.status]);

  if (!room) return <div className="min-h-screen bg-indigo-950 flex items-center justify-center text-white italic">Initializing Show...</div>;

  const speaker = players.find(p => p.uid === room.currentSpeakerUid);
  const opponent = players.find(p => p.uid === room.opponentUid);

  return (
    <div className="min-h-screen bg-indigo-950 text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="p-8 bg-indigo-900 flex justify-between items-center border-b-4 border-black/20 shadow-xl relative z-20">
        <h1 className="text-4xl font-black italic text-yellow-400 tracking-tighter uppercase">Here's My Point!</h1>
        <div className="flex items-center gap-6">
          <div className="px-6 py-2 bg-indigo-950 rounded-full border-2 border-indigo-700 shadow-inner">
            <span className="text-indigo-400 font-bold uppercase text-xs mr-2 tracking-widest">Room Code:</span>
            <span className="text-2xl font-black text-white">{roomCode}</span>
          </div>
          <div className="bg-indigo-800 px-4 py-2 rounded-lg border border-white/10 text-indigo-100 font-bold uppercase text-xs">Round {room.roundNum}/3</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-12 relative text-center">
        {/* State Displays */}
        {room.status === 'LOBBY' && (
          <div className="space-y-12 max-w-4xl animate-in zoom-in duration-500">
             <div className="relative">
               <div className="absolute inset-0 blur-3xl bg-indigo-500/20 rounded-full"></div>
               <h2 className="text-8xl font-black uppercase tracking-tighter relative">Waiting for<br/><span className="text-yellow-400 italic">Opinionators</span></h2>
             </div>
             <p className="text-3xl text-indigo-200 font-bold">Join at <span className="underline">your device</span> using code <span className="text-white bg-indigo-800 px-4 py-1 rounded-xl">{roomCode}</span></p>
             <div className="flex flex-wrap justify-center gap-4">
               {players.map((p, i) => (
                 <div key={p.uid} className="bg-indigo-800 px-8 py-4 rounded-2xl border-b-4 border-indigo-950 font-black text-2xl animate-bounce shadow-lg" style={{ animationDelay: `${i*100}ms` }}>
                   {p.name}
                 </div>
               ))}
               {players.length === 0 && <p className="text-indigo-400 italic">Lobby is empty...</p>}
             </div>
             {players.length >= 2 && (
               <button onClick={startNextRound} className="bg-yellow-400 text-indigo-950 px-16 py-8 rounded-[2rem] font-black text-4xl uppercase shadow-[0_12px_0_rgb(180,140,0)] hover:translate-y-1 hover:shadow-[0_8px_0_rgb(180,140,0)] active:translate-y-3 active:shadow-none transition-all">
                 Start Show
               </button>
             )}
          </div>
        )}

        {room.status === 'ROUND_INTRO' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-700 max-w-3xl">
            <div className="flex justify-center mb-6 drop-shadow-2xl">{ROUND_DETAILS[room.roundType].icon}</div>
            <h2 className="text-8xl font-black uppercase italic tracking-tighter text-white">{ROUND_DETAILS[room.roundType].title}</h2>
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] backdrop-blur-md">
              <p className="text-2xl text-indigo-100 leading-relaxed font-medium">{ROUND_DETAILS[room.roundType].description}</p>
            </div>
            <button onClick={setupTurn} className="bg-white text-indigo-900 px-12 py-5 rounded-2xl font-black text-3xl uppercase shadow-xl">Get Started</button>
          </div>
        )}

        {room.status === 'TOPIC_REVEAL' && (
          <div className="space-y-12 animate-in zoom-in duration-500">
            <div className="space-y-4">
              <p className="text-yellow-400 font-black uppercase tracking-[0.3em] text-sm">Today's Hot Take</p>
              <h2 className="text-8xl font-black italic leading-tight text-white drop-shadow-lg">"{room.topic}"</h2>
            </div>
            
            <div className="flex justify-center gap-16 items-center">
              <div className="space-y-2">
                <p className="text-indigo-400 uppercase font-black text-xs tracking-widest">Speaker One</p>
                <div className="text-5xl font-black text-white">{speaker?.name}</div>
              </div>
              {room.roundType === 3 && (
                <>
                  <Swords className="w-12 h-12 text-pink-500 animate-pulse" />
                  <div className="space-y-2">
                    <p className="text-indigo-400 uppercase font-black text-xs tracking-widest">Speaker Two</p>
                    <div className="text-5xl font-black text-white">{opponent?.name}</div>
                  </div>
                </>
              )}
            </div>

            {room.roundType === 2 && !room.sneakyWord && (
              <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-8 rounded-[2rem] animate-pulse">
                <p className="text-emerald-400 font-black uppercase text-xl">Waiting for The Plant to pick a word...</p>
              </div>
            )}

            {(room.roundType !== 2 || room.sneakyWord) && (
              <button onClick={startPrepTimer} className="bg-yellow-400 text-indigo-900 px-12 py-6 rounded-3xl font-black text-4xl uppercase shadow-lg">Begin Prep</button>
            )}
          </div>
        )}

        {room.status === 'PREPARING' && (
          <div className="space-y-8 animate-in fade-in duration-300">
             <p className="text-indigo-300 uppercase font-black tracking-[0.5em] text-xl">Get Ready To Speak</p>
             <div className="text-[25rem] font-black leading-none text-white tabular-nums drop-shadow-[0_20px_50px_rgba(255,255,255,0.2)]">{prepTime}</div>
          </div>
        )}

        {room.status === 'SPEAKING' && (
          <div className="space-y-12 w-full max-w-6xl animate-in fade-in duration-1000">
            <div className={`text-9xl font-black italic mb-20 transition-all duration-500 drop-shadow-2xl ${room.isSecondHalf ? 'text-pink-500 scale-110' : 'text-white'}`}>
              {room.roundType === 3 && !room.isSecondHalf ? `${speaker?.name}` : room.roundType === 3 ? `${opponent?.name}` : room.topic}
            </div>

            <div className="flex flex-col items-center gap-12">
              <div className="relative w-72 h-72 flex items-center justify-center">
                <div className="absolute inset-0 border-8 border-indigo-800 rounded-full"></div>
                <div className={`absolute inset-0 border-8 border-yellow-400 rounded-full animate-ping opacity-20`} style={{ animationDuration: '2s' }}></div>
                <Mic2 className="w-24 h-24 text-yellow-400 drop-shadow-glow" />
              </div>
              
              <div className="h-32 flex items-center justify-center">
                {room.roundType === 3 && speakTime >= 14 && speakTime <= 16 ? (
                   <span className="text-pink-500 text-9xl font-black animate-bounce block uppercase tracking-tighter">SWITCH!</span>
                ) : (
                  <p className="text-4xl font-black uppercase text-indigo-400 tracking-widest animate-pulse">Speak Now!</p>
                )}
              </div>
            </div>

            {lastHeckle && (
              <div key={lastHeckle.id} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-in zoom-in slide-in-from-bottom-20 duration-300 pointer-events-none z-50">
                <div className="bg-red-500 p-12 rounded-[3rem] text-white font-black text-8xl shadow-2xl border-8 border-white/20 uppercase italic tracking-tighter">
                  {lastHeckle.type}
                </div>
                <p className="text-center mt-6 text-3xl font-bold bg-indigo-950 px-6 py-3 rounded-2xl border-2 border-white/20 shadow-xl">{lastHeckle.sender}</p>
              </div>
            )}
          </div>
        )}

        {room.status === 'VOTING' && (
          <div className="space-y-12 animate-in zoom-in duration-500">
            <h2 className="text-8xl font-black uppercase italic tracking-tighter text-pink-400">Vibe Check!</h2>
            <p className="text-3xl text-indigo-200">Audience: Tap who won the debate!</p>
            <div className="flex justify-center gap-12">
              <div className="bg-indigo-900/50 p-12 rounded-[3rem] border-4 border-indigo-700 min-w-[350px] shadow-2xl">
                <p className="text-9xl font-black text-white tabular-nums">{Object.values(room.votes || {}).filter(v => v === speaker?.uid).length}</p>
                <p className="text-3xl font-black mt-6 uppercase text-indigo-300 tracking-widest">{speaker?.name}</p>
              </div>
              <div className="bg-indigo-900/50 p-12 rounded-[3rem] border-4 border-indigo-700 min-w-[350px] shadow-2xl">
                <p className="text-9xl font-black text-white tabular-nums">{Object.values(room.votes || {}).filter(v => v === opponent?.uid).length}</p>
                <p className="text-3xl font-black mt-6 uppercase text-indigo-300 tracking-widest">{opponent?.name}</p>
              </div>
            </div>
            <button onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { status: 'RESULTS' })} className="bg-white text-indigo-900 px-16 py-6 rounded-2xl font-black text-3xl uppercase">Show Results</button>
          </div>
        )}

        {room.status === 'RESULTS' && (
          <div className="space-y-12 animate-in zoom-in duration-500">
             <h2 className="text-8xl font-black uppercase italic tracking-tighter">Point Total</h2>
             <div className="grid grid-cols-2 gap-8 max-w-5xl mx-auto">
                <div className="bg-indigo-900/50 p-16 rounded-[3rem] border-2 border-white/10 shadow-2xl">
                   <p className="text-indigo-400 font-black uppercase text-2xl tracking-widest mb-4">Actual Time</p>
                   <p className="text-[10rem] font-black text-yellow-400 leading-none">{(speaker?.lastTurnTime || 0).toFixed(2)}s</p>
                </div>
                <div className="bg-indigo-900/50 p-16 rounded-[3rem] border-2 border-white/10 shadow-2xl">
                   <p className="text-indigo-400 font-black uppercase text-2xl tracking-widest mb-4">Round Score</p>
                   <p className="text-[10rem] font-black text-white leading-none">+{speaker?.lastTurnScore || 0}</p>
                </div>
             </div>
             <button onClick={startNextRound} className="bg-yellow-400 text-indigo-950 px-16 py-8 rounded-3xl font-black text-4xl uppercase shadow-lg">Next Round</button>
          </div>
        )}
      </div>

      {/* Leaderboard Footer */}
      <div className="bg-indigo-900 p-8 flex justify-center flex-wrap gap-8 border-t-4 border-black/20 shadow-2xl">
        {[...players].sort((a,b) => b.score - a.score).map((p, i) => (
          <div key={p.uid} className="flex items-center gap-6 bg-indigo-950/50 px-6 py-4 rounded-2xl border-2 border-indigo-700 shadow-inner">
             <div className="font-black text-indigo-500 text-3xl italic">#{i+1}</div>
             <div className="text-left leading-tight">
               <p className="font-black uppercase text-sm tracking-tighter truncate max-w-[120px] text-indigo-100">{p.name}</p>
               <p className="font-black text-yellow-400 text-2xl leading-none mt-1">{p.score} <span className="text-[10px] uppercase text-indigo-500">pts</span></p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Player View ---
function PlayerView({ room, players, user, joinRoom, startSpeaking, stopSpeaking }) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [sneakyInput, setSneakyInput] = useState('');
  const [heckleOptions, setHeckleOptions] = useState([]);
  
  const me = players.find(p => p.uid === user?.uid);
  const isSpeaker = room?.currentSpeakerUid === user?.uid || room?.opponentUid === user?.uid;
  const isPlant = room?.plantUid === user?.uid;

  useEffect(() => {
    setHeckleOptions([...HECKLE_LIBRARY].sort(() => 0.5 - Math.random()).slice(0, 3));
  }, [room?.status]);

  const handleStopSpeak = () => {
    const duration = (Date.now() - room.startTime) / 1000;
    stopSpeaking(duration);
  };

  const setSneakyWord = () => {
    if (!sneakyInput) return;
    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), { sneakyWord: sneakyInput });
  };

  const castVote = (uid) => {
    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), { [`votes.${user.uid}`]: uid });
  };

  const sendHeckle = (type) => {
    if (me?.hecklesLeft <= 0) return;
    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code, 'players', user.uid), { hecklesLeft: me.hecklesLeft - 1 });
    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), {
      lastHeckle: { id: Math.random().toString(), type, sender: me.name }
    });
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-indigo-950 text-white flex flex-col items-center justify-center p-8 font-sans">
        <div className="flex flex-col items-center justify-center space-y-8">
           <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
           <p className="text-indigo-300 font-bold uppercase tracking-widest text-sm">Connecting to Room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-indigo-950 text-white flex flex-col font-sans touch-none select-none overflow-hidden">
       {/* Player HUD */}
       <div className="p-4 bg-indigo-900 flex justify-between items-center border-b-2 border-black/20 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-indigo-950 font-black shadow-inner">{me?.name?.charAt(0)}</div>
            <span className="font-black uppercase text-sm tracking-tight">{me?.name}</span>
          </div>
          <div className="flex gap-6">
             <div className="text-right leading-none"><p className="text-[10px] uppercase font-black text-indigo-400">Heckles</p><p className="text-lg font-black text-red-500">{me?.hecklesLeft}</p></div>
             <div className="text-right leading-none"><p className="text-[10px] uppercase font-black text-indigo-400">Score</p><p className="text-lg font-black text-yellow-400">{me?.score || 0}</p></div>
          </div>
       </div>

       <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          {room.status === 'LOBBY' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <div className="bg-indigo-900 p-8 rounded-[3rem] shadow-inner border-2 border-indigo-800 animate-pulse">
                <Users className="w-20 h-20 text-indigo-400" />
              </div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter">You're In!</h2>
              <p className="text-indigo-300 font-bold uppercase text-xs tracking-widest">Wait for more players...</p>
            </div>
          )}
          
          {room.status === 'ROUND_INTRO' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-center animate-in zoom-in">
               <h2 className="text-xs font-black uppercase tracking-[0.5em] text-indigo-400">Upcoming Round</h2>
               <div className="bg-indigo-900 p-10 rounded-[3rem] border-2 border-indigo-800 shadow-xl w-full">
                  <div className="flex justify-center mb-6 scale-75">{ROUND_DETAILS[room.roundType].icon}</div>
                  <h3 className="text-4xl font-black italic mb-3 text-yellow-400 uppercase tracking-tighter">{ROUND_DETAILS[room.roundType].title}</h3>
                  <p className="text-indigo-200 text-sm leading-relaxed">{ROUND_DETAILS[room.roundType].description}</p>
               </div>
            </div>
          )}

          {room.status === 'TOPIC_REVEAL' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-10 text-center">
              {isSpeaker ? (
                <>
                  <div className="bg-yellow-400 text-indigo-950 px-8 py-2 rounded-full font-black uppercase text-xs tracking-widest animate-bounce">It's Your Show!</div>
                  <h2 className="text-4xl font-black italic text-white leading-tight">"{room.topic}"</h2>
                  {room.roundType === 2 && room.sneakyWord && (
                    <div className="bg-emerald-500/20 p-6 rounded-2xl border-2 border-emerald-500/30 font-black text-2xl text-emerald-400 uppercase tracking-tighter">
                      Secret Word: {room.sneakyWord}
                    </div>
                  )}
                  <button onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), { status: 'PREPARING' })} className="w-full bg-white text-indigo-950 py-10 rounded-[2.5rem] font-black text-4xl uppercase shadow-xl tracking-tighter active:translate-y-2 active:shadow-none transition-all">I'm Ready!</button>
                </>
              ) : isPlant && !room.sneakyWord ? (
                <>
                  <div className="text-emerald-400 font-black uppercase tracking-[0.3em] text-xs">The Plant</div>
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter">Pick The Word</h2>
                  <p className="text-indigo-300 text-sm">Type a secret word the speaker must use:</p>
                  <input type="text" className="w-full bg-indigo-900 p-8 rounded-[2rem] border-4 border-indigo-800 font-black text-3xl text-center focus:outline-none focus:border-emerald-500" value={sneakyInput} onChange={e => setSneakyInput(e.target.value)} />
                  <button onClick={setSneakyWord} className="w-full bg-emerald-500 text-indigo-950 py-6 rounded-[2rem] font-black text-2xl uppercase tracking-tighter shadow-lg">Plant It!</button>
                </>
              ) : (
                <div className="space-y-6">
                  <h2 className="text-3xl font-black opacity-10 italic">"{room.topic}"</h2>
                  <div className="bg-indigo-900/50 p-8 rounded-[2rem] border border-white/5">
                    <p className="text-xl font-black uppercase text-indigo-400 tracking-widest animate-pulse">Waiting for speaker...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {room.status === 'SPEAKING' && (
            <div className="flex-1 flex flex-col">
              {isSpeaker ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-12">
                   <div className="text-center space-y-2">
                     <p className="text-yellow-400 font-black uppercase text-xs tracking-widest">Internal Clock Active</p>
                     <h2 className="text-5xl font-black italic uppercase tracking-tighter">KEEP TALKING</h2>
                   </div>
                   <div className="w-72 h-72 rounded-full border-[16px] border-indigo-900 flex items-center justify-center relative shadow-inner bg-indigo-950">
                     <div className="absolute inset-0 rounded-full border-8 border-yellow-400 animate-ping opacity-10"></div>
                     <Mic2 className="w-20 h-20 text-yellow-400 opacity-20" />
                   </div>
                   <button onClick={handleStopSpeak} className="w-full bg-red-500 py-12 rounded-[3rem] font-black text-5xl uppercase tracking-tighter shadow-[0_12px_0_rgb(150,0,0)] active:translate-y-3 active:shadow-none transition-all">STOP!</button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col space-y-6">
                   <div className="bg-indigo-900/50 p-6 rounded-[2rem] border border-white/5 text-center">
                     <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Speaker Defending</p>
                     <h3 className="text-xl font-black italic uppercase tracking-tighter leading-tight">"{room.topic}"</h3>
                   </div>
                   <div className="grid grid-cols-1 gap-4">
                      {heckleOptions.map(h => (
                        <button key={h} onClick={() => sendHeckle(h)} disabled={me?.hecklesLeft <= 0} className="flex items-center justify-between p-7 rounded-[2rem] bg-indigo-900 border-b-8 border-indigo-950 active:translate-y-2 active:border-b-0 disabled:opacity-30 disabled:grayscale transition-all shadow-lg">
                           <div className="flex items-center gap-5 text-indigo-50"><Megaphone className="w-6 h-6 text-red-500" /><span className="font-black uppercase text-xl tracking-tighter">{h}</span></div>
                           <span className="bg-red-500/20 px-4 py-1 rounded-full text-[10px] font-black uppercase text-red-500">Heckle</span>
                        </button>
                      ))}
                   </div>
                   <div className="mt-auto bg-indigo-900/30 p-4 rounded-2xl flex justify-center gap-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className={`w-10 h-10 rounded-xl transition-all duration-500 ${i < (me?.hecklesLeft || 0) ? 'bg-yellow-400 shadow-[0_4px_0_rgb(180,140,0)]' : 'bg-indigo-950 opacity-20'}`}></div>
                      ))}
                   </div>
                </div>
              )}
            </div>
          )}

          {room.status === 'VOTING' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in zoom-in">
               <h2 className="text-4xl font-black uppercase text-pink-500 italic tracking-tighter">Vibe Check!</h2>
               <p className="text-center text-indigo-300 font-bold uppercase text-xs tracking-widest mb-4">Who was more persuasive?</p>
               <button onClick={() => castVote(room.currentSpeakerUid)} className="w-full bg-indigo-900 p-10 rounded-[2.5rem] border-4 border-indigo-800 font-black text-3xl uppercase tracking-tighter active:bg-yellow-400 active:text-indigo-950 transition-all shadow-xl">
                 {players.find(p => p.uid === room.currentSpeakerUid)?.name}
               </button>
               <button onClick={() => castVote(room.opponentUid)} className="w-full bg-indigo-900 p-10 rounded-[2.5rem] border-4 border-indigo-800 font-black text-3xl uppercase tracking-tighter active:bg-yellow-400 active:text-indigo-950 transition-all shadow-xl">
                 {players.find(p => p.uid === room.opponentUid)?.name}
               </button>
            </div>
          )}

          {room.status === 'RESULTS' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in zoom-in">
               <div className="relative">
                 <div className="absolute inset-0 blur-2xl bg-yellow-400/20 rounded-full animate-pulse"></div>
                 <Trophy className="w-28 h-28 text-yellow-400 relative" />
               </div>
               <h2 className="text-5xl font-black uppercase italic tracking-tighter">Turn Done</h2>
               <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs">Look up for the scores!</p>
            </div>
          )}
       </div>
    </div>
  );
}