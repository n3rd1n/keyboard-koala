import type { CommandJson, ConfigFile } from "../types/command";

export function emptyCommand(): CommandJson {
  return { name: "New command", key: "" };
}

export function parseConfigText(text: string): ConfigFile {
  const parsed = JSON.parse(text) as unknown;

  if (Array.isArray(parsed)) {
    return { commands: parsed as CommandJson[] };
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Config must be a JSON object or array");
  }

  const config = parsed as ConfigFile;
  if (!Array.isArray(config.commands)) {
    throw new Error("commands must be an array");
  }

  return {
    hotkey: config.hotkey,
    autostart: config.autostart,
    theme: config.theme,
    themeOverrides: config.themeOverrides,
    commands: config.commands,
  };
}

export function stringifyConfig(config: ConfigFile): string {
  return JSON.stringify(config, null, 2);
}

export function updateCommandAt(
  commands: CommandJson[],
  path: number[],
  next: CommandJson,
): CommandJson[] {
  if (path.length === 0) {
    return commands;
  }

  const [index, ...rest] = path;
  return commands.map((command, i) => {
    if (i !== index) {
      return command;
    }
    if (rest.length === 0) {
      return next;
    }
    return {
      ...command,
      group: updateCommandAt(command.group ?? [], rest, next),
    };
  });
}

export function removeCommandAt(
  commands: CommandJson[],
  path: number[],
): CommandJson[] {
  if (path.length === 0) {
    return commands;
  }

  const [index, ...rest] = path;
  if (rest.length === 0) {
    return commands.filter((_, i) => i !== index);
  }

  return commands.map((command, i) => {
    if (i !== index) {
      return command;
    }
    return {
      ...command,
      group: removeCommandAt(command.group ?? [], rest),
    };
  });
}

export function addCommandAt(
  commands: CommandJson[],
  parentPath: number[],
  command: CommandJson = emptyCommand(),
): CommandJson[] {
  if (parentPath.length === 0) {
    return [...commands, command];
  }

  const [index, ...rest] = parentPath;
  return commands.map((item, i) => {
    if (i !== index) {
      return item;
    }
    if (rest.length === 0) {
      return {
        ...item,
        group: [...(item.group ?? []), command],
      };
    }
    return {
      ...item,
      group: addCommandAt(item.group ?? [], rest, command),
    };
  });
}

export function moveCommand(
  commands: CommandJson[],
  path: number[],
  direction: -1 | 1,
): CommandJson[] {
  if (path.length === 0) {
    return commands;
  }

  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1] ?? 0;

  if (parentPath.length === 0) {
    return moveInList(commands, index, direction);
  }

  const [parentIndex, ...rest] = parentPath;
  return commands.map((command, i) => {
    if (i !== parentIndex) {
      return command;
    }
    if (rest.length === 0) {
      return {
        ...command,
        group: moveInList(command.group ?? [], index, direction),
      };
    }
    return {
      ...command,
      group: moveCommand(command.group ?? [], [...rest, index], direction),
    };
  });
}

function moveInList(
  commands: CommandJson[],
  index: number,
  direction: -1 | 1,
): CommandJson[] {
  const target = index + direction;
  if (target < 0 || target >= commands.length) {
    return commands;
  }
  const next = [...commands];
  const [item] = next.splice(index, 1);
  if (!item) {
    return commands;
  }
  next.splice(target, 0, item);
  return next;
}
