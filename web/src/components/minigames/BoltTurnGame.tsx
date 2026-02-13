import React, { useState, useEffect, useRef } from 'react';
import { useMinigameStore } from '../../store/useMinigameStore';
import { fetchNui } from '../../utils/fetchNui';
import { motion } from 'framer-motion';
import './BoltTurnGame.css';

const MAX_HEAT = 100;
const HEAT_DECAY = 40; // per second
const HEAT_GAIN = 15; // per click
const OVERHEAT_PENALTY = 2000; // ms to wait if overheated

const BoltTurnGame: React.FC = () => {
    const { timeLimit, sessionId, closeGame } = useMinigameStore();
    const [timeLeft, setTimeLeft] = useState(timeLimit || 25);
    const [boltProgress, setBoltProgress] = useState([0, 0, 0]);
    const [boltHeat, setBoltHeat] = useState([0, 0, 0]);
    const [overheated, setOverheated] = useState([false, false, false]);
    const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');

    const successSound = useRef(new Audio('./assets/success.ogg'));
    const failedSound = useRef(new Audio('./assets/failed.ogg'));
    const turnSound = useRef(new Audio('./assets/hover.ogg'));

    useEffect(() => {
        const timerInterval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { 
                    handleLose(); 
                    return 0; 
                }
                return prev - 1;
            });
        }, 1000);

        const heatInterval = setInterval(() => {
            setBoltHeat(prev => prev.map((h) => Math.max(0, h - (HEAT_DECAY / 10))));
        }, 100);

        return () => {
            clearInterval(timerInterval);
            clearInterval(heatInterval);
        };
    }, []);

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

    const turnBolt = (index: number) => {
        if (status !== 'playing' || overheated[index] || boltProgress[index] >= 100) return;

        turnSound.current.currentTime = 0;
        turnSound.current.play().catch(() => {});

        setBoltHeat(prev => {
            const nextHeat = [...prev];
            nextHeat[index] += HEAT_GAIN;

            if (nextHeat[index] >= MAX_HEAT) {
                const nextOverheated = [...overheated];
                nextOverheated[index] = true;
                setOverheated(nextOverheated);
                
                setTimeout(() => {
                    setOverheated(prevOH => {
                        const restored = [...prevOH];
                        restored[index] = false;
                        return restored;
                    });
                }, OVERHEAT_PENALTY);
            }
            return nextHeat;
        });

        if (!overheated[index]) {
            setBoltProgress(prev => {
                const next = [...prev];
                next[index] = Math.min(100, next[index] + 8);
                if (next.every(p => p >= 100)) handleWin();
                return next;
            });
        }
    };

    return (
        <div className="boltturn-container glass-panel crt-effect">
            <div className="boltturn-header">
                <span className="neon-text-cyan">PNEUMATIC TORQUE CONTROL</span>
            </div>
            <div className="bolts-area">
                {boltProgress.map((prog, idx) => (
                    <div key={idx} className={`bolt-wrapper ${prog >= 100 ? 'bolt-done' : ''} ${overheated[idx] ? 'overheated' : ''}`}>
                        <div className="label-small">
                            <span>Bolt #{idx + 1}</span>
                            <span style={{ color: overheated[idx] ? 'var(--neon-pink)' : 'inherit' }}>
                                {overheated[idx] ? 'OVERHEAT' : 'STABLE'}
                            </span>
                        </div>

                        <motion.div 
                            className="bolt-svg-container"
                            onClick={() => turnBolt(idx)}
                            animate={{ rotate: prog * 3.6 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <svg className="bolt-svg" viewBox="0 0 100 100">
                                <defs>
                                    <radialGradient id={`grad-${idx}`} cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" style={{ stopColor: '#888', stopOpacity: 1 }} />
                                        <stop offset="100%" style={{ stopColor: '#444', stopOpacity: 1 }} />
                                    </radialGradient>
                                </defs>
                                <polygon 
                                    points="50,5 93.3,30 93.3,80 50,105 6.7,80 6.7,30" 
                                    fill={`url(#grad-${idx})`} 
                                    stroke="#333" 
                                    strokeWidth="2"
                                />
                                <circle cx="50" cy="50" r="25" fill="#333" />
                                <rect x="42" y="15" width="16" height="70" fill="#222" rx="4" />
                                <rect x="15" y="42" width="70" height="16" fill="#222" rx="4" />
                            </svg>
                        </motion.div>

                        <div className="status-indicators">
                            <div className="label-small"><span>Torque</span><span>{prog}%</span></div>
                            <div className="indicator-bar">
                                <div className="fill-progress" style={{ width: `${prog}%` }}></div>
                            </div>
                            
                            <div className="label-small"><span>Thermal</span><span>{Math.round(boltHeat[idx])}%</span></div>
                            <div className="indicator-bar">
                                <div className="fill-heat" style={{ width: `${boltHeat[idx]}%` }}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: '20px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
                 TIME REMAINING: {timeLeft}s
            </div>
        </div>
    );
};

export default BoltTurnGame;
