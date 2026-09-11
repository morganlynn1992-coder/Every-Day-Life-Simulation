CREATE TABLE `game_saves` (
	`player_key` text PRIMARY KEY NOT NULL,
	`save_data` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
