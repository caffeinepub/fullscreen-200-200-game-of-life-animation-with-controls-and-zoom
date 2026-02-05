import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, FastForward, Rewind } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const GRID_SIZE = 200;
const INITIAL_LIVE_CELLS = 50;
const RESET_LIVE_CELLS = 3000;
const DEFAULT_TICK_INTERVAL = 500; // 0.5 seconds

type Grid = boolean[][];

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Grid>(createEmptyGrid());
  const [isRunning, setIsRunning] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [tickInterval, setTickInterval] = useState(DEFAULT_TICK_INTERVAL);
  const tickIntervalRef = useRef(DEFAULT_TICK_INTERVAL);
  const animationRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // Sync tickInterval state with ref for animation loop access
  useEffect(() => {
    tickIntervalRef.current = tickInterval;
  }, [tickInterval]);

  // Create an empty grid
  function createEmptyGrid(): Grid {
    return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
  }

  // Initialize grid with random live cells in the center
  const initializeGrid = useCallback((liveCellCount: number) => {
    const grid = createEmptyGrid();
    const centerSize = Math.floor(GRID_SIZE * 0.6); // 60% of grid size for central region
    const offset = Math.floor((GRID_SIZE - centerSize) / 2);
    
    const positions = new Set<string>();
    while (positions.size < liveCellCount) {
      const row = offset + Math.floor(Math.random() * centerSize);
      const col = offset + Math.floor(Math.random() * centerSize);
      positions.add(`${row},${col}`);
    }
    
    positions.forEach(pos => {
      const [row, col] = pos.split(',').map(Number);
      grid[row][col] = true;
    });
    
    return grid;
  }, []);

  // Count live neighbors (8-neighbor rule)
  const countNeighbors = useCallback((grid: Grid, row: number, col: number): number => {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        const newRow = row + i;
        const newCol = col + j;
        // Treat out-of-bounds as dead (edge policy)
        if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
          if (grid[newRow][newCol]) count++;
        }
      }
    }
    return count;
  }, []);

  // Compute next generation
  const computeNextGeneration = useCallback((currentGrid: Grid): Grid => {
    const newGrid = createEmptyGrid();
    
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const neighbors = countNeighbors(currentGrid, row, col);
        const isAlive = currentGrid[row][col];
        
        if (isAlive) {
          // Survival: 2 or 3 neighbors
          // Death: 0-1 (loneliness) or >3 (overpopulation)
          newGrid[row][col] = neighbors === 2 || neighbors === 3;
        } else {
          // Birth: exactly 3 neighbors
          newGrid[row][col] = neighbors === 3;
        }
      }
    }
    
    return newGrid;
  }, [countNeighbors]);

  // Render the grid on canvas
  const renderGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const cellSize = (canvas.width / GRID_SIZE) * zoom;
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Save context state
    ctx.save();
    
    // Center the zoomed grid
    const scaledWidth = GRID_SIZE * cellSize;
    const scaledHeight = GRID_SIZE * cellSize;
    const offsetX = (canvas.width - scaledWidth) / 2;
    const offsetY = (canvas.height - scaledHeight) / 2;
    
    ctx.translate(offsetX, offsetY);
    
    // Draw cells
    const grid = gridRef.current;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row][col]) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }
    
    // Draw grid lines
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    
    // Vertical lines
    for (let col = 0; col <= GRID_SIZE; col++) {
      ctx.beginPath();
      ctx.moveTo(col * cellSize, 0);
      ctx.lineTo(col * cellSize, GRID_SIZE * cellSize);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let row = 0; row <= GRID_SIZE; row++) {
      ctx.beginPath();
      ctx.moveTo(0, row * cellSize);
      ctx.lineTo(GRID_SIZE * cellSize, row * cellSize);
      ctx.stroke();
    }
    
    ctx.restore();
  }, [zoom]);

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (!lastTickRef.current) {
      lastTickRef.current = timestamp;
    }
    
    const elapsed = timestamp - lastTickRef.current;
    
    if (elapsed >= tickIntervalRef.current) {
      gridRef.current = computeNextGeneration(gridRef.current);
      setGeneration(g => g + 1);
      lastTickRef.current = timestamp;
    }
    
    renderGrid();
    
    if (isRunning) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isRunning, computeNextGeneration, renderGrid]);

  // Initialize on mount
  useEffect(() => {
    gridRef.current = initializeGrid(INITIAL_LIVE_CELLS);
    setGeneration(0);
    renderGrid();
  }, [initializeGrid, renderGrid]);

  // Handle running state
  useEffect(() => {
    if (isRunning) {
      lastTickRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      renderGrid();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, animate, renderGrid]);

  // Re-render when zoom changes
  useEffect(() => {
    renderGrid();
  }, [zoom, renderGrid]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const size = Math.min(window.innerWidth, window.innerHeight - 200);
      canvas.width = size;
      canvas.height = size;
      renderGrid();
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderGrid]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    gridRef.current = initializeGrid(RESET_LIVE_CELLS);
    setGeneration(0);
    renderGrid();
  };

  const handleZoomIn = () => {
    setZoom(z => Math.min(z + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(z => Math.max(z - 0.2, 0.4));
  };

  const handleZoomSlider = (value: number[]) => {
    setZoom(value[0]);
  };

  const handleFaster = () => {
    setTickInterval(current => Math.max(current / 2, 15.625)); // Min ~16ms (60fps)
  };

  const handleSlower = () => {
    setTickInterval(current => Math.min(current * 2, 8000)); // Max 8 seconds
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">Game of Life</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conway's cellular automaton on a 200×200 grid
          </p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
        <div className="bg-card border border-border rounded-lg shadow-lg p-2">
          <canvas
            ref={canvasRef}
            className="bg-white"
            style={{ display: 'block' }}
          />
        </div>

        <div className="bg-card border border-border rounded-lg shadow-sm p-6 w-full max-w-2xl">
          <div className="flex flex-col gap-6">
            {/* Controls */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button
                onClick={handleStart}
                disabled={isRunning}
                size="lg"
                className="min-w-[120px]"
              >
                <Play className="mr-2 h-5 w-5" />
                Start
              </Button>
              <Button
                onClick={handlePause}
                disabled={!isRunning}
                variant="secondary"
                size="lg"
                className="min-w-[120px]"
              >
                <Pause className="mr-2 h-5 w-5" />
                Pause
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                size="lg"
                className="min-w-[120px]"
              >
                <RotateCcw className="mr-2 h-5 w-5" />
                Reset
              </Button>
            </div>

            {/* Generation counter */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Generation</p>
              <p className="text-3xl font-bold text-foreground">{generation}</p>
            </div>

            {/* Speed controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Speed</label>
                <span className="text-sm text-muted-foreground">
                  Interval: {tickInterval >= 1000 ? `${(tickInterval / 1000).toFixed(2)}s` : `${tickInterval.toFixed(0)}ms`}
                </span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={handleSlower}
                  variant="outline"
                  size="lg"
                  className="min-w-[120px]"
                  disabled={tickInterval >= 8000}
                >
                  <Rewind className="mr-2 h-5 w-5" />
                  Slower
                </Button>
                <Button
                  onClick={handleFaster}
                  variant="outline"
                  size="lg"
                  className="min-w-[120px]"
                  disabled={tickInterval <= 15.625}
                >
                  <FastForward className="mr-2 h-5 w-5" />
                  Faster
                </Button>
              </div>
            </div>

            {/* Zoom controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Zoom</label>
                <span className="text-sm text-muted-foreground">{(zoom * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleZoomOut}
                  variant="outline"
                  size="icon"
                  disabled={zoom <= 0.4}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Slider
                  value={[zoom]}
                  onValueChange={handleZoomSlider}
                  min={0.4}
                  max={3}
                  step={0.1}
                  className="flex-1"
                />
                <Button
                  onClick={handleZoomIn}
                  variant="outline"
                  size="icon"
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Rules */}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Rules</h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>Birth:</strong> Dead cell with exactly 3 live neighbors becomes alive</li>
                <li>• <strong>Survival:</strong> Live cell with 2 or 3 neighbors stays alive</li>
                <li>• <strong>Death:</strong> Live cell with 0-1 neighbors (loneliness) or 4+ neighbors (overpopulation) dies</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-card py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026. Built with love using{' '}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:underline font-medium"
          >
            caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
