import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "user_settings.json");

export interface UserSettings {
  user_id: string;
  risk_level: string;
  investment_cap: number | null;
  execution_mode: "auto" | "recommend";
  brokerage_connected: boolean;
}

const defaultSettings: Omit<UserSettings, "user_id"> = {
  risk_level: "moderate",
  investment_cap: null,
  execution_mode: "recommend",
  brokerage_connected: false,
};

function ensureDb(): Record<string, UserSettings> {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const emptyDb: Record<string, UserSettings> = {};
    fs.writeFileSync(DB_FILE, JSON.stringify(emptyDb, null, 2));
    return { ...emptyDb };
  }
  const data = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(data);
}

export function getUserSettings(userId: string): UserSettings {
  const db = ensureDb();
  return {
    user_id: userId,
    ...defaultSettings,
    ...(db[userId] || {}),
  };
}

export function updateUserSettings(
  userId: string,
  updates: Partial<Omit<UserSettings, "user_id">>
): UserSettings {
  const db = ensureDb();
  const current = getUserSettings(userId);
  const updated = { ...current, ...updates, user_id: userId };
  db[userId] = updated;
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  return updated;
}
