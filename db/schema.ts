import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const gameSaves = sqliteTable("game_saves", {
  playerKey: text("player_key").primaryKey(),
  saveData: text("save_data").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
