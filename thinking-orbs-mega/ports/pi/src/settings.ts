import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type OrbAppearance = "auto" | "dark" | "light";
export type OrbPlacement = "aboveEditor" | "belowEditor";
export type OrbMotion = "normal" | "reduced" | "static";

export interface OrbSettings {
  version: 1;
  enabled: boolean;
  fps: number;
  appearance: OrbAppearance;
  listening: boolean;
  placement: OrbPlacement;
  motion: OrbMotion;
}

export type OrbSettingsPatch = Partial<Omit<OrbSettings, "version">>;

export const DEFAULT_ORB_SETTINGS: Readonly<OrbSettings> = Object.freeze({
  version: 1,
  enabled: true,
  fps: 30,
  appearance: "auto",
  listening: true,
  placement: "aboveEditor",
  motion: "normal",
});

const SETTING_KEYS = new Set<keyof OrbSettings>([
  "version",
  "enabled",
  "fps",
  "appearance",
  "listening",
  "placement",
  "motion",
]);

export type SettingsLoadResult =
  | { status: "missing" | "valid"; settings: OrbSettings }
  | { status: "invalid"; settings: OrbSettings; error: string };

export class InvalidSettingsFileError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`Invalid Thinking Orbs settings at ${path}: ${message}`);
    this.name = "InvalidSettingsFileError";
    this.path = path;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireBoolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${name} must be a boolean`);
  return value;
}

function requireChoice<T extends string>(
  value: unknown,
  name: string,
  choices: readonly T[],
): T {
  if (typeof value !== "string" || !choices.includes(value as T)) {
    throw new Error(`${name} must be one of: ${choices.join(", ")}`);
  }
  return value as T;
}

export function validateSettings(value: unknown): OrbSettings {
  if (!isRecord(value)) throw new Error("settings must be a JSON object");

  for (const key of Object.keys(value)) {
    if (!SETTING_KEYS.has(key as keyof OrbSettings)) {
      throw new Error(`unknown setting: ${key}`);
    }
  }

  if (value.version !== 1) {
    throw new Error(`unsupported settings version: ${String(value.version)}`);
  }

  const fps = value.fps ?? DEFAULT_ORB_SETTINGS.fps;
  if (!Number.isInteger(fps) || (fps as number) < 8 || (fps as number) > 60) {
    throw new Error("fps must be an integer from 8 to 60");
  }

  return {
    version: 1,
    enabled:
      value.enabled === undefined
        ? DEFAULT_ORB_SETTINGS.enabled
        : requireBoolean(value.enabled, "enabled"),
    fps: fps as number,
    appearance:
      value.appearance === undefined
        ? DEFAULT_ORB_SETTINGS.appearance
        : requireChoice(value.appearance, "appearance", ["auto", "dark", "light"]),
    listening:
      value.listening === undefined
        ? DEFAULT_ORB_SETTINGS.listening
        : requireBoolean(value.listening, "listening"),
    placement:
      value.placement === undefined
        ? DEFAULT_ORB_SETTINGS.placement
        : requireChoice(value.placement, "placement", ["aboveEditor", "belowEditor"]),
    motion:
      value.motion === undefined
        ? DEFAULT_ORB_SETTINGS.motion
        : requireChoice(value.motion, "motion", ["normal", "reduced", "static"]),
  };
}

function isMissingFile(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Error & { code?: string }).code === "ENOENT"
  );
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function getSettingsPath(
  env: Readonly<Record<string, string | undefined>> = process.env,
  homeDirectory = homedir(),
): string {
  const agentDirectory = env.PI_CODING_AGENT_DIR || join(homeDirectory, ".pi", "agent");
  return join(agentDirectory, "thinking-orbs.json");
}

export async function loadSettings(path: string): Promise<SettingsLoadResult> {
  let content: string;
  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    if (isMissingFile(error)) {
      return { status: "missing", settings: { ...DEFAULT_ORB_SETTINGS } };
    }
    return {
      status: "invalid",
      settings: { ...DEFAULT_ORB_SETTINGS },
      error: describeError(error),
    };
  }

  try {
    return { status: "valid", settings: validateSettings(JSON.parse(content)) };
  } catch (error) {
    return {
      status: "invalid",
      settings: { ...DEFAULT_ORB_SETTINGS },
      error: describeError(error),
    };
  }
}

export async function saveSettings(path: string, settings: OrbSettings): Promise<void> {
  const validated = validateSettings(settings);
  const directory = dirname(path);
  const temporaryPath = join(
    directory,
    `.thinking-orbs.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`,
  );

  await mkdir(directory, { recursive: true });
  try {
    await writeFile(temporaryPath, `${JSON.stringify(validated, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporaryPath, path);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

export async function mergeAndSaveSettings(
  path: string,
  patch: OrbSettingsPatch,
  options: { overwriteInvalid?: boolean; fallback?: OrbSettings } = {},
): Promise<{ previous: OrbSettings; settings: OrbSettings }> {
  const loaded = await loadSettings(path);
  if (loaded.status === "invalid" && !options.overwriteInvalid) {
    throw new InvalidSettingsFileError(path, loaded.error);
  }

  const previous =
    loaded.status === "invalid"
      ? validateSettings(options.fallback ?? DEFAULT_ORB_SETTINGS)
      : loaded.settings;
  const settings = validateSettings({ ...previous, ...patch, version: 1 });
  await saveSettings(path, settings);
  return { previous, settings };
}

export function effectiveImageFps(settings: OrbSettings): number | undefined {
  if (settings.motion === "static") return undefined;
  return settings.motion === "reduced" ? Math.min(settings.fps, 12) : settings.fps;
}

const ANSI_16_RGB: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0],
  [128, 0, 0],
  [0, 128, 0],
  [128, 128, 0],
  [0, 0, 128],
  [128, 0, 128],
  [0, 128, 128],
  [192, 192, 192],
  [128, 128, 128],
  [255, 0, 0],
  [0, 255, 0],
  [255, 255, 0],
  [0, 0, 255],
  [255, 0, 255],
  [0, 255, 255],
  [255, 255, 255],
];
const ANSI_CUBE = [0, 95, 135, 175, 215, 255] as const;

function ansiRgb(index: number): readonly [number, number, number] {
  if (index < 16) return ANSI_16_RGB[index];
  if (index < 232) {
    const value = index - 16;
    return [
      ANSI_CUBE[Math.floor(value / 36)],
      ANSI_CUBE[Math.floor((value % 36) / 6)],
      ANSI_CUBE[value % 6],
    ];
  }
  const gray = 8 + (index - 232) * 10;
  return [gray, gray, gray];
}

function isDarkAnsiColor(index: number): boolean {
  const [r, g, b] = ansiRgb(index);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.5;
}

export function resolveDarkAppearance(
  appearance: OrbAppearance,
  colorFgBg: string | undefined,
): boolean {
  if (appearance === "dark") return true;
  if (appearance === "light") return false;

  const background = colorFgBg
    ?.split(";")
    .map((part) => Number.parseInt(part.trim(), 10))
    .findLast((value) => Number.isInteger(value) && value >= 0 && value <= 255);
  return background === undefined ? true : isDarkAnsiColor(background);
}
