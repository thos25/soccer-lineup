import { useState } from 'react'
import { useRoster } from './store/useRoster.js'
import { useGame } from './store/useGame.js'
import { useTeam } from './store/useTeam.js'
import { isFirebaseConfigured } from './lib/firebase.js'
import RosterManager from './components/RosterManager.jsx'
import GameSetup from './components/GameSetup.jsx'
import LineupPlan from './components/LineupPlan.jsx'

const TABS = ['roster', 'game', 'lineup']
const TAB_LABELS = { roster: 'Roster', game: 'Game', lineup: 'Lineup' }

export default function App() {
  const [activeTab, setActiveTab] = useState('roster')
  const {
    players, addPlayer, removePlayer, renamePlayer,
    toggleSeparate, setPlayers, storageAvailable,
  } = useRoster()
  const {
    presentIds, togglePresent, plan, separationViolations,
    generatePlan, swapPlayers, clearPlan,
  } = useGame(players)
  const { teamName, connected, syncing, offline, connect, disconnect } =
    useTeam(players, setPlayers)

  const handleGenerate = () => {
    generatePlan()
    setActiveTab('lineup')
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {!storageAvailable && (
        <div className="bg-amber-100 text-amber-800 text-sm px-4 py-2 text-center no-print">
          Storage unavailable — roster will not persist between sessions.
        </div>
      )}

      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}>
        {activeTab === 'roster' && (
          <RosterManager
            players={players}
            onAdd={addPlayer}
            onRemove={removePlayer}
            onRename={renamePlayer}
            onToggleSeparate={toggleSeparate}
            teamName={teamName}
            connected={connected}
            syncing={syncing}
            offline={offline}
            onConnect={connect}
            onDisconnect={disconnect}
            firebaseConfigured={isFirebaseConfigured()}
          />
        )}
        {activeTab === 'game' && (
          <GameSetup
            players={players}
            presentIds={presentIds}
            onToggle={togglePresent}
            onGenerate={handleGenerate}
            hasPlan={!!plan}
            onClearPlan={clearPlan}
          />
        )}
        {activeTab === 'lineup' && (
          <LineupPlan
            plan={plan}
            players={players}
            onSwap={swapPlayers}
            separationViolations={separationViolations}
          />
        )}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex no-print"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-green-600 border-t-2 border-green-600 -mt-px'
                : 'text-gray-500'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </nav>
    </div>
  )
}
