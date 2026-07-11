'use client'

import { useEffect, useState } from 'react'

interface ConfettiPiece {
  id: number
  x: number
  y: number
  color: string
  rotation: number
  size: number
  velocityX: number
  velocityY: number
}

export default function Confetti() {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])

  useEffect(() => {
    // Generate confetti pieces
    const colors = ['#DC143C', '#003366', '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
    const pieces: ConfettiPiece[] = []
    
    for (let i = 0; i < 100; i++) {
      pieces.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        size: Math.random() * 8 + 4,
        velocityX: (Math.random() - 0.5) * 2,
        velocityY: Math.random() * 3 + 2,
      })
    }
    
    setConfetti(pieces)

    // Animate confetti
    const interval = setInterval(() => {
      setConfetti((prev) =>
        prev.map((piece) => ({
          ...piece,
          x: piece.x + piece.velocityX,
          y: piece.y + piece.velocityY,
          rotation: piece.rotation + piece.velocityX * 5,
          velocityY: piece.velocityY + 0.1, // gravity
        })).filter((piece) => piece.y < 110) // Remove pieces that fall off screen
      )
    }, 50)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute rounded-sm"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  )
}





