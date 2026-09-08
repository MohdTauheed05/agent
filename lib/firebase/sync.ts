// Optional Firestore persistence for projects. Every function here no-ops
// when Firebase isn't configured (see isFirebaseConfigured() in config.ts),
// so a fresh clone with no .env.local behaves exactly as before — this only
// starts doing anything once real Firebase config is present.
//
// Scope, deliberately: this persists `projects` (which already carry their
// own subtasks[] and outputs[] inline) so a brief and its results survive a
// refresh. It does NOT persist `activityLog` or `agentRuntime` — those are
// live UI/animation state (the office floor, the feed) that's meaningful
// only while you're watching it run, not something a page reload should
// restore.
//
// This is a one-time hydrate on load + continuous write-through while you
// work, not a live cross-tab `onSnapshot` subscription. A live listener
// would echo the orchestrator's own writes back while a project is actively
// running, racing its in-memory updates. Real-time multi-tab sync is a
// reasonable next step (see README "Connecting Firebase") but needs a bit of
// conflict handling this MVP doesn't have yet.
import { collection, doc, getDocs, orderBy, query, setDoc } from "firebase/firestore";
import { Project } from "@/types";
import { getFirebaseDb, isFirebaseConfigured } from "./config";

const PROJECTS_COLLECTION = "projects";

// Firestore rejects `undefined` field values (Project/SubTask have several
// optional fields — selectedAgents, error, startedAt…). Round-tripping
// through JSON drops any key whose value is undefined, which is the
// simplest reliable way to make an arbitrary app object Firestore-safe
// without special-casing every optional field by hand.
function toFirestoreSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export async function fetchStoredProjects(): Promise<Project[]> {
  const db = getFirebaseDb();
  if (!db || !isFirebaseConfigured()) return [];
  try {
    const q = query(collection(db, PROJECTS_COLLECTION), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Project);
  } catch (err) {
    console.error("Failed to load stored projects from Firestore:", err);
    return [];
  }
}

// Fire-and-forget write-through, meant to be called after every local
// mutation to a project. Safe to call unconditionally — it's a no-op
// whenever Firebase isn't configured.
export function saveProjectAsync(project: Project): void {
  const db = getFirebaseDb();
  if (!db || !isFirebaseConfigured()) return;
  setDoc(doc(db, PROJECTS_COLLECTION, project.id), toFirestoreSafe(project)).catch((err) => {
    console.error("Failed to save project to Firestore:", err);
  });
}
