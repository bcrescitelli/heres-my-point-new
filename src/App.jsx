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
  serverTimestamp,
  deleteDoc
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
  FastForward,
  RotateCcw,
  Send
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

// Update this to the number of mp3 files you uploaded to /public/sounds/
const AUDIO_FILE_COUNT = 8; 
const MAX_HECKLES = 6;
const HECKLE_CHAR_LIMIT = 20;

const TOPICS = [
  "Is cereal a soup?", "Hot dogs are sandwiches.", "Pineapple belongs on pizza.",
  "Toilet paper: Over or Under?", "Water is wet.", "Golf is not a sport.",
  "Marvel is just soap opera.", "Morning people are better.", "Coffee vs Tea.",
  "Cats are better than dogs.", "AI will save us.", "Social media is poison.",
  "Reality TV is educational.", "Books are better than movies.", "Summer is better than Winter."
];

const ROUND_DETAILS = {
  1: {
    title: "Solo Standard",
    description: "Every player takes a turn. Defend your prompt for exactly 30 seconds. Pure internal timing.",
    icon: <Mic2 className="w-12 h-12 text-yellow-400" />
  },
  2: {
    title: "The Sneaky Word",
    description: "Every player takes a turn. A random 'Plant' picks a word you must use naturally in your 30s.",
    icon: <MessageSquare className="w-12 h-12 text-emerald-400" />
  },
  3: {
    title: "The Face-Off",
    description: "Random pairings. One topic, two sides. We switch midway through—the 2nd player must argue the opposite!",
    icon: <Swords className="w-12 h-12 text-pink-400" />
  }
};

// --- Audio Engine ---
const playRandomHeckleSound = () => {
  try {
    const randomIndex = Math.floor(Math.random() * AUDIO_FILE_COUNT) + 1;
    const audio = new Audio(`/sounds/sound${randomIndex}.mp3`);
    audio.play().catch(e => console.warn("Audio playback blocked or file missing."));
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
      catch (err) { setError("Auth failed."); } 
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
          if (role === 'host') playRandomHeckleSound();
        }
      } else if (role === 'player') { 
        setRole(null);
        setRoom(null); 
        setError('Room reset or closed.'); 
      }
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
        code, status: 'LOBBY', hostUid: user.uid, roundNum: 0, turnIdx: 0, lastHeckle: null
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
        uid: user.uid, name: playerName || `Guest`, score: 0, hecklesLeft: MAX_HECKLES
      });
      setRoomCode(code); setRole('player');
    } catch (err) { setError("Join failed."); }
  };

  const startNextRound = async () => {
    const nextRound = (room.roundNum || 0) + 1;
    if (nextRound > 3) {
      return updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { status: 'FINAL_PODIUM' });
    }
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), {
      status: 'ROUND_INTRO',
      roundNum: nextRound,
      roundType: nextRound,
      turnIdx: 0 // Reset turn counter for new round
    });
  };

  const setupTurn = async () => {
    const roundType = room.roundType;
    const turnIdx = room.turnIdx || 0;
    let turnData = { 
      status: 'TOPIC_REVEAL', 
      topic: TOPICS[Math.floor(Math.random() * TOPICS.length)], 
      plantUid: null, 
      sneakyWord: null, 
      opponentUid: null,
      prepCountdown: 10
    };
    
    if (roundType === 1 || roundType === 2) {
      if (turnIdx >= players.length) return startNextRound();
      const nextSpeaker = players[turnIdx];
      turnData.currentSpeakerUid = nextSpeaker.uid;
      
      if (roundType === 2) {
        const others = players.filter(p => p.uid !== nextSpeaker.uid);
        turnData.plantUid = others[Math.floor(Math.random() * others.length)].uid;
      }
    } else {
      // Round 3: Face Off. Pairings.
      if (turnIdx >= Math.floor(players.length / 2)) return startNextRound();
      const shuffled = [...players].sort(() => 0.5 - Math.random());
      turnData.currentSpeakerUid = shuffled[0].uid;
      turnData.opponentUid = shuffled[1].uid;
    }

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), turnData);
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

    const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', room.currentSpeakerUid);
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

  const restartGame = async () => {
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    await updateDoc(roomRef, { 
      status: 'LOBBY', 
      roundNum: 0, 
      turnIdx: 0, 
      currentSpeakerUid: null, 
      opponentUid: null 
    });
    // Reset all player scores
    for (const p of players) {
      const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', p.uid);
      await updateDoc(pRef, { score: 0, hecklesLeft: MAX_HECKLES });
    }
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-indigo-950 text-white flex flex-col items-center justify-center p-8 font-sans overflow-hidden">
        <div className="max-w-md w-full text-center space-y-10 animate-in fade-in zoom-in duration-500">
          <div className="space-y-4">
            <h1 className="text-6xl md:text-7xl font-black italic text-yellow-400 uppercase tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transform -rotate-2">
              Here's My Point!
            </h1>
            <p className="text-indigo-400 font-bold uppercase text-xs tracking-[0.4em]">The Unpopular Opinion Game</p>
          </div>

          <div className="grid gap-6">
            <button 
              onClick={createRoom}
              disabled={authLoading}
              className="group relative bg-indigo-600 hover:bg-indigo-500 p-8 rounded-[2.5rem] flex items-center justify-between border-b-8 border-indigo-900 transition-all active:translate-y-2 active:border-b-0 shadow-2xl overflow-hidden"
            >
              <div className="text-left relative z-10">
                <p className="font-black text-2xl uppercase italic leading-none mb-1">Host Game</p>
                <p className="text-indigo-300 text-sm font-bold">Project on a big screen</p>
              </div>
              <Monitor className="w-12 h-12 text-indigo-300 group-hover:text-yellow-400 transition-colors relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <div className="bg-indigo-900/40 p-8 rounded-[2.5rem] border-2 border-indigo-800 backdrop-blur-md space-y-6 text-left shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-2 text-indigo-300 relative z-10">
                <Smartphone className="w-5 h-5" />
                <p className="font-black uppercase text-[10px] tracking-[0.2em]">Join as Player</p>
              </div>
              <form onSubmit={joinRoom} className="space-y-4 relative z-10">
                <input 
                  type="text" 
                  placeholder="CODE" 
                  maxLength={4} 
                  className="w-full bg-indigo-950 text-center font-black text-5xl py-4 rounded-3xl uppercase text-white border-2 border-indigo-800 shadow-inner focus:outline-none focus:ring-4 focus:ring-yellow-400 transition-all placeholder:opacity-20" 
                  value={roomCode} 
                  onChange={e => setRoomCode(e.target.value)} 
                />
                <input 
                  type="text" 
                  placeholder="YOUR NAME" 
                  className="w-full bg-indigo-900 p-5 rounded-2xl font-bold border-2 border-indigo-800 focus:outline-none focus:border-indigo-400 text-indigo-100" 
                  value={playerName} 
                  onChange={e => setPlayerName(e.target.value)} 
                />
                <button type="submit" className="w-full bg-yellow-400 text-indigo-950 py-6 rounded-[2rem] font-black text-2xl uppercase tracking-tighter shadow-lg hover:bg-yellow-300 transition-colors active:scale-95">
                  Join Lobby
                </button>
              </form>
            </div>
          </div>
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl text-red-200 font-bold flex items-center gap-2 animate-bounce">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-xs text-left">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return role === 'host' ? (
    <HostView room={room} players={players} roomCode={roomCode} startNextRound={startNextRound} setupTurn={setupTurn} startSpeaking={startSpeaking} lastHeckle={lastHeckle} restartGame={restartGame} />
  ) : (
    <PlayerView room={room} players={players} user={user} joinRoom={joinRoom} startSpeaking={startSpeaking} stopSpeaking={stopSpeaking} />
  );
}

// --- Host View ---
function HostView({ room, players, roomCode, startNextRound, setupTurn, startSpeaking, lastHeckle, restartGame }) {
  const [speakTime, setSpeakTime] = useState(0);

  useEffect(() => {
    let timer;
    if (room?.status === 'TOPIC_REVEAL' && room.prepCountdown > 0) {
      timer = setInterval(() => {
        updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { prepCountdown: room.prepCountdown - 1 });
      }, 1000);
    } else if (room?.status === 'TOPIC_REVEAL' && room.prepCountdown === 0) {
      startSpeaking();
    }
    return () => clearInterval(timer);
  }, [room?.status, room?.prepCountdown]);

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
    } else { setSpeakTime(0); }
    return () => clearInterval(speakTimer);
  }, [room?.status]);

  if (!room) return <div className="min-h-screen bg-indigo-950 flex items-center justify-center text-white italic">Establishing connection...</div>;

  const speaker = players.find(p => p.uid === room.currentSpeakerUid);
  const opponent = players.find(p => p.uid === room.opponentUid);
  const sortedWinners = [...players].sort((a,b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-indigo-950 text-white flex flex-col font-sans overflow-hidden select-none">
      {/* Dynamic Header */}
      <div className="p-6 md:p-8 bg-indigo-900/80 backdrop-blur-md flex justify-between items-center border-b-4 border-black/20 shadow-2xl relative z-20">
        <h1 className="text-3xl md:text-4xl font-black italic text-yellow-400 tracking-tighter uppercase shrink-0">Point!</h1>
        <div className="flex items-center gap-4 md:gap-6 overflow-hidden">
          <div className="px-4 md:px-6 py-2 bg-indigo-950 rounded-full border-2 border-indigo-700 shadow-inner shrink-0 flex items-center">
            <span className="text-indigo-400 font-bold uppercase text-[10px] mr-2 tracking-widest hidden sm:inline">Room:</span>
            <span className="text-xl md:text-2xl font-black text-white">{roomCode}</span>
          </div>
          <div className="bg-indigo-800 px-4 py-2 rounded-lg border border-white/10 text-indigo-100 font-bold uppercase text-[10px] shrink-0 whitespace-nowrap">
            {room.roundNum > 0 ? `Round ${room.roundNum}/3` : 'Lobby'}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative text-center">
        {room.status === 'LOBBY' && (
          <div className="space-y-12 max-w-4xl animate-in zoom-in duration-500 w-full">
             <div className="relative">
               <div className="absolute inset-0 blur-3xl bg-indigo-500/30 rounded-full"></div>
               <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter relative leading-[0.9]">Waiting for<br/><span className="text-yellow-400 italic">Opinionators</span></h2>
             </div>
             <p className="text-2xl md:text-3xl text-indigo-200 font-bold">Use code <span className="text-white bg-indigo-800 px-4 py-1 rounded-xl shadow-lg border border-indigo-700">{roomCode}</span></p>
             <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-h-[300px] overflow-y-auto p-4 custom-scrollbar">
               {players.map((p, i) => (
                 <div key={p.uid} className="bg-indigo-800 px-6 md:px-8 py-3 md:py-4 rounded-2xl border-b-4 border-indigo-950 font-black text-xl md:text-2xl animate-bounce shadow-lg" style={{ animationDelay: `${i*100}ms` }}>
                   {p.name}
                 </div>
               ))}
               {players.length === 0 && <p className="text-indigo-400 italic">Lobby is empty...</p>}
             </div>
             {players.length >= 2 && (
               <button onClick={startNextRound} className="bg-yellow-400 text-indigo-950 px-12 md:px-16 py-6 md:py-8 rounded-[2rem] font-black text-3xl md:text-4xl uppercase shadow-[0_12px_0_rgb(180,140,0)] hover:translate-y-1 hover:shadow-[0_8px_0_rgb(180,140,0)] active:translate-y-3 active:shadow-none transition-all">
                 Start Show
               </button>
             )}
          </div>
        )}

        {room.status === 'ROUND_INTRO' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-700 max-w-3xl w-full">
            <div className="flex justify-center mb-6 drop-shadow-2xl">{ROUND_DETAILS[room.roundType].icon}</div>
            <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-white leading-none">{ROUND_DETAILS[room.roundType].title}</h2>
            <div className="bg-white/5 border border-white/10 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] backdrop-blur-md shadow-2xl">
              <p className="text-xl md:text-2xl text-indigo-100 leading-relaxed font-medium">{ROUND_DETAILS[room.roundType].description}</p>
            </div>
            <button onClick={setupTurn} className="bg-white text-indigo-900 px-12 py-5 rounded-2xl font-black text-3xl uppercase shadow-xl hover:scale-105 transition-transform">Next Speaker</button>
          </div>
        )}

        {room.status === 'TOPIC_REVEAL' && (
          <div className="space-y-12 animate-in zoom-in duration-500 w-full max-w-5xl">
            <div className="space-y-4">
              <p className="text-yellow-400 font-black uppercase tracking-[0.3em] text-xs md:text-sm">Current Prompt</p>
              <h2 className="text-5xl md:text-8xl font-black italic leading-tight text-white drop-shadow-lg break-words">"{room.topic}"</h2>
            </div>
            
            <div className="flex justify-center gap-8 md:gap-16 items-center flex-wrap">
              <div className="space-y-2">
                <p className="text-indigo-400 uppercase font-black text-[10px] tracking-widest">Main Speaker</p>
                <div className="text-3xl md:text-5xl font-black text-white">{speaker?.name}</div>
              </div>
              {room.roundType === 3 && (
                <>
                  <Swords className="w-8 h-8 md:w-12 md:h-12 text-pink-500 animate-pulse" />
                  <div className="space-y-2">
                    <p className="text-indigo-400 uppercase font-black text-[10px] tracking-widest">Opposing View</p>
                    <div className="text-3xl md:text-5xl font-black text-white">{opponent?.name}</div>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col items-center gap-6">
               <div className="relative group">
                  <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-20 animate-pulse group-hover:opacity-40"></div>
                  <div className="relative bg-indigo-900/50 px-10 py-6 rounded-3xl border-2 border-indigo-700 flex flex-col items-center">
                    <p className="text-indigo-400 font-black uppercase text-[10px] mb-2 tracking-[0.2em]">Prep Countdown</p>
                    <p className="text-7xl font-black text-white tabular-nums">{room.prepCountdown}</p>
                  </div>
               </div>
               <p className="text-indigo-300 font-bold uppercase text-xs tracking-widest italic animate-pulse">Wait for timer or hit Ready on phone!</p>
            </div>

            {room.roundType === 2 && !room.sneakyWord && (
              <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-6 rounded-[2rem] animate-pulse">
                <p className="text-emerald-400 font-black uppercase text-lg">Waiting for word input...</p>
              </div>
            )}
          </div>
        )}

        {room.status === 'SPEAKING' && (
          <div className="space-y-12 w-full max-w-6xl animate-in fade-in duration-1000">
            <div className={`text-6xl md:text-9xl font-black italic mb-20 transition-all duration-500 drop-shadow-2xl break-words px-4 ${room.isSecondHalf ? 'text-pink-500 scale-105' : 'text-white'}`}>
              {room.roundType === 3 && !room.isSecondHalf ? `${speaker?.name}` : room.roundType === 3 ? `${opponent?.name}` : room.topic}
            </div>

            <div className="flex flex-col items-center gap-12">
              <div className="relative w-56 h-56 md:w-72 md:h-72 flex items-center justify-center">
                <div className="absolute inset-0 border-8 border-indigo-800 rounded-full"></div>
                <div className={`absolute inset-0 border-8 border-yellow-400 rounded-full animate-ping opacity-20`} style={{ animationDuration: '2s' }}></div>
                <Mic2 className="w-16 h-16 md:w-24 md:h-24 text-yellow-400 drop-shadow-glow" />
              </div>
              
              <div className="h-32 flex items-center justify-center">
                {room.roundType === 3 && speakTime >= 14 && speakTime <= 16 ? (
                   <div className="text-center">
                      <span className="text-pink-500 text-7xl md:text-9xl font-black animate-bounce block uppercase tracking-tighter">SWITCH!</span>
                      <p className="text-xl font-black text-pink-400 uppercase tracking-widest">ARGUING THE OPPOSITE</p>
                   </div>
                ) : (
                  <p className="text-3xl md:text-4xl font-black uppercase text-indigo-400 tracking-widest animate-pulse">Internal Clock Engaged!</p>
                )}
              </div>
            </div>

            {lastHeckle && (
              <div key={lastHeckle.id} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-in zoom-in slide-in-from-bottom-20 duration-300 pointer-events-none z-50 w-full max-w-2xl">
                <div className="bg-red-500 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] text-white font-black text-5xl md:text-8xl shadow-2xl border-8 border-white/20 uppercase italic tracking-tighter break-words mx-4">
                  {lastHeckle.text}
                </div>
                <p className="text-center mt-6 text-2xl font-bold bg-indigo-950 px-6 py-3 rounded-2xl border-2 border-white/20 shadow-xl inline-block mx-auto">{lastHeckle.sender}</p>
              </div>
            )}
          </div>
        )}

        {room.status === 'VOTING' && (
          <div className="space-y-12 animate-in zoom-in duration-500 w-full max-w-5xl">
            <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-pink-400">Vibe Check!</h2>
            <p className="text-xl md:text-3xl text-indigo-200 font-bold uppercase tracking-widest">Who was more persuasive?</p>
            <div className="flex justify-center gap-6 md:gap-12 flex-wrap">
              <div className="bg-indigo-900/50 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] border-4 border-indigo-700 min-w-[280px] md:min-w-[350px] shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-7xl md:text-9xl font-black text-white tabular-nums relative z-10">{Object.values(room.votes || {}).filter(v => v === speaker?.uid).length}</p>
                <p className="text-2xl md:text-3xl font-black mt-6 uppercase text-indigo-300 tracking-widest relative z-10">{speaker?.name}</p>
              </div>
              <div className="bg-indigo-900/50 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] border-4 border-indigo-700 min-w-[280px] md:min-w-[350px] shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-7xl md:text-9xl font-black text-white tabular-nums relative z-10">{Object.values(room.votes || {}).filter(v => v === opponent?.uid).length}</p>
                <p className="text-2xl md:text-3xl font-black mt-6 uppercase text-indigo-300 tracking-widest relative z-10">{opponent?.name}</p>
              </div>
            </div>
            <button onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { status: 'RESULTS' })} className="bg-white text-indigo-900 px-12 md:px-16 py-5 md:py-6 rounded-2xl font-black text-2xl md:text-3xl uppercase shadow-xl active:scale-95 transition-transform">Show Final Points</button>
          </div>
        )}

        {room.status === 'RESULTS' && (
          <div className="space-y-12 animate-in zoom-in duration-500 w-full">
             <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter">Turn Finished</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto px-4">
                <div className="bg-indigo-900/50 p-10 md:p-16 rounded-[2.5rem] md:rounded-[3rem] border-2 border-white/10 shadow-2xl">
                   <p className="text-indigo-400 font-black uppercase text-xl md:text-2xl tracking-widest mb-4">Internal Clock</p>
                   <p className="text-[6rem] md:text-[10rem] font-black text-yellow-400 leading-none">{(speaker?.lastTurnTime || 0).toFixed(2)}s</p>
                </div>
                <div className="bg-indigo-900/50 p-10 md:p-16 rounded-[2.5rem] md:rounded-[3rem] border-2 border-white/10 shadow-2xl">
                   <p className="text-indigo-400 font-black uppercase text-xl md:text-2xl tracking-widest mb-4">Total Points</p>
                   <p className="text-[6rem] md:text-[10rem] font-black text-white leading-none">+{speaker?.lastTurnScore || 0}</p>
                </div>
             </div>
             <button onClick={() => {
               updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { turnIdx: room.turnIdx + 1 });
               setupTurn();
             }} className="bg-yellow-400 text-indigo-950 px-12 md:px-16 py-6 md:py-8 rounded-3xl font-black text-3xl md:text-4xl uppercase shadow-lg active:scale-95 transition-transform">Next Turn</button>
          </div>
        )}

        {room.status === 'FINAL_PODIUM' && (
           <div className="space-y-12 animate-in slide-in-from-bottom-20 duration-1000 w-full max-w-4xl px-4">
              <div className="relative">
                 <div className="absolute inset-0 blur-[100px] bg-yellow-400/30 rounded-full animate-pulse"></div>
                 <Trophy className="w-32 h-32 md:w-48 md:h-48 text-yellow-400 mx-auto relative drop-shadow-[0_20px_50px_rgba(250,204,21,0.5)]" />
              </div>
              <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter text-white">Master of Opinions</h2>
              
              <div className="grid gap-4 mt-12">
                 {sortedWinners.slice(0, 3).map((p, i) => (
                    <div key={p.uid} className={`flex items-center justify-between p-6 md:p-8 rounded-[2rem] border-4 backdrop-blur-md shadow-2xl transform transition-all ${i === 0 ? 'bg-yellow-400 text-indigo-950 border-white/50 scale-110 z-10' : 'bg-indigo-900 text-white border-indigo-700'}`}>
                       <div className="flex items-center gap-6">
                          <span className="text-4xl md:text-6xl font-black italic opacity-40">#{i+1}</span>
                          <span className="text-3xl md:text-5xl font-black uppercase tracking-tighter">{p.name}</span>
                       </div>
                       <div className="text-right">
                          <span className="text-3xl md:text-5xl font-black">{p.score}</span>
                          <span className="text-[10px] uppercase font-black block tracking-widest">Total Pts</span>
                       </div>
                    </div>
                 ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-16 pt-8 border-t border-white/10">
                 <button onClick={restartGame} className="bg-indigo-600 hover:bg-indigo-500 px-12 py-5 rounded-2xl font-black text-xl md:text-2xl uppercase flex items-center gap-3 transition-colors shadow-xl">
                   <RotateCcw className="w-6 h-6" /> Play Again
                 </button>
                 <button onClick={() => window.location.reload()} className="bg-white text-indigo-950 px-12 py-5 rounded-2xl font-black text-xl md:text-2xl uppercase shadow-xl hover:bg-indigo-100 transition-colors">
                   Close Room
                 </button>
              </div>
           </div>
        )}
      </div>

      {/* Leaderboard Footer */}
      {room.status !== 'FINAL_PODIUM' && (
        <div className="bg-indigo-900 p-6 md:p-8 flex justify-center flex-wrap gap-4 md:gap-8 border-t-4 border-black/20 shadow-2xl max-h-[140px] overflow-hidden">
          {players.sort((a,b) => b.score - a.score).map((p, i) => (
            <div key={p.uid} className="flex items-center gap-4 bg-indigo-950/50 px-5 md:px-6 py-3 rounded-2xl border-2 border-indigo-700 shadow-inner group">
              <div className="font-black text-indigo-500 text-2xl italic group-hover:text-yellow-400 transition-colors">#{i+1}</div>
              <div className="text-left leading-tight">
                <p className="font-black uppercase text-[10px] md:text-xs tracking-tighter truncate max-w-[100px] text-indigo-100">{p.name}</p>
                <p className="font-black text-yellow-400 text-xl md:text-2xl leading-none mt-1">{p.score}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Player View ---
function PlayerView({ room, players, user, joinRoom, startSpeaking, stopSpeaking }) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [sneakyInput, setSneakyInput] = useState('');
  const [customHeckle, setCustomHeckle] = useState('');
  
  const me = players.find(p => p.uid === user?.uid);
  const isSpeaker = room?.currentSpeakerUid === user?.uid || room?.opponentUid === user?.uid;
  const isPlant = room?.plantUid === user?.uid;

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

  const sendHeckle = (e) => {
    e?.preventDefault();
    if (!customHeckle || me?.hecklesLeft <= 0) return;
    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code, 'players', user.uid), { hecklesLeft: me.hecklesLeft - 1 });
    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), {
      lastHeckle: { id: Math.random().toString(), text: customHeckle, sender: me.name }
    });
    setCustomHeckle('');
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-indigo-950 text-white flex flex-col items-center justify-center p-8 font-sans">
        <div className="flex flex-col items-center justify-center space-y-8 animate-pulse">
           <Loader2 className="w-16 h-16 text-yellow-400 animate-spin" />
           <p className="text-indigo-300 font-bold uppercase tracking-[0.3em] text-xs">Syncing Controller...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-indigo-950 text-white flex flex-col font-sans touch-none select-none overflow-hidden">
       {/* Player HUD */}
       <div className="p-4 bg-indigo-900 flex justify-between items-center border-b-2 border-black/20 shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-indigo-950 font-black shadow-inner">{me?.name?.charAt(0) || '?'}</div>
            <span className="font-black uppercase text-sm tracking-tight truncate max-w-[100px]">{me?.name}</span>
          </div>
          <div className="flex gap-4">
             <div className="text-right leading-none border-r border-white/10 pr-4">
                <p className="text-[10px] uppercase font-black text-indigo-400 mb-1">Ammo</p>
                <div className="flex gap-1">
                   {[...Array(MAX_HECKLES)].map((_, i) => (
                     <div key={i} className={`w-1.5 h-3 rounded-full ${i < (me?.hecklesLeft || 0) ? 'bg-red-500' : 'bg-indigo-950 opacity-30'}`} />
                   ))}
                </div>
             </div>
             <div className="text-right leading-none">
                <p className="text-[10px] uppercase font-black text-indigo-400 mb-1">Points</p>
                <p className="text-lg font-black text-yellow-400 tabular-nums">{me?.score || 0}</p>
             </div>
          </div>
       </div>

       <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          {room.status === 'LOBBY' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <div className="bg-indigo-900 p-10 rounded-[3rem] shadow-inner border-2 border-indigo-800 animate-pulse">
                <Users className="w-20 h-20 text-indigo-400" />
              </div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter">You're In!</h2>
              <p className="text-indigo-300 font-bold uppercase text-[10px] tracking-widest leading-relaxed">Relax and watch the big screen.<br/>The game will begin shortly.</p>
            </div>
          )}
          
          {room.status === 'ROUND_INTRO' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-center animate-in zoom-in">
               <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Next Round Starting</h2>
               <div className="bg-indigo-900 p-8 rounded-[2.5rem] border-2 border-indigo-800 shadow-xl w-full">
                  <div className="flex justify-center mb-6 scale-75">{ROUND_DETAILS[room.roundType].icon}</div>
                  <h3 className="text-4xl font-black italic mb-3 text-yellow-400 uppercase tracking-tighter">{ROUND_DETAILS[room.roundType].title}</h3>
                  <p className="text-indigo-200 text-xs leading-relaxed opacity-70">Pay attention to the rules on the TV!</p>
               </div>
            </div>
          )}

          {room.status === 'TOPIC_REVEAL' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-10 text-center">
              {isSpeaker ? (
                <>
                  <div className="bg-yellow-400 text-indigo-950 px-8 py-2 rounded-full font-black uppercase text-[10px] tracking-widest animate-bounce">It's Your Time!</div>
                  <h2 className="text-3xl font-black italic text-white leading-tight">"{room.topic}"</h2>
                  {room.roundType === 2 && room.sneakyWord && (
                    <div className="bg-emerald-500/20 p-6 rounded-2xl border-2 border-emerald-500/30 font-black text-2xl text-emerald-400 uppercase tracking-tighter">
                      Sneaky Word: {room.sneakyWord}
                    </div>
                  )}
                  <button onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), { prepCountdown: 0 })} className="w-full bg-white text-indigo-950 py-10 rounded-[2.5rem] font-black text-4xl uppercase shadow-xl tracking-tighter active:scale-95 transition-all">I'M READY!</button>
                  <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">Skip the timer and start debating</p>
                </>
              ) : isPlant && !room.sneakyWord ? (
                <>
                  <div className="text-emerald-400 font-black uppercase tracking-[0.3em] text-xs">The Plant</div>
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter">Sabotage Him!</h2>
                  <p className="text-indigo-300 text-sm">Type a secret word the speaker must use:</p>
                  <input type="text" maxLength={HECKLE_CHAR_LIMIT} className="w-full bg-indigo-900 p-6 rounded-2xl border-4 border-indigo-800 font-black text-3xl text-center focus:outline-none focus:border-emerald-500 text-white" value={sneakyInput} onChange={e => setSneakyInput(e.target.value)} />
                  <button onClick={setSneakyWord} className="w-full bg-emerald-500 text-indigo-950 py-6 rounded-[2rem] font-black text-2xl uppercase tracking-tighter shadow-lg">Plant Word</button>
                </>
              ) : (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black opacity-20 italic">"{room.topic}"</h2>
                  <div className="bg-indigo-900/50 p-8 rounded-[2rem] border border-white/5">
                    <p className="text-lg font-black uppercase text-indigo-400 tracking-widest animate-pulse">Speaker Prepping...</p>
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
                     <p className="text-yellow-400 font-black uppercase text-[10px] tracking-widest">Internal Clock Running</p>
                     <h2 className="text-5xl font-black italic uppercase tracking-tighter">JUST TALK!</h2>
                   </div>
                   <div className="w-64 h-64 rounded-full border-[16px] border-indigo-900 flex items-center justify-center relative shadow-inner bg-indigo-950">
                     <div className="absolute inset-0 rounded-full border-8 border-yellow-400 animate-ping opacity-10"></div>
                     <Mic2 className="w-20 h-20 text-yellow-400 opacity-10" />
                   </div>
                   <button onClick={handleStopSpeak} className="w-full bg-red-500 py-12 rounded-[3rem] font-black text-5xl uppercase tracking-tighter shadow-[0_12px_0_rgb(150,0,0)] active:translate-y-3 active:shadow-none transition-all">STOP!</button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col space-y-6">
                   <div className="bg-indigo-900/50 p-6 rounded-[2rem] border border-white/5 text-center">
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Speaker Defending</p>
                     <h3 className="text-lg font-black italic uppercase tracking-tighter leading-tight opacity-50">"{room.topic}"</h3>
                   </div>
                   
                   <form onSubmit={sendHeckle} className="space-y-4">
                      <div className="text-center space-y-2">
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Distract Them</p>
                        <input 
                          type="text" 
                          placeholder="TYPE A HECKLE..." 
                          maxLength={HECKLE_CHAR_LIMIT} 
                          className="w-full bg-indigo-900 p-6 rounded-[2rem] border-4 border-indigo-800 font-black text-2xl text-center focus:outline-none focus:border-red-500 text-white"
                          value={customHeckle}
                          onChange={e => setCustomHeckle(e.target.value)}
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={me?.hecklesLeft <= 0 || !customHeckle}
                        className="w-full bg-red-500 text-white p-7 rounded-[2rem] border-b-8 border-red-900 font-black uppercase text-3xl flex items-center justify-center gap-4 active:translate-y-2 active:border-b-0 disabled:opacity-20 disabled:grayscale transition-all shadow-xl"
                      >
                         <Megaphone className="w-8 h-8" /> FIRE!
                      </button>
                   </form>

                   <div className="mt-auto bg-indigo-900/30 p-4 rounded-2xl flex justify-center items-center gap-2">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mr-2">Shots Left:</p>
                      {[...Array(MAX_HECKLES)].map((_, i) => (
                        <div key={i} className={`w-3 h-3 rounded-full transition-all duration-500 ${i < (me?.hecklesLeft || 0) ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-indigo-950 opacity-20'}`}></div>
                      ))}
                   </div>
                </div>
              )}
            </div>
          )}

          {room.status === 'VOTING' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in zoom-in">
               <h2 className="text-4xl font-black uppercase text-pink-500 italic tracking-tighter">Vibe Check!</h2>
               <p className="text-center text-indigo-300 font-bold uppercase text-xs tracking-widest mb-4">Tap who won the debate!</p>
               <button onClick={() => castVote(room.currentSpeakerUid)} className="w-full bg-indigo-900 p-10 rounded-[2.5rem] border-4 border-indigo-800 font-black text-2xl uppercase tracking-tighter active:bg-yellow-400 active:text-indigo-950 transition-all shadow-xl">
                 {players.find(p => p.uid === room.currentSpeakerUid)?.name}
               </button>
               <button onClick={() => castVote(room.opponentUid)} className="w-full bg-indigo-900 p-10 rounded-[2.5rem] border-4 border-indigo-800 font-black text-2xl uppercase tracking-tighter active:bg-yellow-400 active:text-indigo-950 transition-all shadow-xl">
                 {players.find(p => p.uid === room.opponentUid)?.name}
               </button>
            </div>
          )}

          {room.status === 'RESULTS' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in zoom-in">
               <div className="relative">
                 <div className="absolute inset-0 blur-2xl bg-yellow-400/20 rounded-full animate-pulse"></div>
                 <Trophy className="w-24 h-24 text-yellow-400 relative" />
               </div>
               <h2 className="text-4xl font-black uppercase italic tracking-tighter">Turn Finished</h2>
               <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">Calculating scores on the TV...</p>
            </div>
          )}

          {room.status === 'FINAL_PODIUM' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
               <Trophy className="w-24 h-24 text-yellow-400 animate-bounce" />
               <h2 className="text-4xl font-black uppercase italic tracking-tighter">GAME OVER</h2>
               <p className="text-indigo-300 font-bold uppercase text-xs tracking-widest">Look up to see if you won!</p>
            </div>
          )}
       </div>
    </div>
  );
}