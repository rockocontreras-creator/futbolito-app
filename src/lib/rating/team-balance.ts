// "Armar equipos" para revoltijos (CLAUDE.md §5.3a).
// Snake draft por rating, repartiendo primero a los arqueros.
// Función pura: el organizador puede ajustar el resultado manualmente después.

export interface DraftPlayer {
  id: string;
  rating: number;
  isGoalkeeper: boolean;
}

export interface DraftResult {
  sideA: DraftPlayer[];
  sideB: DraftPlayer[];
  avgA: number;
  avgB: number;
}

const byRatingDesc = (a: DraftPlayer, b: DraftPlayer) => b.rating - a.rating || a.id.localeCompare(b.id);

export function balanceTeams(players: readonly DraftPlayer[]): DraftResult {
  const sideA: DraftPlayer[] = [];
  const sideB: DraftPlayer[] = [];
  const sum = (side: DraftPlayer[]) => side.reduce((s, p) => s + p.rating, 0);

  // 1) Arqueros: el mejor al lado A, el segundo al B, y así alternando.
  //    Si sobran arqueros, se tratan como jugadores de campo.
  const keepers = players.filter((p) => p.isGoalkeeper).sort(byRatingDesc);
  const assignedKeepers = keepers.slice(0, 2);
  assignedKeepers.forEach((k, i) => (i === 0 ? sideA : sideB).push(k));

  // 2) Resto en snake draft: A, B, B, A, A, B, B, A…
  //    Arranca eligiendo el lado que quedó más débil tras los arqueros.
  const rest = players.filter((p) => !assignedKeepers.includes(p)).sort(byRatingDesc);
  const firstPicker = sum(sideA) <= sum(sideB) ? "A" : "B";
  rest.forEach((p, i) => {
    const pairIndex = Math.floor(i / 2);
    const firstInPair = i % 2 === 0;
    const pickerIsFirst = pairIndex % 2 === 0 ? firstInPair : !firstInPair;
    const side = pickerIsFirst === (firstPicker === "A") ? sideA : sideB;
    side.push(p);
  });

  // 3) Ajuste fino: intercambia pares de jugadores de campo mientras eso acerque
  //    las sumas de rating. Mantiene tamaños y arqueros. Determinista.
  improveBySwaps(sideA, sideB, assignedKeepers);

  // 4) Si quedaron con distinta cantidad (impar), no se fuerza nada:
  //    el organizador decide. Promedios para mostrar en pantalla.
  const avg = (side: DraftPlayer[]) => (side.length ? Math.round(sum(side) / side.length) : 0);
  return { sideA, sideB, avgA: avg(sideA), avgB: avg(sideB) };
}

function improveBySwaps(sideA: DraftPlayer[], sideB: DraftPlayer[], locked: readonly DraftPlayer[]) {
  const total = (side: DraftPlayer[]) => side.reduce((s, p) => s + p.rating, 0);
  // Tope de iteraciones por seguridad; en la práctica converge en pocas pasadas.
  for (let iter = 0; iter < 50; iter++) {
    const gap = total(sideA) - total(sideB);
    let best: { i: number; j: number; newGap: number } | null = null;
    for (let i = 0; i < sideA.length; i++) {
      if (locked.includes(sideA[i]!)) continue;
      for (let j = 0; j < sideB.length; j++) {
        if (locked.includes(sideB[j]!)) continue;
        const newGap = gap - 2 * (sideA[i]!.rating - sideB[j]!.rating);
        if (Math.abs(newGap) < Math.abs(best?.newGap ?? gap)) best = { i, j, newGap };
      }
    }
    if (!best) return;
    const tmp = sideA[best.i]!;
    sideA[best.i] = sideB[best.j]!;
    sideB[best.j] = tmp;
  }
}
