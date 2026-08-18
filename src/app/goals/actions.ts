"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session-store";
import { getGoalStore } from "@/lib/goals/store";
import { getStaticType } from "@/lib/sde/database";

async function currentCharacterId(): Promise<number> {
  const sessionId = (await cookies()).get("eve_session")?.value;
  if (!sessionId) throw new Error("Connect an EVE character before saving goals.");
  const session = getSession(sessionId);
  if (!session) throw new Error("Your EVE session is no longer available. Reconnect and try again.");
  return session.characterId;
}

function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function activityKey(title: string): string {
  const normalized = title.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `activity:${normalized || "custom"}`;
}

export async function saveItemGoalAction(formData: FormData): Promise<void> {
  const characterId = await currentCharacterId();
  const typeId = Number(formString(formData, "typeId"));
  if (!Number.isSafeInteger(typeId) || typeId <= 0) throw new Error("Invalid item goal.");
  const item = getStaticType(typeId);
  if (!item || item.isPlaceholder) throw new Error("This item is not resolved well enough to save as a goal.");

  getGoalStore().saveGoal({
    characterId,
    kind: "item",
    targetKey: `type:${typeId}`,
    targetTypeId: typeId,
    title: item.name ?? `Type ${typeId}`,
  });
  revalidatePath(`/items/${typeId}`);
  revalidatePath("/goals");
  redirect("/goals");
}

export async function saveActivityGoalAction(formData: FormData): Promise<void> {
  const characterId = await currentCharacterId();
  const title = formString(formData, "title");
  if (!title) throw new Error("Enter an activity goal first.");
  getGoalStore().saveGoal({
    characterId,
    kind: "activity",
    targetKey: activityKey(title),
    title,
  });
  revalidatePath("/goals");
}

export async function addGoalStepAction(formData: FormData): Promise<void> {
  const characterId = await currentCharacterId();
  const goalId = formString(formData, "goalId");
  const label = formString(formData, "label");
  if (!goalId || !label) return;
  getGoalStore().addStep(characterId, goalId, label);
  revalidatePath("/goals");
}

export async function setGoalStepCompletedAction(formData: FormData): Promise<void> {
  const characterId = await currentCharacterId();
  const goalId = formString(formData, "goalId");
  const stepId = formString(formData, "stepId");
  const completed = formString(formData, "completed") === "true";
  if (!goalId || !stepId) return;
  getGoalStore().setStepCompleted(characterId, goalId, stepId, completed);
  revalidatePath("/goals");
}

export async function setGoalCompletedAction(formData: FormData): Promise<void> {
  const characterId = await currentCharacterId();
  const goalId = formString(formData, "goalId");
  const completed = formString(formData, "completed") === "true";
  if (!goalId) return;
  getGoalStore().setGoalCompleted(characterId, goalId, completed);
  revalidatePath("/goals");
}
