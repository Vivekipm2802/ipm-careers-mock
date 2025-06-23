import React from 'react';
import { Crown } from 'lucide-react';

export default function Leaderboard({ scores = [] }) {
  const sortedData = scores.sort((a, b) => b.score - a.score);

  return (<>
   
       <div className="bg-white font-bold sticky top-0 w-full flex flex-row items-center justify-between">
            
              <div className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</div>
              <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</div>
              <div className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Score</div>
           
          </div>
     
      <div className="bg-white shadow-md rounded-none overflow-y-auto w-full">
        <table className="w-full">
         
          <tbody className="divide-y divide-gray-200">
            {sortedData.map((player, index) => (
              <tr 
                key={player.id} 
                className={`${index < 3 ? 'bg-gradient-to-r' : ''} ${
                  index === 0 ? 'from-yellow-100 to-yellow-50' :
                  index === 1 ? 'from-gray-100 to-gray-50' :
                  index === 2 ? 'from-orange-100 to-orange-50' : ''
                } hover:bg-gray-50 transition-colors duration-200`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {index + 1}
                  {index < 3 && (
                    <Crown className={`inline-block ml-2 ${
                      index === 0 ? 'text-yellow-400' :
                      index === 1 ? 'text-gray-400' :
                      'text-orange-400'
                    }`} size={16} />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-left">
                    <div className="flex-shrink-0 h-10 w-10">
                      <img className="h-10 w-10 rounded-full" src="/defprofile.svg" alt="" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{player.name}</div>
                      {/* <div className="text-sm text-gray-500">{player.user}</div> */}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {player.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}