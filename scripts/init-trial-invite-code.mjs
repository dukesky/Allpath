#!/usr/bin/env node

import { Firestore } from "@google-cloud/firestore";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalNumber(name, fallback) {
  const value = process.env[name]?.trim();
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
  return parsed;
}

async function main() {
  const code = required("INVITE_CODE");
  const enabled = (process.env.INVITE_ENABLED ?? "true").trim().toLowerCase() !== "false";
  const label = (process.env.INVITE_LABEL ?? "Friends Trial").trim();
  const trialBudgetUsd = optionalNumber("TRIAL_BUDGET_USD", 2);
  const projectId = process.env.GOOGLE_CLOUD_PROJECT?.trim() || process.env.GCLOUD_PROJECT?.trim() || undefined;
  const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim() || undefined;

  const db = new Firestore({ projectId, databaseId });
  const ref = db.collection("trial_invite_codes").doc(code);
  const now = new Date().toISOString();
  const snapshot = await ref.get();

  const next = {
    code,
    enabled,
    label,
    trialBudgetUsd,
    updatedAt: now,
    ...(snapshot.exists ? {} : { redeemedCount: 0, createdAt: now })
  };

  await ref.set(next, { merge: true });

  console.log(`Invite code upserted: ${code}`);
  console.log(`label=${label}`);
  console.log(`enabled=${enabled}`);
  console.log(`trialBudgetUsd=${trialBudgetUsd.toFixed(2)}`);
  if (projectId) {
    console.log(`projectId=${projectId}`);
  }
  if (databaseId) {
    console.log(`databaseId=${databaseId}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
