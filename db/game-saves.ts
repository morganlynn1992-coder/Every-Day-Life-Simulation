import { env } from "cloudflare:workers";

export async function readGameSave(playerKey: string) {
  const row = await env.DB.prepare(
    "SELECT save_data FROM game_saves WHERE player_key = ?",
  ).bind(playerKey).first<{ save_data: string }>();

  if (!row) return null;
  return JSON.parse(row.save_data);
}

export async function writeGameSave(playerKey: string, save: unknown) {
  await env.DB.prepare(`
    INSERT INTO game_saves (player_key, save_data, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(player_key) DO UPDATE SET
      save_data = excluded.save_data,
      updated_at = CURRENT_TIMESTAMP
  `).bind(playerKey, JSON.stringify(save)).run();
}
