import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  };
  console.error('Firestore TestRuns Error: ', JSON.stringify(errInfo));
}

export interface TestSuiteDetail {
  title: string;
  file: string;
  tests: {
    name: string;
    status: string;
    durationMs: number;
    error?: string;
  }[];
}

export interface TestRunRecord {
  runId: string;
  timestamp: string;
  branch: string;
  commitSha: string;
  commitMessage?: string;
  status: 'passed' | 'failed' | 'flaky' | 'timedOut';
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  passRate: number;
  environment: string;
  suites: TestSuiteDetail[];
  createdAt: string;
}

/**
 * Subscribes to real-time test run telemetry from Firestore
 */
export function subscribeToTestRuns(
  onUpdate: (runs: TestRunRecord[]) => void,
  onError?: (error: Error) => void
): () => void {
  const testRunsCollection = collection(db, 'test_runs');
  const q = query(testRunsCollection, orderBy('createdAt', 'desc'), limit(25));

  try {
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records: TestRunRecord[] = [];
        snapshot.forEach((doc) => {
          records.push(doc.data() as TestRunRecord);
        });
        onUpdate(records);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'test_runs');
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'test_runs');
    return () => {};
  }
}

/**
 * Fetches recent test runs once
 */
export async function fetchRecentTestRuns(maxCount = 20): Promise<TestRunRecord[]> {
  const testRunsCollection = collection(db, 'test_runs');
  const q = query(testRunsCollection, orderBy('createdAt', 'desc'), limit(maxCount));

  try {
    const snapshot = await getDocs(q);
    const records: TestRunRecord[] = [];
    snapshot.forEach((doc) => {
      records.push(doc.data() as TestRunRecord);
    });
    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'test_runs');
    return [];
  }
}
