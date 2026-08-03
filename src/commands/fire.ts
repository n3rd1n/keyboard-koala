import { invoke } from "@tauri-apps/api/core";
import type { CommandJson } from "../types/command";

export type FireResult =
  | { kind: "launched" }
  | { kind: "enter-group"; commands: CommandJson[] }
  | { kind: "enter-text"; commands: CommandJson[] }
  | { kind: "enter-app-launcher" };

export async function fireCommand(command: CommandJson): Promise<FireResult> {
  if (command.type === "app-launcher") {
    return { kind: "enter-app-launcher" };
  }

  if (command.type === "text") {
    return {
      kind: "enter-text",
      commands: command.group ?? [],
    };
  }

  if (command.group && command.group.length > 0) {
    return {
      kind: "enter-group",
      commands: command.group,
    };
  }

  await invoke("launch_target", {
    path: command.path ?? null,
    url: command.url ?? null,
  });

  return { kind: "launched" };
}

export async function launchInstalledApp(path: string): Promise<void> {
  await invoke("launch_target", {
    path,
    url: null,
  });
}
