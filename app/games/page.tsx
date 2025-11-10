"use client";

import React, { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation'; // <-- REMOVED
import { useAuth } from '../../lib/AuthContext'; // <-- FIXED PATH (2 levels up)
import { BottomNav } from '../../components/BottomNav'; // <-- FIXED PATH (2 levels up)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, Gamepad2, Plus, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


// --- 1. TYPESCRIPT INTERFACES (From Backend Files) ---

// From File 49: models/game.model.js
interface IGame {
  _id: string;
  status: 'waiting' | 'active' | 'finished';
  playerCount: number;
  players: {
    user: string; // User ID
    isReady: boolean;
  }[];
  host: {
    _id: string;
    name: string; // Assuming host is populated
  };
  createdAt: string;
}

// From File 50: controllers/game.controller.js
interface ILobbyResponse {
  success: boolean;
  data: IGame[];
  message?: string;
}

interface IGameResponse {
  success: boolean;
  data: IGame;
  message?: string;
}

// --- 2. HELPER: Create Game Dialog ---
const CreateGameDialog: React.FC<{ onGameCreated: (gameId: string) => void }> = ({ onGameCreated }) => {
  const [playerCount, setPlayerCount] = useState<'2' | '3'>('2');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token, apiBaseUrl } = useAuth();

  const handleCreateGame = async () => {
    setIsLoading(true);
    setError(null);
    
    // From File 54: POST /api/game/create
    const url = `${apiBaseUrl.replace('/auth', '')}/game/create`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ playerCount: Number(playerCount) }),
      });
      
      const result: IGameResponse = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to create game.');

      // Success! Redirect to the game room.
      onGameCreated(result.data._id);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full sm:w-auto">
          <Plus className="h-5 w-5 mr-2" /> Create New Game
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a New Game</DialogTitle>
          <DialogDescription>
            Choose the number of players for your "Dead or Wounded" match.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select value={playerCount} onValueChange={(val: '2' | '3') => setPlayerCount(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select player count" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Players</SelectItem>
              <SelectItem value="3">3 Players</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleCreateGame} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Game
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- 3. HELPER: Game Lobby Card ---
const GameCard: React.FC<{ game: IGame }> = ({ game }) => {
  const { token, apiBaseUrl } = useAuth();
  // const router = useRouter(); // <-- REMOVED
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoinGame = async () => {
    setIsLoading(true);
    setError(null);

    // From File 54: POST /api/game/:gameId/join
    const url = `${apiBaseUrl.replace('/auth', '')}/game/${game._id}/join`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const result: IGameResponse = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to join game.');

      // Success! Redirect to the game room.
      // router.push(`/games/${result.data._id}`); // <-- REPLACED
      window.location.href = `/games/${result.data._id}`; // <-- FIXED

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Game by {game.host.name}</CardTitle>
        <p className="text-sm text-gray-500">
          Waiting for players...
        </p>
      </CardHeader>
      <CardContent className="flex justify-between items-center">
        <div className="flex items-center space-x-2 text-indigo-600 font-semibold">
          <Users className="h-5 w-5" />
          <span>{game.players.length} / {game.playerCount}</span>
        </div>
        <Button onClick={handleJoinGame} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join Game'}
        </Button>
      </CardContent>
      {error && (
        <p className="text-red-600 text-sm px-6 pb-4">{error}</p>
      )}
    </Card>
  );
};


// --- 4. MAIN PAGE COMPONENT ---
export default function GameLobbyPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading, user } = useAuth();
  // const router = useRouter(); // <-- REMOVED

  const [games, setGames] = useState<IGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all "waiting" games from the lobby
  useEffect(() => {
    if (isAuthLoading) return;
    if (!token) {
      setIsLoading(false);
      setError("You must be logged in to view the game lobby.");
      return;
    }

    const fetchLobby = async () => {
      setIsLoading(true);
      setError(null);

      // From File 54: GET /api/game/lobby
      const url = `${apiBaseUrl.replace('/auth', '')}/game/lobby`;

      try {
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const result: ILobbyResponse = await response.json();
        if (!result.success) throw new Error(result.message || "Failed to fetch lobby.");
        
        setGames(result.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLobby();
  }, [apiBaseUrl, isAuthLoading, token]);

  const onGameCreated = (gameId: string) => {
    // router.push(`/games/${gameId}`); // <-- REPLACED
    window.location.href = `/games/${gameId}`; // <-- FIXED
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-12 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
          <p>Loading game lobby...</p>
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

    if (games.length === 0) {
      return (
        <div className="text-center p-12 bg-white rounded-xl shadow-lg">
          <Gamepad2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700">Lobby is Empty</h3>
          <p className="text-gray-500 mt-2">Why not create a new game?</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {games.map(game => (
          <GameCard key={game._id} game={game} />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-indigo-700">Game Lobby</h1>
        <CreateGameDialog onGameCreated={onGameCreated} />
      </div>

      {renderContent()}
      
      <BottomNav currentPage="games" />
    </div>
  );
}