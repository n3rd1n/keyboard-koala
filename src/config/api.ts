import { invoke } from "@tauri-apps/api/core";
import type { ConfigFile, MergedConfig } from "../types/command";

export async function loadMergedConfig(): Promise<MergedConfig> {
  return invoke<MergedConfig>("get_merged_config");
}

export async function loadPrimaryConfig(): Promise<ConfigFile> {
  return invoke<ConfigFile>("read_primary_config");
}

export async function savePrimaryConfig(
  config: ConfigFile,
): Promise<MergedConfig> {
  return invoke<MergedConfig>("save_primary_config", { config });
}
