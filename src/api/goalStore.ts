import { ApiError } from './client';
import type { AddGoalContributionInput, Amount, CreateGoalInput, Goal } from './types';

// Metas en memoria del celular: el back todavía no las guarda (decisión de Camilo, 2026-10-16).
// Lo usan mockApi (con la familia de ejemplo) y httpApi (vacío). Al cerrar la app se pierden.

const sum = (a: Amount, b: Amount): Amount => ({ ...a, value: String(BigInt(a.value) + BigInt(b.value)) });

// Copia para que la caché de las pantallas no comparta arreglos con el almacén.
const copy = (g: Goal): Goal => ({ ...g, contributions: [...g.contributions] });

let counter = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++counter}`;

export function createGoalStore(seed: Goal[] = []) {
  const goals: Goal[] = seed.map((g) => ({ ...g, contributions: [...g.contributions] }));

  function find(goalId: string): Goal {
    const goal = goals.find((g) => g.goalId === goalId);
    if (!goal) throw new ApiError('No encontramos esa meta.', 404, 'not_found');
    return goal;
  }

  return {
    list(): Goal[] {
      return goals.map(copy);
    },
    get(goalId: string): Goal {
      return copy(find(goalId));
    },
    create(input: CreateGoalInput, createdByName: string): Goal {
      if (!input.name.trim()) throw new ApiError('Póngale un nombre a la meta.', 400, 'bad_request');
      if (input.mode === 'colecta' && !input.beneficiaryWallet) throw new ApiError('Falta la billetera de quien recibe la colecta.', 400, 'bad_request');
      const goal: Goal = {
        goalId: newId('g'),
        mode: input.mode,
        name: input.name.trim(),
        target: input.target,
        deadline: input.deadline,
        beneficiaryName: input.beneficiaryName?.trim() || undefined,
        beneficiaryWallet: input.beneficiaryWallet,
        raised: { ...input.target, value: '0' },
        contributions: [],
        createdByName,
        createdAt: new Date().toISOString(),
      };
      goals.unshift(goal);
      return copy(goal);
    },
    contribute(goalId: string, input: AddGoalContributionInput, authorName: string): Goal {
      const goal = find(goalId);
      if (input.amount.assetCode !== goal.target.assetCode) throw new ApiError('El aporte no está en la moneda de la meta.', 400, 'bad_request');
      // Un mismo pago no suma dos veces (la pantalla 30 puede reintentar).
      if (input.paymentId && goal.contributions.some((c) => c.id === input.paymentId)) return copy(goal);
      goal.contributions.unshift({ id: input.paymentId ?? newId('c'), authorName, amount: input.amount, sent: input.sent, createdAt: new Date().toISOString() });
      goal.raised = sum(goal.raised, input.amount);
      return copy(goal);
    },
  };
}

export type GoalStore = ReturnType<typeof createGoalStore>;
