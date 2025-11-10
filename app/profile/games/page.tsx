"use client"; // This directive marks the component as a Client Component

import React, { useState } from 'react'; // Removed unused useEffect

// --- Types ---
interface Game {
  id: string; // Document ID
  game: string;
  opponent: string;
  result: 'Win' | 'Loss' | 'Draw';
  date: string; // Storing date as ISO string is common
}

// --- Mock Data ---
const mockGameHistory: Game[] = [
  { id: 'mock1', game: 'Chess', opponent: 'Player_B', result: 'Win', date: '2023-10-27' },
  { id: 'mock2', game: 'Checkers', opponent: 'Player_C', result: 'Loss', date: '2023-10-25' },
  { id: 'mock3', game: 'Chess', opponent: 'Player_D', result: 'Draw', date: '2023-10-24' },
  { id: 'mock4', game: 'Go', opponent: 'Player_E', result: 'Win', date: '2023-10-22' },
];

/**
 * A component to display a user's game history using static mock data.
 * This component renders a list of past games in a card layout.
 */
export default function GameHistoryPage() {
  const [gameHistory, setGameHistory] = useState<Game[]>(mockGameHistory);

  const renderContent = () => {
    if (gameHistory.length === 0) {
      return <p className="text-center text-gray-400">You have no game history yet.</p>;
    }

    // Sort by date descending (most recent first)
    const sortedHistory = [...gameHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return sortedHistory.map((game) => (
      <div 
        key={game.id} 
        className="flex flex-col md:flex-row justify-between items-center bg-gray-700 p-5 rounded-lg shadow-lg hover:bg-gray-600 transition-colors duration-200"
      >
        <div className="mb-3 md:mb-0">
          <h2 className="text-xl font-semibold text-white">{game.game}</h2>
          <p className="text-gray-400">vs. {game.opponent}</p>
        </div>
        <div className="flex flex-col items-center md:items-end text-right">
          <span 
            className={`font-bold text-lg px-3 py-1 rounded-full ${
              game.result === 'Win' ? 'bg-green-600 text-white' :
              game.result === 'Loss' ? 'bg-red-600 text-white' :
              'bg-yellow-500 text-gray-900'
            }`}
          >
            {game.result}
          </span>
          <p className="text-gray-400 text-sm mt-2">{new Date(game.date).toLocaleDateString()}</p>
        </div>
      </div>
    ));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 md:p-8 text-white font-sans">
      <div className="w-full max-w-4xl bg-gray-800 rounded-xl shadow-2xl p-6 md:p-8">
        
        <h1 className="text-3xl md:text-4xl font-bold text-center text-indigo-400 mb-8">
          My Game History
        </h1>

        <div className="space-y-4">
          {renderContent()}
        </div>

      </div>
    </div>
  );
}