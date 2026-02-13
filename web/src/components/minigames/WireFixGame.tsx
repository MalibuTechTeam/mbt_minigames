import React, { useEffect, useState, useRef } from 'react';
import { useMinigameStore } from '../../store/useMinigameStore';
import { fetchNui } from '../../utils/fetchNui';
import { motion, AnimatePresence } from 'framer-motion';
import './WireFixGame.css';

const COLORS = [
    { name: 'cyan', hex: '#00f2ff' },
    { name: 'pink', hex: '#ff0066' },
    { name: 'green', hex: '#39ff14' },
    { name: 'yellow', hex: '#ffcc00' },
    { name: 'purple', hex: '#b026ff' },
    { name: 'orange', hex: '#ff9100' }
];

interface WirePoint {
    id: number;
    color: string;
    side: 'left' | 'right';
}

const SHUFFLE_INTERVAL = 5000; // ms

const WireFixGame: React.FC = () => {
    const { timeLimit, sessionId, closeGame } = useMinigameStore();
    const [timeLeft, setTimeLeft] = useState(timeLimit || 25);
    const [leftWires, setLeftWires] = useState<WirePoint[]>([]);
    const [rightWires, setRightWires] = useState<WirePoint[]>([]);
    const [connections, setConnections] = useState<{[key: number]: number}>({});
    const [draggingWireId, setDraggingWireId] = useState<number | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');

    const containerRef = useRef<HTMLDivElement>(null);
    const leftRefs = useRef<{[key: number]: HTMLDivElement | null}>({});
    const rightRefs = useRef<{[key: number]: HTMLDivElement | null}>({});

    const successSound = useRef(new Audio('./assets/success.ogg'));
    const failedSound = useRef(new Audio('./assets/failed.ogg'));
    const connectSound = useRef(new Audio('./assets/hover.ogg'));

    useEffect(() => {
        const baseWires = COLORS.map((c, i) => ({ ...c, id: i }));
        setLeftWires([...baseWires].sort(() => Math.random() - 0.5).map(w => ({ id: w.id, color: w.hex, side: 'left' })));
        setRightWires([...baseWires].sort(() => Math.random() - 0.5).map(w => ({ id: w.id, color: w.hex, side: 'right' })));

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { handleLose(); return 0; }
                return prev - 1;
            });
        }, 1000);

        // Shuffling logic for right column
        const shuffleInterval = setInterval(() => {
            if (status === 'playing') {
                setRightWires(prev => [...prev].sort(() => Math.random() - 0.5));
            }
        }, SHUFFLE_INTERVAL);

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
        setTimeout(closeGame, 1000);
    };

    const handleWin = () => {
        if (status !== 'playing') return;
        setStatus('won');
        successSound.current.play().catch(() => {});
        fetchNui('hackingEnd', { outcome: true, sessionId });
        setTimeout(closeGame, 1000);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingWireId !== null && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
    };

    const startDrag = (id: number) => {
        if (status !== 'playing' || connections[id] !== undefined) return;
        setDraggingWireId(id);
        connectSound.current.currentTime = 0;
        connectSound.current.play().catch(()=>{});
    };

    const endDrag = (targetId: number, targetColor: string) => {
        if (draggingWireId !== null) {
            const sourceWire = leftWires.find(w => w.id === draggingWireId);
            if (sourceWire && sourceWire.color === targetColor) {
                setConnections(prev => {
                    const newConn = { ...prev, [draggingWireId]: targetId };
                    if (Object.keys(newConn).length === COLORS.length) handleWin();
                    return newConn;
                });
                connectSound.current.currentTime = 0;
                connectSound.current.play().catch(()=>{});
            }
        }
        setDraggingWireId(null);
    };

    const getCoords = (side: 'left'|'right', id: number) => {
        const refs = side === 'left' ? leftRefs.current : rightRefs.current;
        const el = refs[id];
        const container = containerRef.current;
        if (el && container) {
            const rect = el.getBoundingClientRect();
            const cRect = container.getBoundingClientRect();
            const x = side === 'left' ? (rect.right - cRect.left) - 10 : (rect.left - cRect.left) + 10;
            return { x, y: (rect.top - cRect.top) + rect.height / 2 };
        }
        return { x: 0, y: 0 };
    };

    return (
        <div className="wirefix-container glass-panel" onMouseMove={handleMouseMove} onMouseUp={() => setDraggingWireId(null)}>
            <div className="wirefix-header">
                <span className="neon-text-cyan">HIGH-VOLTAGE CIRCUIT RESTORATION</span>
                <span className="wirefix-timer">{timeLeft}s</span>
            </div>
            <div className="wirefix-board" ref={containerRef}>
                <svg className="wire-canvas">
                    {Object.entries(connections).map(([leftId, rightId]) => {
                        const start = getCoords('left', parseInt(leftId));
                        const end = getCoords('right', rightId);
                        const color = leftWires.find(w => w.id === parseInt(leftId))?.color;
                        return (
                            <motion.path 
                                key={leftId}
                                layout
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                d={`M ${start.x} ${start.y} C ${start.x + 80} ${start.y}, ${end.x - 80} ${end.y}, ${end.x} ${end.y}`}
                                className="wire-path active"
                                stroke={color}
                                style={{ stroke: color }}
                            />
                        );
                    })}
                    
                    {draggingWireId !== null && (
                        <path 
                            d={`M ${getCoords('left', draggingWireId).x} ${getCoords('left', draggingWireId).y} 
                                C ${getCoords('left', draggingWireId).x + 80} ${getCoords('left', draggingWireId).y}, 
                                  ${mousePos.x - 80} ${mousePos.y}, 
                                  ${mousePos.x} ${mousePos.y}`}
                            className="wire-path"
                            stroke={leftWires.find(w => w.id === draggingWireId)?.color}
                            opacity="0.6"
                        />
                    )}
                </svg>

                <div className="wire-column">
                    {leftWires.map((wire) => (
                        <motion.div 
                            key={wire.id}
                            layout
                            whileHover={{ scale: connections[wire.id] === undefined ? 1.1 : 1 }}
                            ref={el => { leftRefs.current[wire.id] = el; }}
                            className={`connector ${connections[wire.id] !== undefined ? 'connected' : ''}`}
                            style={{ background: wire.color, borderColor: wire.color }}
                            onMouseDown={() => startDrag(wire.id)}
                        />
                    ))}
                </div>

                <div className="wire-column">
                    <AnimatePresence>
                        {rightWires.map((wire) => (
                            <motion.div 
                                key={wire.id}
                                layout
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                ref={el => { rightRefs.current[wire.id] = el; }}
                                className={`connector ${Object.values(connections).includes(wire.id) ? 'connected' : ''}`}
                                style={{ background: wire.color, borderColor: wire.color }}
                                onMouseUp={() => endDrag(wire.id, wire.color)}
                            />
                        ))}
                    </AnimatePresence>
                </div>

                <div className="warning-text">
                    CAUTION: POWER GRID INSTABILITY DETECTED. CONNECTORS ARE SHIFTING.
                </div>
            </div>
        </div>
    );
};

export default WireFixGame;
