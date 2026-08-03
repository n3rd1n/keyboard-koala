import type { CommandJson } from "../types/command";

export type NavState = {
  path: string[];
  history: CommandJson[][];
  current: CommandJson[];
  active: CommandJson | null;
};

export function createNavState(commands: CommandJson[]): NavState {
  return {
    path: ["Home"],
    history: [],
    current: commands,
    active: null,
  };
}

export function findByKey(
  commands: CommandJson[],
  key: string,
): CommandJson | undefined {
  return commands.find((command) => command.key !== undefined && command.key === key);
}

export function groupByCategory(commands: CommandJson[]): CommandJson[][] {
  const groups: CommandJson[][] = [];

  for (const command of commands) {
    const existing = groups.find(
      (group) => group[0]?.category === command.category,
    );
    if (existing) {
      existing.push(command);
    } else {
      groups.push([command]);
    }
  }

  return groups;
}

export function enterGroup(
  state: NavState,
  command: CommandJson,
  next: CommandJson[],
): NavState {
  return {
    path: [...state.path, command.name],
    history: [...state.history, state.current],
    current: next,
    active: command,
  };
}

export function goBack(state: NavState): NavState {
  if (state.history.length === 0) {
    return state;
  }

  const history = [...state.history];
  const previous = history.pop() ?? state.current;
  const path = [...state.path];
  if (path.length > 1) {
    path.pop();
  }

  return {
    path,
    history,
    current: previous,
    active: null,
  };
}

export function resetNav(commands: CommandJson[]): NavState {
  return createNavState(commands);
}
