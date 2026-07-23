import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "user_settings.json");

export interface UserSettings {
  user_id: string;
  risk_level: string;
  investment_cap: number;
  execution_mode: "auto" | "recommend";
}

const defaultSettings: UserSettings = {
  user_id: "default",
  risk_level: "medium",
  investment_cap: 10000,
  execution_mode: "recommend",
};

function ensureDb(): UserSettings {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultSettings, null, 2));
    return { ...defaultSettings };
  }
  const data = fs.readFileSync(DB_FILE, "utf-8");
  return { ...defaultSettings, ...JSON.parse(data) };
}

export function getUserSettings(): UserSettings {
  return ensureDb();
}

export function updateUserSettings(
  updates: Partial<Omit<UserSettings, "user_id">>
): UserSettings {
  const current = ensureDb();
  const updated = { ...current, ...updates };
  fs.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2));
  return updated;
}
