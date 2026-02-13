import React, { useState, useEffect, useRef } from 'react';
import { useMinigameStore } from '../../store/useMinigameStore';
import { fetchNui } from '../../utils/fetchNui';
import { motion, AnimatePresence } from 'framer-motion';
import './CodeMatchGame.css';

const SYMBOLS = [
  '0x4A7F', '0xBC22', '0xDA90', '0x11E2', '0xFF01', 
  '0x77C3', '0x99A0', '0x55E1', '0x22F0', '0xCC88'
];

interface CodeEntry {
    id: string;
    symbol: string;
}

const CodeMatchGame: React.FC = () => {
    const { timeLimit, sessionId, closeGame } = useMinigameStore();
    const [timeLeft, setTimeLeft] = useState(timeLimit || 25);
    const [leftItems, setLeftItems] = useState<CodeEntry[]>([]);
    const [rightItems, setRightItems] = useState<CodeEntry[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [matchedSymbols, setMatchedSymbols] = useState<string[]>([]);
    const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');

    const successSound = useRef(new Audio('./assets/success.ogg'));
    const failedSound = useRef(new Audio('./assets/failed.ogg'));
    const clickSound = useRef(new Audio('./assets/hover.ogg'));

    useEffect(() => {
        const pool = [...SYMBOLS].sort(() => Math.random() - 0.5).slice(0, 6);
        const l = pool.map((s, i) => ({ id: `L-${i}`, symbol: s }));
        const r = pool.map((s, i) => ({ id: `R-${i}`, symbol: s })).sort(() => Math.random() - 0.5);

        setLeftItems(l);
        setRightItems(r);

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { handleLose(); return 0; }
                return prev - 1;
            });
        }, 1000);

        // Shuffle logic every 5 seconds
        const shuffleInterval = setInterval(() => {
            if (status === 'playing') {
                setRightItems(prev => [...prev].sort(() => Math.random() - 0.5));
            }
        }, 5000);

        return () => {
            clearInterval(interval);
            clearInterval(shuffleInterval);
        };
    }, [status]);

    const handleLose = () => {
        if (status !== 'playing') return;
        setStatus('lost');
        failedSound.current.play().catch(() => {});
        fetchNui('hackingEnd', { outcome: false, sessionId });
        setTimeout(closeGame, 1500);
    };

    const handleWin = () => {
        if (status !== 'playing') return;
        setStatus('won');
        successSound.current.play().catch(() => {});
        fetchNui('hackingEnd', { outcome: true, sessionId });
        setTimeout(closeGame, 1500);
    };

    const handleLeftClick = (entry: CodeEntry) => {
        if (status !== 'playing' || matchedSymbols.includes(entry.symbol)) return;
        clickSound.current.currentTime = 0;
        clickSound.current.play().catch(() => {});
        setSelectedId(entry.id);
    };

    const handleRightClick = (entry: CodeEntry) => {
        if (status !== 'playing' || !selectedId || matchedSymbols.includes(entry.symbol)) return;

        const leftEntry = leftItems.find(item => item.id === selectedId);
        if (leftEntry && leftEntry.symbol === entry.symbol) {
            const newMatches = [...matchedSymbols, entry.symbol];
            setMatchedSymbols(newMatches);
            setSelectedId(null);
            clickSound.current.currentTime = 0;
            clickSound.current.play().catch(() => {});
            if (newMatches.length === leftItems.length) handleWin();
        } else {
            setSelectedId(null);
            // Flash error?
        }
    };

    return (
        <div className="codematch-container glass-panel crt-effect">
            <div className="codematch-header">
                <span className="neon-text-cyan">KERNEL BUFFER PATCHER [V2.4]</span>
                <span className="code-timer">{timeLeft}s</span>
            </div>
            
            <div className="matching-area">
                <div className="corruption-overlay" />
                
                <div className="code-column">
                    {leftItems.map((item) => (
                        <motion.div 
                            key={item.id}
                            layout
                            className={`code-item ${selectedId === item.id ? 'selected' : ''} ${matchedSymbols.includes(item.symbol) ? 'matched' : ''}`}
                            onClick={() => handleLeftClick(item)}
                            whileHover={{ scale: matchedSymbols.includes(item.symbol) ? 1 : 1.02 }}
                        >
                            {item.symbol}
                        </motion.div>
                    ))}
                </div>

                <div className="code-column">
                    <AnimatePresence>
                        {rightItems.map((item) => (
                            <motion.div 
                                key={item.id}
                                layout
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className={`code-item ${matchedSymbols.includes(item.symbol) ? 'matched' : ''}`}
                                onClick={() => handleRightClick(item)}
                            >
                                {item.symbol}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
            
            <div style={{ padding: '15px', background: 'rgba(0,242,255,0.05)', fontSize: '0.7rem', color: '#666', textAlign: 'center' }}>
                WARNING: SYSTEM INSTABILITY DETECTED. MEMORY SEGMENTS MAY SHIFT POSITIONS.
            </div>
        </div>
    );
};

export default CodeMatchGame;
