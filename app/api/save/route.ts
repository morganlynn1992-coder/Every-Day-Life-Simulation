import { getChatGPTUser } from "@/app/chatgpt-auth";
import { readGameSave, writeGameSave } from "@/db/game-saves";

export const dynamic = "force-dynamic";

async function playerKey() {
  const user = await getChatGPTUser();
  return user?.email || "private-site-owner";
}

export async function GET() {
  try {
    return Response.json({ save: await readGameSave(await playerKey()) });
  } catch (error) {
    console.error("Unable to load game save", error);
    return Response.json({ error: "Saved game could not be loaded." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const save = await request.json();
    if (!save || typeof save !== "object") {
      return Response.json({ error: "Invalid saved game." }, { status: 400 });
    }
    await writeGameSave(await playerKey(), save);
    return Response.json({ saved: true });
  } catch (error) {
    console.error("Unable to save game", error);
    return Response.json({ error: "Game could not be saved." }, { status: 503 });
  }
}
