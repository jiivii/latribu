/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Reservation Create',
    operation: 'create',
    path: '/reservations/res_01',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { ownerId: 'user_b', firstName: 'Ana', lastName: 'Gomez' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Field Injection on Reservation Create',
    operation: 'create',
    path: '/reservations/res_02',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { ownerId: 'user_a', firstName: 'Ana', isVerifiedShadow: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Admin Spoof',
    operation: 'update',
    path: '/reservations/res_01',
    auth: { uid: 'spoof_admin', email: 'jjosevilla01@gmail.com', email_verified: false },
    payload: { status: 'confirmed' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'PII Blanket Read Attempt by Non-Owner',
    operation: 'get',
    path: '/reservations/res_01/private/info',
    auth: { uid: 'user_intruder', email: 'intruder@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Orphaned Private Contact Creation',
    operation: 'create',
    path: '/reservations/non_existent/private/info',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { ownerId: 'user_a', reservationId: 'non_existent', phone: '600111222', email: 'a@example.com' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Terminal State Mutation by Non-Admin',
    operation: 'update',
    path: '/reservations/res_completed',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { notes: 'Trying to edit after completion' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Value Poisoning on Whitelisted Update Field',
    operation: 'update',
    path: '/reservations/res_01',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { notes: 'x'.repeat(2000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immortal Field Tampering (ownerId / createdAt)',
    operation: 'update',
    path: '/reservations/res_01',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { ownerId: 'other_user' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery',
    operation: 'create',
    path: '/reservations/res_03',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'ID Poisoning Attack with Invalid Characters',
    operation: 'create',
    path: '/reservations/invalid$id!@#',
    auth: { uid: 'user_a', email: 'a@example.com', email_verified: true },
    payload: { ownerId: 'user_a' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unauthorized Calendar Block Creation',
    operation: 'create',
    path: '/calendarBlocks/block_01',
    auth: { uid: 'regular_user', email: 'user@example.com', email_verified: true },
    payload: { ownerId: 'regular_user', date: '2026-10-15', reason: 'Fake block' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unconstrained List Query Scraping on Reservations',
    operation: 'list',
    path: '/reservations',
    auth: { uid: 'scraper_uid', email: 'scraper@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
