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
  deleteDoc,
  query
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
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
  Send, 
  ThumbsUp, 
  ThumbsDown, 
  Sparkles,
  HelpCircle
} from 'lucide-react';

// --- Firebase Initialization ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyDWQWZdm-tGIQ1kxZLqr9gcAA4EY85MXx8", 
      authDomain: "heres-my-point.firebaseapp.com",
      projectId: "heres-my-point",
      storageBucket: "heres-my-point.firebasestorage.app",
      messagingSenderId: "979742060620",
      appId: "1:979742060620:web:67c625cb61c0728dffc4e9"
    };

const appId = typeof __app_id !== 'undefined' ? __app_id : 'heres-my-point-production';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Constants ---
const AUDIO_FILE_COUNT = 5; 
const MAX_HECKLES = 12;
const HECKLE_CHAR_LIMIT = 20;

const TOPICS = [
  "Is a hot dog a sandwich?", "Does a straw have one hole or two?", "Does pineapple belong on pizza?",
  "Is cereal a soup?", "Is a burrito a wrap?", "Is sparkling water good or does it taste like static?",
  "Should ketchup be kept in the fridge or the pantry?", "Is deep-dish pizza actually pizza or a casserole?",
  "Is a taco a sandwich?", "Should the milk go in before or after the cereal?", "Is cheesecake a cake or a pie?",
  "Is a Pop-Tart a ravioli?", "Is white chocolate actually chocolate?", "Should fries be eaten with your hands or a fork?",
  "Is a corn dog a popsicle?", "Is smooth peanut butter better than crunchy?", "Is iced coffee with melted ice still iced coffee?",
  "Is orange juice better with or without pulp?", "Do ice cubes belong in wine?", "Are boneless wings just chicken nuggets?",
  "Is a bagel just a bread donut?", "Should pizza be eaten tip-first or crust-first?", "Is a burger a sandwich?",
  "Is putting ketchup on steak acceptable or a crime?", "Is water wet?", "How many holes does a pair of pants have?",
  "Is a thumb a finger?", "Is 2-in-1 shampoo and conditioner a scam?", "Is the letter 'Y' a vowel or a consonant?",
  "Is a square a rectangle?", "If you replace every part of a boat, is it still the same boat?",
  "Is The Nightmare Before Christmas a Halloween or Christmas movie?", "Is the 'S' or the 'C' in 'Scent' silent?",
  "Is zero a number or just a placeholder?", "Does 'bi-weekly' mean twice a week or every two weeks?",
  "Is a tomato a fruit or a vegetable?", "Is it okay to wear socks with sandals?", "Should you make your bed every single day?",
  "Is it pronounced 'Gif' or 'Jif'?", "Is a nap a sign of health or laziness?", "Should toilet paper hang over or under the roll?",
  "Is Die Hard a Christmas movie?", "How many times can you wear jeans before washing them?",
  "Is a morning shower or a night shower better?", "Is it weird to go to the cinema alone?",
  "Should you peel a banana from the stem or the bottom?", "Are cargo shorts stylish or ugly?",
  "Is it called 'Soda' or 'Pop'?", "Is it pronounced 'Day-ta' or 'Dah-ta'?", "Should you tip for a takeout order?",
  "Is ghosting after one date ever okay?", "Are e-books 'real' books?", "Is being 'on time' early or exactly at the minute?",
  "Should 'unlimited' data be truly unlimited?", "Do phones belong at the dinner table?", "Is clapping when a plane lands nice or cringe?",
  "Were Ross and Rachel 'on a break'?", "Is Shrek the best animated movie ever?", "Are the Star Wars prequels actually good?",
  "Is Batman a superhero if he has no powers?", "Is reality TV real or scripted?", "Is the book always better than the movie?",
  "Is Harry Potter better than Lord of the Rings?", "Are Marvel movies 'cinema'?", "Is Taylor Swift the best songwriter of her generation?",
  "Is The Office US better than The Office UK?", "How long should you wait before posting spoilers?",
  "Is TikTok ruining or helping the music industry?", "Is binge-watching better than weekly episode releases?",
  "Is Mario or Luigi the better brother?", "Is anime just cartoons?", "What is the rudest animal in the world?",
  "Are cats better than dogs?", "Is a zebra white with black stripes or black with white stripes?",
  "Are spiders cute or terrifying?", "Is a fish a pet or a decoration?", "If a dog wore pants, would they cover two legs or four?",
  "Are pigeons cool birds or rats with wings?", "Is keeping a bird in a cage cruel?", "Which is the better pet: a dragon or a unicorn?",
  "Should Pluto be a planet?", "Was the color 'orange' named after the fruit?", "Is it a couch or a sofa?",
  "Is the glass half full or half empty?", "Is luck real or just math?", "Should the penny be abolished?",
  "Is it a napkin or a serviette?", "Is 'Y'all' the best plural pronoun?", "Is it a remote or a clicker?",
  "Is it 'Math' or 'Maths'?", "Is super strength or flight the better superpower?", "Is clipping your nails in public a crime?",
  "Is breakfast actually the most important meal of the day?", "Is wearing pajamas in public acceptable?",
  "Do 'hot takes' games cause too much drama?", "Is Apple better than Android?", "Is winter or summer the best season?",
  "Is washing dishes by hand better than using a dishwasher?", "Are video games a form of art?",
  "Is the ocean better than the mountains?", "Is dark mode or light mode superior?",
  "Is it better to have a window seat or an aisle seat on a plane?", "Should you listen to Christmas music before December?",
  "Is it acceptable to wear pajamas on a flight?", "Is it better to stay up late or wake up early?",
  "Is it okay to go to sleep with the TV on?", "Is it better to be the driver or the passenger on a long road trip?",
  "Should you always take your shoes off when entering someone’s house?", "Should you tell someone they have food in their teeth if you just met them?",
  "Should you brush your teeth before or after your morning coffee or tea?", "Is it okay to listen to music without headphones in public?",
  "Should the person who didn't cook always do the dishes?", "Is it better to live in a city or the countryside?",
  "Should you be allowed to recline your seat on a short flight?", "Is it okay to wear a hat inside a restaurant?",
  "Should you wash new clothes before you wear them for the first time?", "Should you pay for a first date or split the bill?",
  "Is it better to travel to a new place or return to a favorite one?", "Is it okay to stay in your 'outside clothes' on the bed?",
  "Should you finish a movie even if you aren't enjoying it?", "Is it better to be overdressed or underdressed for an event?",
  "Is it better to have a lot of friends or a few close ones?", "Is it better to receive a text or a phone call?",
  "Is it better to be the first one at a party or the last to leave?", "Should you let your pet sleep in the bed with you?"
];

const ROUND_DETAILS = {
  1: {
    title: "Solo Standard",
    description: "Defend your prompt for exactly 30 seconds. One player at a time. Pure internal timing.",
    icon: <Mic2 className="w-16 h-16 text-yellow-400" />
  },
  2: {
    title: "The Plant & The Interrogation",
    description: "A secret word is 'Planted' AND the audience submits questions. You have 30s to talk and 15s to answer the bonus question!",
    icon: <MessageSquare className="w-16 h-16 text-emerald-400" />
  },
  3: {
    title: "The Face-Off",
    description: "Pairs of players. One topic. At 15s, SWITCH! Player 2 must immediately argue the opposite side!",
    icon: <Swords className="w-16 h-16 text-pink-400" />
  }
};

// --- Helper Logic ---
const calculatePoints = (duration) => {
  let score = Math.max(0, Math.floor(1000 - (Math.abs(30.0 - duration) * 100)));
  if (Math.abs(30.0 - duration) <= 0.2) score += 500;
  return score;
};

// --- Main App Logic ---
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

  // Authentication Sequence (Rule 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { setError("Auth Sync Failed."); } 
      finally { setAuthLoading(false); }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // Data Sync
  useEffect(() => {
    if (!roomCode || !user) return;
    
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const unsubRoom = onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoom(data);
        if (data.lastHeckle?.id !== lastHeckle?.id) {
          setLastHeckle(data.lastHeckle);
          if (role === 'host') {
            const randomIndex = Math.floor(Math.random() * AUDIO_FILE_COUNT) + 1;
            new Audio(`/sounds/sound${randomIndex}.mp3`).play().catch(() => {});
          }
        }
      } else if (role === 'player') { 
        setRole(null);
        setRoom(null); 
        setError('The Host closed the room.'); 
      }
    });

    const playersRef = collection(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players');
    const unsubPlayers = onSnapshot(playersRef, (snap) => {
      setPlayers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    });
    
    return () => { unsubRoom(); unsubPlayers(); };
  }, [roomCode, user, role, lastHeckle]);

  // --- Handlers ---
  const createRoom = async () => {
    if (!user) return;
    try {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code), {
        code, status: 'LOBBY', hostUid: user.uid, roundNum: 0, turnIdx: 0, lastHeckle: null,
        createdAt: serverTimestamp()
      });
      setRoomCode(code); setRole('host');
    } catch (err) { setError("Permission denied."); }
  };

  const joinRoom = async (e) => {
    e?.preventDefault();
    if (!user || roomCode.length < 4) return;
    try {
      const code = roomCode.toUpperCase();
      const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code));
      if (!snap.exists()) return setError('Room not found.');
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code, 'players', user.uid), {
        uid: user.uid, name: playerName || `Player ${user.uid.slice(0,3)}`, score: 0, hecklesLeft: MAX_HECKLES
      });
      setRoomCode(code); setRole('player');
    } catch (err) { setError("Join failed."); }
  };

  const startNextRound = async () => {
    if (!user) return;
    const nextRound = (room.roundNum || 0) + 1;
    if (nextRound > 3) return updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { status: 'FINAL_PODIUM' });

    // Generate strict round order
    const shuffledIds = players.map(p => p.uid).sort(() => Math.random() - 0.5);

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), {
      status: 'ROUND_INTRO',
      roundNum: nextRound,
      roundType: nextRound,
      turnIdx: 0,
      roundOrder: shuffledIds,
      questions: [] // Clear questions for R2
    });
  };

  const setupTurn = async () => {
    if (!user || !room.roundOrder) return;
    const roundType = room.roundType;
    const turnIdx = room.turnIdx || 0;
    const limit = roundType === 3 ? Math.ceil(players.length / 2) : players.length;
    
    if (turnIdx >= limit) return startNextRound();

    let turnData = { 
      status: 'TOPIC_REVEAL', 
      topic: TOPICS[Math.floor(Math.random() * TOPICS.length)], 
      plantUid: null, 
      sneakyWord: null, 
      opponentUid: null,
      prepCountdown: 10,
      votes: {},
      questions: [],
      chosenQuestion: null
    };
    
    if (roundType === 1 || roundType === 2) {
      turnData.currentSpeakerUid = room.roundOrder[turnIdx];
      if (roundType === 2) {
        const others = players.filter(p => p.uid !== turnData.currentSpeakerUid);
        turnData.plantUid = others[Math.floor(Math.random() * others.length)].uid;
      }
    } else {
      // Round 3 Pairing
      turnData.currentSpeakerUid = room.roundOrder[turnIdx * 2];
      // If odd, pick a random previous player as opponent
      const secondId = room.roundOrder[turnIdx * 2 + 1];
      if (secondId) {
        turnData.opponentUid = secondId;
      } else {
        const ghost = players.find(p => p.uid !== turnData.currentSpeakerUid);
        turnData.opponentUid = ghost.uid;
        turnData.ghostOpponent = true; // Mark that opponent won't get double points
      }
    }

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), turnData);
  };

  const stopSpeaking = async (duration) => {
    if (!room || !user) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const scoreVal = calculatePoints(duration);

    const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', room.currentSpeakerUid);
    const pSnap = await getDoc(pRef);
    const curTotal = pSnap.data().score || 0;

    if (room.roundType === 3) {
      const split = scoreVal / 2;
      await updateDoc(pRef, { score: curTotal + split, lastTurnScore: split, lastTurnTime: duration });
      if (!room.ghostOpponent) {
        const opRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', room.opponentUid);
        const opSnap = await getDoc(opRef);
        await updateDoc(opRef, { score: (opSnap.data().score || 0) + split });
      }
      await updateDoc(roomRef, { status: 'VOTING_VIBE' });
    } else if (room.roundType === 2) {
      await updateDoc(pRef, { score: curTotal + scoreVal, lastTurnScore: scoreVal, lastTurnTime: duration });
      await updateDoc(roomRef, { status: 'VOTING_WORD' });
    } else {
      await updateDoc(pRef, { score: curTotal + scoreVal, lastTurnScore: scoreVal, lastTurnTime: duration });
      await updateDoc(roomRef, { status: 'RESULTS' });
    }
  };

  const restartGame = async () => {
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    await updateDoc(roomRef, { 
      status: 'LOBBY', roundNum: 0, turnIdx: 0, currentSpeakerUid: null, opponentUid: null, lastHeckle: null
    });
    for (const p of players) {
      const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', p.uid);
      await updateDoc(pRef, { score: 0, hecklesLeft: MAX_HECKLES });
    }
  };

  if (authLoading) return <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center text-white"><Loader2 className="animate-spin mb-4" /><p className="uppercase text-xs font-bold tracking-widest">Waking Up...</p></div>;

  if (!role) {
    return (
      <div className="min-h-screen bg-indigo-950 text-white flex flex-col items-center justify-center p-8 font-sans overflow-hidden">
        <div className="max-w-md w-full text-center space-y-12 animate-in fade-in zoom-in duration-500">
          <div className="space-y-4">
            <h1 className="text-6xl md:text-7xl font-black italic text-yellow-400 uppercase tracking-tighter drop-shadow-2xl transform -rotate-2 leading-none">HERE'S MY POINT!</h1>
            <p className="text-indigo-400 font-bold uppercase text-xs tracking-[0.4em]">The Unpopular Opinion Party Game</p>
          </div>
          <div className="grid gap-6">
            <button onClick={createRoom} className="group relative bg-indigo-600 hover:bg-indigo-500 p-8 rounded-[2.5rem] flex items-center justify-between border-b-8 border-indigo-900 shadow-2xl"><div className="text-left relative z-10"><p className="font-black text-2xl uppercase italic leading-none mb-1">Host Game</p><p className="text-indigo-300 text-sm font-bold">Project on Big Screen</p></div><Monitor className="w-12 h-12 text-indigo-300 group-hover:text-yellow-400 transition-colors" /></button>
            <div className="bg-indigo-900/40 p-8 rounded-[2.5rem] border-2 border-indigo-800 space-y-6 text-left shadow-xl"><div className="flex items-center gap-2 text-indigo-300"><Smartphone className="w-5 h-5" /><p className="font-black uppercase text-[10px] tracking-[0.2em]">Join the Party</p></div>
              <form onSubmit={joinRoom} className="space-y-4">
                <input type="text" placeholder="CODE" maxLength={4} className="w-full bg-indigo-950 text-center font-black text-5xl py-4 rounded-3xl uppercase text-white border-2 border-indigo-800 outline-none focus:ring-4 focus:ring-yellow-400" value={roomCode} onChange={e => setRoomCode(e.target.value)} />
                <input type="text" placeholder="NAME" className="w-full bg-indigo-900 p-5 rounded-2xl font-bold border-2 border-indigo-800 outline-none focus:border-indigo-400 text-indigo-100 uppercase" value={playerName} onChange={e => setPlayerName(e.target.value)} />
                <button type="submit" className="w-full bg-yellow-400 text-indigo-950 py-6 rounded-[2rem] font-black text-2xl uppercase shadow-lg hover:bg-yellow-300 transition-all active:scale-95">ENTER LOBBY</button>
              </form>
            </div>
          </div>
          {error && <div className="bg-red-500/20 text-red-400 p-3 rounded-xl border border-red-500/50 text-xs font-bold">{error}</div>}
        </div>
      </div>
    );
  }

  return role === 'host' ? (
    <HostView room={room} players={players} roomCode={roomCode} startNextRound={startNextRound} setupTurn={setupTurn} startSpeaking={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { status: 'SPEAKING', startTime: Date.now() })} lastHeckle={lastHeckle} restartGame={restartGame} stopSpeaking={stopSpeaking} />
  ) : (
    <PlayerView room={room} players={players} user={user} stopSpeaking={stopSpeaking} />
  );
}

// --- Host View ---
function HostView({ room, players, roomCode, startNextRound, setupTurn, startSpeaking, lastHeckle, restartGame, stopSpeaking }) {
  const [speakTime, setSpeakTime] = useState(0);
  const [interroTime, setInterroTime] = useState(15);

  useEffect(() => {
    let timer;
    const canStartPrep = room?.status === 'TOPIC_REVEAL' && (room.roundType !== 2 || room.sneakyWord);
    if (canStartPrep && room.prepCountdown > 0) {
      timer = setInterval(() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { prepCountdown: room.prepCountdown - 1 }), 1000);
    } else if (canStartPrep && room.prepCountdown === 0) startSpeaking();
    return () => clearInterval(timer);
  }, [room?.status, room?.prepCountdown, room?.sneakyWord]);

  useEffect(() => {
    let speakTimer;
    if (room?.status === 'SPEAKING') {
      speakTimer = setInterval(() => {
        const diff = (Date.now() - room.startTime) / 1000;
        setSpeakTime(diff);
        if (room.roundType === 3 && diff >= 15 && !room.isSecondHalf) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { isSecondHalf: true });
      }, 100);
    } else setSpeakTime(0);
    return () => clearInterval(speakTimer);
  }, [room?.status]);

  useEffect(() => {
    let qTimer;
    if (room?.status === 'INTERROGATION' && interroTime > 0) {
      qTimer = setInterval(() => setInterroTime(t => t - 1), 1000);
    } else if (room?.status === 'INTERROGATION' && interroTime === 0) {
      updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { status: 'RESULTS' });
    }
    return () => { clearInterval(qTimer); if(room?.status !== 'INTERROGATION') setInterroTime(15); };
  }, [room?.status, interroTime]);

  if (!room) return <div className="min-h-screen bg-indigo-950 flex items-center justify-center p-8"><Loader2 className="w-12 h-12 text-yellow-400 animate-spin" /></div>;

  const speaker = players.find(p => p.uid === room.currentSpeakerUid);
  const opponent = players.find(p => p.uid === room.opponentUid);
  const sortedWinners = [...players].sort((a,b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-indigo-950 text-white flex flex-col font-sans overflow-hidden select-none">
      <div className="p-6 md:p-8 bg-indigo-900/80 backdrop-blur-md flex justify-between items-center border-b-4 border-black/20 shadow-2xl relative z-20 shrink-0">
        <h1 className="text-3xl md:text-4xl font-black italic text-yellow-400 tracking-tighter uppercase shrink-0">HERE'S MY POINT!</h1>
        <div className="flex items-center gap-4 md:gap-6 overflow-hidden">
          <div className="px-4 md:px-6 py-2 bg-indigo-950 rounded-full border-2 border-indigo-700 shadow-inner flex items-center"><span className="text-indigo-400 font-bold uppercase text-[10px] mr-2 tracking-widest hidden sm:inline">Room Code:</span><span className="text-xl md:text-2xl font-black text-white">{roomCode}</span></div>
          <div className="bg-indigo-800 px-4 py-2 rounded-lg border border-white/10 text-indigo-100 font-bold uppercase text-[10px] shrink-0">{room.roundNum > 0 ? `Round ${room.roundNum}/3` : 'Lobby'}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative text-center overflow-hidden">
        {room.status === 'LOBBY' && (
          <div className="space-y-12 max-w-4xl animate-in zoom-in duration-500 w-full overflow-hidden">
             <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9]">Waiting for<br/><span className="text-yellow-400 italic">Opinionators</span></h2>
             <p className="text-2xl md:text-3xl text-indigo-200 font-bold">Use code <span className="text-white bg-indigo-800 px-4 py-1 rounded-xl shadow-lg border border-indigo-700">{roomCode}</span></p>
             <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-h-[250px] overflow-y-auto p-4 scrollbar-hide">
               {players.map((p, i) => (<div key={p.uid} className="bg-indigo-800 px-6 md:px-8 py-3 md:py-4 rounded-2xl border-b-4 border-indigo-950 font-black text-xl md:text-2xl animate-bounce shadow-lg" style={{ animationDelay: `${i*100}ms` }}>{p.name}</div>))}
             </div>
             {players.length >= 2 && <button onClick={startNextRound} className="bg-yellow-400 text-indigo-950 px-12 md:px-16 py-6 md:py-8 rounded-[2rem] font-black text-3xl md:text-4xl uppercase shadow-lg active:translate-y-2 transition-all">Start Show</button>}
          </div>
        )}

        {room.status === 'ROUND_INTRO' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-700 max-w-3xl w-full">
            <div className="flex justify-center mb-6 drop-shadow-2xl">{ROUND_DETAILS[room.roundType].icon}</div>
            <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-white leading-none">{ROUND_DETAILS[room.roundType].title}</h2>
            <div className="bg-white/5 border border-white/10 p-8 md:p-10 rounded-[3rem] backdrop-blur-md shadow-2xl">
              <p className="text-xl md:text-2xl text-indigo-100 leading-relaxed font-medium">{ROUND_DETAILS[room.roundType].description}</p>
            </div>
            <button onClick={setupTurn} className="bg-white text-indigo-900 px-12 py-5 rounded-2xl font-black text-3xl uppercase shadow-xl hover:scale-105 active:scale-95 transition-transform">Get Started</button>
          </div>
        )}

        {room.status === 'TOPIC_REVEAL' && (
          <div className="space-y-12 animate-in zoom-in duration-500 w-full max-w-5xl overflow-hidden">
            <div className="space-y-4"><p className="text-yellow-400 font-black uppercase tracking-[0.3em] text-xs md:text-sm italic">Current Controversy</p><h2 className="text-5xl md:text-8xl font-black italic leading-tight text-white drop-shadow-lg break-words px-4">"{room.topic}"</h2></div>
            <div className="flex justify-center gap-8 md:gap-16 items-center flex-wrap">
              <div className="space-y-2"><p className="text-indigo-400 uppercase font-black text-[10px] tracking-widest">Active Player</p><div className="text-3xl md:text-5xl font-black text-white uppercase">{speaker?.name}</div></div>
              {room.roundType === 3 && (<><Swords className="w-8 h-8 md:w-12 md:h-12 text-pink-500 animate-pulse" /><div className="space-y-2"><p className="text-indigo-400 uppercase font-black text-[10px] tracking-widest">Tag-Team Opponent</p><div className="text-3xl md:text-5xl font-black text-white uppercase">{opponent?.name}</div></div></>)}
            </div>
            <div className="flex flex-col items-center gap-6">
               {room.roundType === 2 && !room.sneakyWord ? (<div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-8 rounded-[2rem] animate-pulse"><p className="text-emerald-400 font-black uppercase text-xl italic tracking-tighter leading-none">The Plant is choosing the secret word...</p></div>) : (<div className="relative group"><div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-10 animate-pulse"></div><div className="relative bg-indigo-900/50 px-12 py-8 rounded-[3rem] border-2 border-indigo-700 flex flex-col items-center"><p className="text-indigo-400 font-black uppercase text-[10px] mb-2 tracking-[0.3em]">Preparation Clock</p><p className="text-8xl font-black text-white tabular-nums drop-shadow-glow">{room.prepCountdown}</p></div></div>)}
            </div>
          </div>
        )}

        {room.status === 'SPEAKING' && (
          <div className="space-y-12 w-full max-w-6xl animate-in fade-in duration-1000">
            <div className={`text-6xl md:text-9xl font-black italic mb-20 transition-all duration-500 drop-shadow-2xl break-words px-4 ${room.isSecondHalf ? 'text-pink-500 scale-105' : 'text-white'}`}>{room.roundType === 3 && !room.isSecondHalf ? `${speaker?.name}` : room.roundType === 3 ? `${opponent?.name}` : room.topic}</div>
            <div className="flex flex-col items-center gap-12">
              <div className="relative w-56 h-56 md:w-72 md:h-72 flex items-center justify-center">
                <div className="absolute inset-0 border-8 border-indigo-800 rounded-full"></div>
                <div className={`absolute inset-0 border-8 border-yellow-400 rounded-full animate-ping opacity-20`} style={{ animationDuration: '2s' }}></div>
                <Mic2 className="w-16 h-16 md:w-24 md:h-24 text-yellow-400 drop-shadow-glow" />
              </div>
              <div className="text-3xl md:text-4xl font-black uppercase text-indigo-400 tracking-widest h-20">{room.roundType === 3 && speakTime >= 14 && speakTime <= 16 ? <span className="text-pink-500 animate-bounce block text-8xl leading-none">SWITCH!</span> : "Internal Clock Active"}</div>
            </div>
            {lastHeckle && (
              <div key={lastHeckle.id} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-in zoom-in slide-in-from-bottom-20 duration-300 pointer-events-none z-50 w-full max-w-2xl text-center">
                <div className="bg-red-500 p-8 md:p-12 rounded-[3rem] text-white font-black text-5xl md:text-8xl shadow-2xl border-8 border-white/20 uppercase italic break-words mx-4">{lastHeckle.text}</div>
                <p className="mt-6 text-2xl font-bold bg-indigo-950 px-6 py-3 rounded-2xl border-2 border-white/20 shadow-xl inline-block">{lastHeckle.sender}</p>
              </div>
            )}
          </div>
        )}

        {room.status === 'VOTING_WORD' && (
           <div className="space-y-12 animate-in zoom-in w-full max-w-4xl">
              <h2 className="text-7xl font-black uppercase italic tracking-tighter text-emerald-400 leading-none">Sneaky Check!</h2>
              <div className="bg-indigo-900 p-12 rounded-[3rem] border-4 border-emerald-600 shadow-2xl space-y-6">
                 <p className="text-indigo-300 uppercase font-black tracking-widest leading-none">Sneaky Word Was:</p>
                 <h3 className="text-8xl font-black text-white uppercase italic tracking-tighter leading-none">"{room.sneakyWord}"</h3>
                 <p className="text-2xl text-white">Audience: Did they slip it in naturally?</p>
              </div>
              <div className="flex justify-center gap-12">
                 <div className="text-center"><p className="text-8xl font-black text-emerald-400">{Object.values(room.votes || {}).filter(v => v === 'YES').length}</p><p className="font-bold uppercase text-xs tracking-widest text-emerald-600">Yes</p></div>
                 <div className="text-center"><p className="text-8xl font-black text-red-400">{Object.values(room.votes || {}).filter(v => v === 'NO').length}</p><p className="font-bold uppercase text-xs tracking-widest text-red-600">No</p></div>
              </div>
              <button onClick={async () => {
                 const yes = Object.values(room.votes || {}).filter(v => v === 'YES').length;
                 const no = Object.values(room.votes || {}).filter(v => v === 'NO').length;
                 if (yes > no) {
                    const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', room.currentSpeakerUid);
                    await updateDoc(pRef, { score: (speaker.score || 0) + 300, lastTurnScore: (speaker.lastTurnScore || 0) + 300 });
                 }
                 const qList = room.questions || [];
                 if (qList.length > 0) {
                   const chosen = qList[Math.floor(Math.random() * qList.length)];
                   updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { status: 'INTERROGATION', chosenQuestion: chosen, votes: {} });
                 } else {
                   updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { status: 'RESULTS' });
                 }
              }} className="bg-white text-indigo-900 px-16 py-6 rounded-2xl font-black text-3xl uppercase active:scale-95 transition-transform">Tally & Interrogate</button>
           </div>
        )}

        {room.status === 'INTERROGATION' && (
          <div className="space-y-12 animate-in zoom-in w-full max-w-5xl">
            <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-indigo-400 leading-none">Interrogation!</h2>
            <div className="bg-white text-indigo-950 p-12 rounded-[4rem] shadow-2xl border-b-[16px] border-indigo-200">
               <p className="text-xs uppercase font-black tracking-[0.4em] mb-4 text-indigo-400">Audience Question</p>
               <h3 className="text-6xl font-black italic leading-tight">"{room.chosenQuestion?.text}"</h3>
               <p className="mt-4 text-sm font-bold uppercase tracking-widest">— asked by {room.chosenQuestion?.sender}</p>
            </div>
            <div className="flex flex-col items-center gap-4">
               <p className="text-xl font-black uppercase text-white tracking-widest">Answer in:</p>
               <p className="text-[12rem] font-black leading-none tabular-nums text-yellow-400 animate-pulse">{interroTime}</p>
            </div>
            <div className="flex justify-center gap-12">
               <div className="text-center"><p className="text-6xl font-black text-indigo-400">{Object.values(room.votes || {}).filter(v => v === 'SMOOTH').length}</p><p className="font-bold text-xs uppercase tracking-widest">Smooth (+200)</p></div>
               <div className="text-center"><p className="text-6xl font-black text-red-400">{Object.values(room.votes || {}).filter(v => v === 'RATTLED').length}</p><p className="font-bold text-xs uppercase tracking-widest">Rattled</p></div>
            </div>
          </div>
        )}

        {room.status === 'VOTING_VIBE' && (
          <div className="space-y-12 animate-in zoom-in w-full max-w-5xl">
            <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-pink-400 leading-none">Vibe Check!</h2>
            <p className="text-2xl text-indigo-300 font-bold uppercase tracking-widest leading-none">Who won the debate?</p>
            <div className="flex justify-center gap-6 md:gap-12 flex-wrap">
              <div className="bg-indigo-900/50 p-10 md:p-12 rounded-[3rem] border-4 border-indigo-700 min-w-[280px] md:min-w-[350px]"><p className="text-7xl md:text-9xl font-black text-white tabular-nums">{Object.values(room.votes || {}).filter(v => v === speaker?.uid).length}</p><p className="text-2xl md:text-3xl font-black mt-6 uppercase text-indigo-300">{speaker?.name}</p></div>
              <div className="bg-indigo-900/50 p-10 md:p-12 rounded-[3rem] border-4 border-indigo-700 min-w-[280px] md:min-w-[350px]"><p className="text-7xl md:text-9xl font-black text-white tabular-nums">{Object.values(room.votes || {}).filter(v => v === opponent?.uid).length}</p><p className="text-2xl md:text-3xl font-black mt-6 uppercase text-indigo-300">{opponent?.name}</p></div>
            </div>
            <button onClick={async () => {
                const sVotes = Object.values(room.votes || {}).filter(v => v === speaker?.uid).length;
                const oVotes = Object.values(room.votes || {}).filter(v => v === opponent?.uid).length;
                const winnerUid = sVotes >= oVotes ? speaker.uid : opponent.uid;
                const winRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', winnerUid);
                const winSnap = await getDoc(winRef);
                if (winSnap.exists()) await updateDoc(winRef, { score: (winSnap.data().score || 0) + 500 });
                updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { status: 'RESULTS' });
            }} className="bg-white text-indigo-900 px-12 md:px-16 py-5 md:py-6 rounded-2xl font-black text-2xl md:text-3xl uppercase active:scale-95 transition-transform">Award bonus</button>
          </div>
        )}

        {room.status === 'RESULTS' && (
          <div className="space-y-12 animate-in zoom-in w-full overflow-hidden">
             <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-white">Results</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto px-4 text-center">
                <div className="bg-indigo-900/50 p-10 md:p-16 rounded-[3rem] border-2 border-white/10 shadow-2xl overflow-hidden text-center"><p className="text-indigo-400 font-black uppercase text-xl md:text-2xl tracking-widest mb-4">Final Time</p><p className="text-[6rem] md:text-[10rem] font-black text-yellow-400 leading-none">{(speaker?.lastTurnTime || 0).toFixed(2)}s</p></div>
                <div className="bg-indigo-900/50 p-10 md:p-16 rounded-[3rem] border-2 border-white/10 shadow-2xl overflow-hidden text-center"><p className="text-indigo-400 font-black uppercase text-xl md:text-2xl tracking-widest mb-4">Total Gained</p><p className="text-[6rem] md:text-[10rem] font-black text-white leading-none">+{speaker?.lastTurnScore || 0}</p></div>
             </div>
             <button onClick={() => { updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { turnIdx: room.turnIdx + 1 }); setupTurn(); }} className="bg-yellow-400 text-indigo-950 px-12 md:px-16 py-6 md:py-8 rounded-3xl font-black text-3xl md:text-4xl uppercase shadow-lg hover:scale-105 active:scale-95 transition-transform">Next Opinion</button>
          </div>
        )}

        {room.status === 'FINAL_PODIUM' && (
           <div className="space-y-12 animate-in slide-in-from-bottom-20 duration-1000 w-full max-w-4xl px-4 overflow-hidden relative">
              <Confetti />
              <Trophy className="w-32 h-32 md:w-48 md:h-48 text-yellow-400 mx-auto animate-bounce relative z-10 drop-shadow-glow" />
              <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-white leading-none">The Winners</h2>
              <div className="grid gap-4 mt-12 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">{sortedWinners.slice(0, 3).map((p, i) => (<div key={p.uid} className={`flex items-center justify-between p-6 md:p-8 rounded-[2.5rem] border-4 backdrop-blur-md shadow-2xl ${i === 0 ? 'bg-yellow-400 text-indigo-950 border-white/50 scale-105' : 'bg-indigo-900 text-white border-indigo-700 opacity-80'}`}><div className="flex items-center gap-6"><span className="text-4xl md:text-6xl font-black italic opacity-40">#{i+1}</span><span className="text-3xl md:text-5xl font-black uppercase tracking-tighter truncate max-w-[200px]">{p.name}</span></div><div className="text-right"><span className="text-3xl md:text-5xl font-black">{p.score}</span><span className="text-[10px] uppercase font-black block tracking-widest">Points</span></div></div>))}</div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12 pt-8 border-t border-white/10 shrink-0 relative z-20"><button onClick={restartGame} className="bg-indigo-600 hover:bg-indigo-500 px-12 py-5 rounded-2xl font-black text-xl md:text-2xl uppercase flex items-center gap-3 transition-colors shadow-xl active:scale-95"><RotateCcw className="w-6 h-6" /> Play Again</button><button onClick={() => window.location.reload()} className="bg-white text-indigo-950 px-12 py-5 rounded-2xl font-black text-xl md:text-2xl uppercase shadow-xl hover:bg-indigo-100 transition-colors active:scale-95">End Show</button></div>
           </div>
        )}
      </div>

      {room.status !== 'FINAL_PODIUM' && room.status !== 'LOBBY' && (
        <div className="bg-indigo-900 p-6 md:p-8 flex justify-center flex-wrap gap-4 md:gap-8 border-t-4 border-black/20 shadow-2xl max-h-[140px] overflow-hidden shrink-0">{players.sort((a,b) => b.score - a.score).map((p, i) => (<div key={p.uid} className="flex items-center gap-4 bg-indigo-950/50 px-5 md:px-6 py-3 rounded-2xl border-2 border-indigo-700 shadow-inner group transition-all"><div className="font-black text-indigo-500 text-2xl italic group-hover:text-yellow-400">#{i+1}</div><div className="text-left leading-tight"><p className="font-black uppercase text-[10px] md:text-xs tracking-tighter truncate max-w-[80px] text-indigo-100 uppercase">{p.name}</p><p className="font-black text-yellow-400 text-xl md:text-2xl leading-none mt-1">{p.score}</p></div></div>))}</div>
      )}
    </div>
  );
}

// --- Player View ---
function PlayerView({ room, players, user, stopSpeaking }) {
  const [sneakyInput, setSneakyInput] = useState('');
  const [questionInput, setQuestionInput] = useState('');
  const [customHeckle, setCustomHeckle] = useState('');
  
  const me = players.find(p => p.uid === user?.uid);
  const isSpeaker = room?.currentSpeakerUid === user?.uid;
  const isOpponent = room?.opponentUid === user?.uid;
  const isPlant = room?.plantUid === user?.uid;

  const handleStopSpeak = () => stopSpeaking((Date.now() - room.startTime) / 1000);
  const setSneakyWord = () => { if (!sneakyInput) return; updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), { sneakyWord: sneakyInput.toUpperCase() }); setSneakyInput(''); };
  const castVote = (val) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), { [`votes.${user.uid}`]: val });
  const sendHeckle = (e) => { e?.preventDefault(); if (!customHeckle || (me?.hecklesLeft || 0) <= 0) return; updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code, 'players', user.uid), { hecklesLeft: me.hecklesLeft - 1 }); updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), { lastHeckle: { id: Math.random().toString(), text: customHeckle.toUpperCase(), sender: me.name } }); setCustomHeckle(''); };
  const submitQuestion = (e) => { e?.preventDefault(); if (!questionInput) return; updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), { questions: [...(room.questions || []), { text: questionInput, sender: me.name, id: Math.random().toString() }] }); setQuestionInput(''); };

  if (!room) return <div className="min-h-screen bg-indigo-950 flex items-center justify-center p-8"><Loader2 className="w-16 h-16 text-yellow-400 animate-spin" /></div>;

  return (
    <div className="min-h-[100dvh] bg-indigo-950 text-white flex flex-col font-sans touch-none select-none overflow-hidden max-w-full uppercase">
       <div className="p-4 bg-indigo-900 flex justify-between items-center border-b-2 border-black/20 shadow-md shrink-0">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-indigo-950 font-black">{me?.name?.charAt(0) || '?'}</div><span className="font-black text-sm truncate max-w-[100px]">{me?.name}</span></div>
          <div className="flex gap-4">
             <div className="text-right leading-none border-r border-white/10 pr-4"><p className="text-[10px] font-black text-indigo-400 mb-1 leading-none">Ammo</p><div className="flex gap-1">{[...Array(MAX_HECKLES)].map((_, i) => (<div key={i} className={`w-1 h-2 rounded-full ${i < (me?.hecklesLeft || 0) ? 'bg-red-500' : 'bg-indigo-950 opacity-30'}`} />))}</div></div>
             <div className="text-right leading-none"><p className="text-[10px] font-black text-indigo-400 mb-1 leading-none">Score</p><p className="text-lg font-black text-yellow-400 tabular-nums">{me?.score || 0}</p></div>
          </div>
       </div>

       <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          {room.status === 'LOBBY' && <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6"><Users className="w-20 h-20 text-indigo-400 animate-pulse" /><h2 className="text-4xl font-black uppercase italic tracking-tighter">HERE'S MY POINT!</h2><p className="text-indigo-300 font-bold uppercase text-[10px] tracking-widest leading-relaxed text-center">Connected to Show<br/>Watch the big screen.</p></div>}
          
          {room.status === 'ROUND_INTRO' && <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-center animate-in zoom-in"><div className="bg-indigo-900 p-8 rounded-[2.5rem] border-2 border-indigo-800 shadow-xl w-full"><div className="flex justify-center mb-6 scale-75">{ROUND_DETAILS[room.roundType].icon}</div><h3 className="text-4xl font-black italic mb-3 text-yellow-400 uppercase tracking-tighter">{ROUND_DETAILS[room.roundType].title}</h3><p className="text-indigo-200 text-xs leading-relaxed opacity-70 italic">Watch the TV for round rules!</p></div></div>}

          {room.status === 'TOPIC_REVEAL' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-10 text-center max-w-full">
              {(isSpeaker || (isOpponent && room.roundType === 3)) ? (
                <>
                  <div className="bg-yellow-400 text-indigo-950 px-8 py-2 rounded-full font-black uppercase text-[10px] tracking-widest animate-bounce">It's Your Show!</div>
                  <h2 className="text-3xl font-black italic text-white leading-tight break-words max-w-full leading-none">"{room.topic}"</h2>
                  {room.roundType === 2 && room.sneakyWord && <div className="bg-emerald-500/20 p-6 rounded-2xl border-2 border-emerald-500/30 font-black text-xl text-emerald-400 uppercase tracking-tighter">Sneaky Word: {room.sneakyWord}</div>}
                  {isSpeaker && <button onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), { prepCountdown: 0 })} className="w-full bg-white text-indigo-950 py-10 rounded-[2.5rem] font-black text-4xl uppercase shadow-xl tracking-tighter active:scale-95 transition-all">READY!</button>}
                  {isOpponent && <div className="p-10 border-4 border-dashed border-indigo-700 rounded-[2.5rem] text-pink-400 font-black uppercase italic">You go second!<br/><span className="text-xs uppercase tracking-widest">Defend the opposite side</span></div>}
                </>
              ) : isPlant && !room.sneakyWord ? (
                <>
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter text-emerald-400 leading-none">You are<br/>The Plant!</h2>
                  <p className="text-indigo-300 text-sm">Pick a secret word the speaker must use:</p>
                  <input type="text" maxLength={HECKLE_CHAR_LIMIT} className="w-full bg-indigo-900 p-6 rounded-2xl border-4 border-indigo-800 font-black text-3xl text-center focus:border-emerald-500 text-white uppercase outline-none" value={sneakyInput} onChange={e => setSneakyInput(e.target.value)} />
                  <button onClick={setSneakyWord} className="w-full bg-emerald-500 text-indigo-950 py-6 rounded-[2rem] font-black text-2xl uppercase tracking-tighter shadow-lg active:scale-95">Sabotage!</button>
                </>
              ) : <div className="bg-indigo-900/50 p-10 rounded-[2rem] border border-white/5 w-full text-center"><p className="text-xl font-black uppercase text-indigo-400 tracking-widest animate-pulse">Wait for Setup...</p></div>}
            </div>
          )}

          {room.status === 'SPEAKING' && (
            <div className="flex-1 flex flex-col max-w-full">
              {(isSpeaker || isOpponent) ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-12">
                   <div className="text-center space-y-2"><p className="text-yellow-400 font-black uppercase text-[10px] tracking-widest leading-none">Mic is Active</p><h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none">{(isOpponent && !room.isSecondHalf) ? 'GET READY...' : (isSpeaker && room.isSecondHalf) ? 'WAIT...' : 'DEFEND!'}</h2></div>
                   <div className="w-64 h-64 rounded-full border-[16px] border-indigo-900 flex items-center justify-center relative bg-indigo-950 shadow-inner">{(isOpponent && room.isSecondHalf) || (isSpeaker && !room.isSecondHalf) ? <div className="absolute inset-0 rounded-full border-8 border-yellow-400 animate-ping opacity-10"></div> : null}<Mic2 className={`w-20 h-20 text-yellow-400 ${((isSpeaker && !room.isSecondHalf) || (isOpponent && room.isSecondHalf)) ? 'opacity-100 animate-pulse' : 'opacity-10'}`} /></div>
                   {((room.roundType !== 3 && isSpeaker) || (room.roundType === 3 && isOpponent && room.isSecondHalf)) && (<button onClick={handleStopSpeak} className="w-full bg-red-500 py-12 rounded-[3rem] font-black text-5xl uppercase tracking-tighter shadow-[0_12px_0_rgb(150,0,0)] active:translate-y-3 active:shadow-none transition-all">STOP!</button>)}
                </div>
              ) : (
                <div className="flex-1 flex flex-col space-y-6 max-w-full overflow-hidden">
                   <div className="bg-indigo-900/50 p-4 rounded-[2rem] border border-white/5 text-center"><p className="text-[10px] font-black text-indigo-400 tracking-widest mb-1 leading-none uppercase">Currently Active</p><h3 className="text-sm font-black italic truncate leading-none">"{room.topic}"</h3></div>
                   
                   {room.roundType === 2 && (
                     <form onSubmit={submitQuestion} className="bg-indigo-800/40 p-5 rounded-3xl border border-indigo-600/50 space-y-3">
                        <p className="text-[10px] font-black text-indigo-300 tracking-widest text-center">Interrogation Lab</p>
                        <input type="text" placeholder="ASK A QUESTION..." maxLength={50} className="w-full bg-indigo-950 p-4 rounded-2xl border-2 border-indigo-700 outline-none text-sm text-center" value={questionInput} onChange={e => setQuestionInput(e.target.value)} />
                        <button type="submit" disabled={!questionInput} className="w-full bg-indigo-400 text-indigo-950 py-3 rounded-2xl font-black text-xs">SUBMIT QUESTION</button>
                     </form>
                   )}

                   <form onSubmit={sendHeckle} className="space-y-4">
                      <div className="text-center space-y-2"><p className="text-[10px] font-black text-red-500 tracking-widest leading-none">Distraction Engine</p><input type="text" placeholder="TYPE A HECKLE..." maxLength={HECKLE_CHAR_LIMIT} className="w-full bg-indigo-900 p-6 rounded-[2rem] border-4 border-indigo-800 font-black text-2xl text-center focus:border-red-500 text-white uppercase outline-none" value={customHeckle} onChange={e => setCustomHeckle(e.target.value)} /></div>
                      <button type="submit" disabled={(me?.hecklesLeft || 0) <= 0 || !customHeckle} className="w-full bg-red-500 text-white p-7 rounded-[2rem] border-b-8 border-red-900 font-black uppercase text-3xl flex items-center justify-center gap-4 active:translate-y-2 active:border-b-0 shadow-xl disabled:opacity-10"><Megaphone className="w-8 h-8" /> FIRE!</button>
                   </form>
                   <div className="mt-auto flex justify-center items-center gap-1 overflow-x-auto"><p className="text-[10px] font-black text-indigo-400 tracking-widest mr-1">AMMO:</p>{[...Array(MAX_HECKLES)].map((_, i) => (<div key={i} className={`w-2 h-4 rounded-full transition-all duration-300 ${i < (me?.hecklesLeft || 0) ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-indigo-950 opacity-20'}`}></div>))}</div>
                </div>
              )}
            </div>
          )}

          {room.status === 'VOTING_WORD' && (
             <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in zoom-in">
                <h2 className="text-4xl font-black uppercase text-emerald-400 italic tracking-tighter leading-none">Word Check!</h2>
                <p className="text-center text-indigo-300 font-bold uppercase text-[10px] tracking-widest">Did they use it correctly?</p>
                <div className="bg-indigo-900 p-8 rounded-3xl border-2 border-emerald-500/30 w-full text-center font-black text-3xl text-white italic">"{room.sneakyWord}"</div>
                <div className="grid grid-cols-2 gap-4 w-full"><button onClick={() => castVote('YES')} className="bg-emerald-500 p-10 rounded-[2rem] font-black text-3xl active:scale-95 shadow-xl"><ThumbsUp className="w-12 h-12 mx-auto" /></button><button onClick={() => castVote('NO')} className="bg-red-500 p-10 rounded-[2rem] font-black text-3xl active:scale-95 shadow-xl"><ThumbsDown className="w-12 h-12 mx-auto" /></button></div>
             </div>
          )}

          {room.status === 'INTERROGATION' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in zoom-in">
               <h2 className="text-4xl font-black uppercase text-indigo-400 italic tracking-tighter leading-none">Verdict!</h2>
               <p className="text-center text-indigo-300 font-bold uppercase text-[10px] mb-4 tracking-widest">How was the answer?</p>
               <button onClick={() => castVote('SMOOTH')} className="w-full bg-indigo-500 p-10 rounded-[2.5rem] border-4 border-indigo-400 font-black text-2xl active:bg-yellow-400 shadow-xl">SMOOTH (+200)</button>
               <button onClick={() => castVote('RATTLED')} className="w-full bg-red-900 p-10 rounded-[2.5rem] border-4 border-red-800 font-black text-2xl active:bg-red-500 shadow-xl">RATTLED</button>
            </div>
          )}

          {room.status === 'VOTING_VIBE' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in zoom-in">
               <h2 className="text-4xl font-black uppercase text-pink-500 italic tracking-tighter leading-none text-center">Vibe Check!</h2>
               <p className="text-center text-indigo-300 font-bold uppercase text-[10px] mb-4 tracking-widest">Who was more persuasive?</p>
               <button onClick={() => castVote(room.currentSpeakerUid)} className="w-full bg-indigo-900 p-10 rounded-[2.5rem] border-4 border-indigo-800 font-black text-2xl active:bg-yellow-400 transition-all shadow-xl uppercase leading-none">{players.find(p => p.uid === room.currentSpeakerUid)?.name}</button>
               <button onClick={() => castVote(room.opponentUid)} className="w-full bg-indigo-900 p-10 rounded-[2.5rem] border-4 border-indigo-800 font-black text-2xl active:bg-yellow-400 transition-all shadow-xl uppercase leading-none">{players.find(p => p.uid === room.opponentUid)?.name}</button>
            </div>
          )}

          {(room.status === 'RESULTS' || room.status === 'FINAL_PODIUM') && <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in zoom-in"><div className="relative"><div className="absolute inset-0 blur-2xl bg-yellow-400/20 rounded-full animate-pulse"></div><Trophy className="w-24 h-24 text-yellow-400 relative animate-bounce" /></div><h2 className="text-5xl font-black italic tracking-tighter text-center leading-none">Turn<br/>Finished</h2><p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">Checking the big screen...</p></div>}
       </div>
       <style>{`
          @keyframes confetti { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(360deg); opacity: 0; } }
          .animate-confetti { position: absolute; top: -50px; animation: confetti linear infinite; }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .drop-shadow-glow { filter: drop-shadow(0 0 15px rgba(250, 204, 21, 0.4)); }
       `}</style>
    </div>
  );
}