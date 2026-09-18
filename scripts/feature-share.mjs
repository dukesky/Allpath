#!/usr/bin/env node

// Feature (or unfeature) a shared conversation on the landing page.
//   SHARE_ID=<id> npm run share:feature                 -> featured: true, featuredAt: <now>
//   SHARE_ID=<id> UNFEATURE=true npm run share:feature  -> removes both fields
// Featured shares never expire. The landing page caches the list for up to
// 5 minutes per server instance, so changes can take that long to show.

import { FieldValue, Firestore } from "@google-cloud/firestore";

const SHARES_COLLECTION = "shared_sessions";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function flag(name) {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

async function main() {
  const shareId = required("SHARE_ID");
  if (shareId.includes("/")) {
    throw new Error(`SHARE_ID must be a share id, not a path or URL: ${shareId}`);
  }
  const unfeature = flag("UNFEATURE");
  const projectId = process.env.GOOGLE_CLOUD_PROJECT?.trim() || process.env.GCLOUD_PROJECT?.trim() || undefined;
  const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim() || undefined;

  const db = new Firestore({ projectId, databaseId });
  const ref = db.collection(SHARES_COLLECTION).doc(shareId);
  let snapshot;
  try {
    snapshot = await ref.get();
  } catch (error) {
    // gRPC NOT_FOUND on a document read means the database itself wasn't found.
    if (error?.code === 5) {
      throw new Error(
        `Firestore database not found (projectId=${projectId ?? "<ADC default>"}, databaseId=${databaseId ?? "(default)"}). ` +
          "Set GOOGLE_CLOUD_PROJECT and FIRESTORE_DATABASE_ID as in .env.local."
      );
    }
    throw error;
  }

  if (!snapshot.exists) {
    throw new Error(`Share not found: ${SHARES_COLLECTION}/${shareId} — nothing was changed.`);
  }

  const data = snapshot.data() ?? {};

  if (unfeature) {
    await ref.update({ featured: FieldValue.delete(), featuredAt: FieldValue.delete() });
    console.log(`Share unfeatured: ${shareId}`);
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      console.log(`note: expiresAt=${data.expiresAt} is in the past, so this share is now treated as expired.`);
    }
  } else {
    const featuredAt = new Date().toISOString();
    await ref.update({ featured: true, featuredAt });
    console.log(`Share featured: ${shareId}`);
    console.log(`featuredAt=${featuredAt}`);
  }

  console.log(`title=${data.title ?? "(untitled)"}`);
  if (projectId) {
    console.log(`projectId=${projectId}`);
  }
  if (databaseId) {
    console.log(`databaseId=${databaseId}`);
  }
  console.log("The landing page picks this up within 5 minutes (per-instance cache).");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
