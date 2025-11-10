"use client";

import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useRouter } from 'next/navigation'; // <-- REMOVED
import { useAuth } from '../../../lib/AuthContext'; // <-- FIXED PATH (3 levels up)
import { BottomNav } from '../../../components/BottomNav'; // <-- FIXED PATH (3 levels up)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, Gamepad2, Users, User, Send, Check, ShieldQuestion, Brain } from 'lucide-react';
import io, { Socket } from 'socket.io-client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// --- 1. TYPESCRIPT INTERFACES (From Backend Files) ---

// From File 49: models/game.model.js
interface IPlayer {
  user: {
    _id: string;
    name: string; // Populated from backend
  };
  secretNumber: string | null; // Null for other players
  targetUser: string | null; // User ID
  guesses: {
    guess: string;
    dead: number;
    wounded: number;
    timestamp: string;
  }[];
  bestDeadScore: number;
  isReady: boolean;
  hasWon: boolean;
}

interface IGame {
  _id: string;
  status: 'waiting' | 'active' | 'finished';
  playerCount: number;
  players: IPlayer[];
  currentPlayerTurn: string | null; // User ID
  winner: string | null; // User ID
  secondPlace: string | null; // User ID
  host: string; // User ID
}

// Helper hook to read the gameId from the URL on the client
function useGameId() {
  const [gameId, setGameId] = useState<string | null>(null);
  useEffect(() => {
    // window.location.pathname is only available on the client
    const pathSegments = window.location.pathname.split('/');
    const id = pathSegments.pop() || pathSegments.pop(); // Get the last segment
    if (id) {
      setGameId(id);
    }
  }, []);
  return gameId;
}


// --- 2. HELPER COMPONENTS ---

/**
 * Component to set the secret number
 */
const SetSecretForm: React.FC<{ gameId: string, onSecretSet: (game: IGame) => void }> = ({ gameId, onSecretSet }) => {
  const [secret, setSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token, apiBaseUrl } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // From File 54: POST /api/game/:gameId/set-secret
    const url = `${apiBaseUrl.replace('/auth', '')}/game/${gameId}/set-secret`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ secret }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to set secret.');
      
      onSecretSet(result.data); // Update parent state
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto my-8">
      <CardHeader>
        <CardTitle className="text-center">Set Your Secret Number</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <CardContent>
          <p className="text-sm text-gray-500 text-center">
            Enter a 4-digit number with unique digits (e.g., 1234).
          </p>
          <Input
            type="text"
            maxLength={4}
            minLength={4}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="1234"
            className="text-center text-2xl font-bold tracking-[.25em]"
            required
          />
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ready Up'}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
};

/**
 * Component to make a guess
 */
const MakeGuessForm: React.FC<{ gameId: string, myPlayer: IPlayer }> = ({ gameId, myPlayer }) => {
  const [guess, setGuess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token, apiBaseUrl } = useAuth();

  // Find the target's name (if populated)
  const targetName = "your target"; // Fallback

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // From File 54: POST /api/game/:gameId/guess
    const url = `${apiBaseUrl.replace('/auth', '')}/game/${gameId}/guess`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ guess }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to make guess.');
      
      setGuess(''); // Clear input on successful guess
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle>Make a Guess (vs. {targetName})</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Guess History */}
        <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-2">
          {myPlayer.guesses.length === 0 ? (
            <p className="text-sm text-gray-500">No guesses yet.</p>
          ) : (
            myPlayer.guesses.map((g, i) => (
              <div key={i} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-lg">
                <span className="font-mono text-lg">{g.guess}</span>
                <div>
                  <span className="font-bold text-red-600">{g.dead} Dead</span>, 
                  <span className="font-bold text-yellow-600 ml-2">{g.wounded} Wounded</span>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Guess Input Form */}
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            type="text"
            maxLength={4}
            minLength={4}
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="5678"
            className="text-center text-lg font-bold tracking-[.25em] flex-1"
            required
          />
          <Button type="submit" disabled={isLoading} size="icon">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
};

/**
 * Component to show the game results
 */
const GameOverScreen: React.FC<{ game: IGame, myUserId: string }> = ({ game, myUserId }) => {
  const isWinner = game.winner === myUserId;
  const isSecond = game.secondPlace === myUserId;
  const winnerPlayer = game.players.find(p => p.user._id === game.winner);

  return (
    <AlertDialog open={true}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-3xl font-bold text-center">
            {isWinner ? "🎉 You Won! 🎉" : "Game Over"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-lg pt-2">
            <strong>{winnerPlayer?.user.name || 'Winner'}</strong> guessed the final number!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4 space-y-3">
          <h4 className="font-semibold text-center">Final Results</h4>
          <Card className={`p-4 ${isWinner ? 'border-2 border-green-500 bg-green-50' : ''}`}>
            <p className="font-bold text-lg">1. {winnerPlayer?.user.name}</p>
          </Card>
          {game.secondPlace && (
            <Card className={`p-4 ${isSecond ? 'border-2 border-blue-500 bg-blue-50' : ''}`}>
              <p className="font-bold text-lg">2. {game.players.find(p => p.user._id === game.secondPlace)?.user.name}</p>
            </Card>
          )}
          {game.playerCount === 3 && (
             <Card className="p-4">
              <p className="font-bold text-lg">3. {game.players.find(p => p.user._id !== game.winner && p.user._id !== game.secondPlace)?.user.name}</p>
            </Card>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogAction asChild>
            <a href="/games">Back to Lobby</a>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


// --- 3. MAIN PAGE COMPONENT ---
export default function GameRoomPage() {
  const gameId = useGameId();
  const { token, apiBaseUrl, user, isLoading: isAuthLoading } = useAuth();
  
  const [game, setGame] = useState<IGame | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // --- Main Game Fetch & Socket Effect ---
  useEffect(() => {
    if (isAuthLoading || !gameId) return; // Wait for auth and gameId

    if (!token || !user) {
      setError("You must be logged in to play.");
      setIsLoading(false);
      return;
    }

    // --- 1. Fetch Initial Game Data ---
    const fetchGame = async () => {
      setIsLoading(true);
      setError(null);
      
      // From File 54: GET /api/game/:gameId
      const url = `${apiBaseUrl.replace('/auth', '')}/game/${gameId}`;
      try {
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.message || "Failed to fetch game.");
        setGame(result.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGame();

    // --- 2. Connect to Socket.io (File 30: realtime.js) ---
    const socketUrl = apiBaseUrl.split('/api')[0]; 
    const socket = io(socketUrl, {
      auth: { userId: user._id }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      
      // A. Join the user's private room
      // (This is already done on connection by backend File 30)

      // B. Join this specific game's room (From File 30 logic)
      socket.emit('game:join', gameId);

      // C. Listen for game updates (From File 50: broadcastGameState)
      socket.on('game:update', (updatedGame: IGame) => {
        console.log('LIVE GAME UPDATE RECEIVED:', updatedGame.status);
        setGame(updatedGame);
      });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Cleanup function
    return () => {
      socket.off('game:update');
      socket.emit('game:leave', gameId); // (Optional: you'd need to add this to backend)
      socket.disconnect();
    };

  }, [token, apiBaseUrl, isAuthLoading, gameId, user]);
  
  // --- Render Functions ---
  
  const renderPlayerCard = (player: IPlayer) => {
    const isMe = player.user._id === user?._id;
    const isCurrentTurn = game?.currentPlayerTurn === player.user._id;
    
    return (
      <Card key={player.user._id} className={`
        ${isMe ? 'bg-indigo-50 border-indigo-200' : 'bg-white'}
        ${isCurrentTurn ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
      `}>
        <CardHeader className="flex flex-row items-center space-x-3 pb-3">
          <User className="h-6 w-6" />
          <CardTitle className="text-lg">{player.user.name} {isMe && "(You)"}</CardTitle>
        </CardHeader>
        <CardContent>
          {player.isReady ? (
            <div className="flex items-center space-x-2 text-green-600">
              <Check className="h-5 w-5" />
              <span className="font-semibold">Ready</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-semibold">Setting Secret...</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };
  
  const renderGameContent = () => {
    if (isLoading || !game || !user) {
      return (
        <div className="text-center p-12">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-gray-500">Loading game room...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
          {error}
        </div>
      );
    }
    
    const myPlayer = game.players.find(p => p.user._id === user._id);
    if (!myPlayer) {
      return <div className="p-12 text-center text-red-500">Error: You are not a player in this game.</div>;
    }

    // --- State 1: Game Finished ---
    if (game.status === 'finished') {
      return <GameOverScreen game={game} myUserId={user._id} />;
    }

    // --- State 2: Waiting for Players to Ready Up ---
    if (game.status === 'waiting' && !myPlayer.isReady) {
      return <SetSecretForm gameId={game._id} onSecretSet={setGame} />;
    }

    // --- State 3: Active Game (Waiting for turn or my turn) ---
    const isMyTurn = game.currentPlayerTurn === user._id;

    return (
      <div className="space-y-6">
        {game.status === 'waiting' && (
          <div className="p-4 bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-center">
            <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
            Waiting for all players to set their secret...
          </div>
        )}
        
        {game.status === 'active' && (
          <div className={`p-4 rounded-lg text-center font-bold text-xl
            ${isMyTurn ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-gray-100 text-gray-800 border border-gray-200'}
          `}>
            {isMyTurn ? "It's your turn!" : `Waiting for ${game.players.find(p => p.user._id === game.currentPlayerTurn)?.user.name || 'opponent'}...`}
          </div>
        )}
        
        {/* My Guessing Form (only if game is active and it's my turn) */}
        {game.status === 'active' && isMyTurn && (
          <MakeGuessForm gameId={game._id} myPlayer={myPlayer} />
        )}
        
        {/* My Secret Number (if set) */}
        {myPlayer.secretNumber && (
          <Card>
            <CardHeader className="flex flex-row items-center space-x-3 pb-3">
              <ShieldQuestion className="h-6 w-6 text-gray-500" />
              <CardTitle className="text-lg">My Secret Number</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-center tracking-[.25em] text-gray-800">
                {myPlayer.secretNumber}
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Player List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Players</h3>
          {game.players.map(renderPlayerCard)}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      {/* --- Header --- */}
      <div className="flex items-center space-x-2 mb-6">
        <Button asChild variant="outline" size="icon">
          <a href="/games"><ArrowLeft className="h-4 w-4" /></a>
        </Button>
        <h1 className="text-3xl font-bold text-indigo-700">Dead or Wounded</h1>
      </div>

      {renderGameContent()}

      <BottomNav currentPage="games" />
    </div>
  );
}