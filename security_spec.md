# Security Specification — La Tribu Event Venue Booking

## 1. Data Invariants
1. **Default-Deny Baseline**: Every path not explicitly matched is denied for both read and write (`allow read, write: if false;`).
2. **ID Hardening**: All document ID variables (`reservationId`, `infoId`, `blockId`, `adminId`) must match `^[a-zA-Z0-9_\-]+$` and have `size() <= 128`.
3. **Verified Identity**: All authenticated writes require `request.auth != null` and `request.auth.token.email_verified == true`.
4. **Bootstrapped & DB-Backed Admin**: An administrator is verified via `request.auth.token.email_verified == true && request.auth.token.email == 'jjosevilla01@gmail.com'` OR `exists(/databases/$(database)/documents/admins/$(request.auth.uid))`.
5. **PII Split Collection Isolation**: Customer phone and email are stored exclusively in `/reservations/{reservationId}/private/{infoId}` and can only be read by the document owner (`ownerId == request.auth.uid` verified via parent `get()`) or `isAdmin()`.
6. **Master Gate Relational Sync**: Every access to `/reservations/{reservationId}/private/{infoId}` fetches the parent `/reservations/{reservationId}` via `get()` (or `existsAfter()` on atomic batch creation) to verify ownership and existence.
7. **Anti-Update-Gap & Action-Based Updates**: Every `create` and `update` invokes `isValidReservation`, `isValidReservationPrivateContact`, or `isValidCalendarBlock` first, and every `update` uses `incoming().diff(existing()).affectedKeys().hasOnly(...)` + immutable field checks (`ownerId`, `createdAt`) + terminal state locking (`status in ['cancelled', 'completed']` cannot be mutated by non-admins).
8. **Temporal Integrity**: `createdAt == request.time` on creation and `updatedAt == request.time` on update.

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Identity Spoofing on Reservation Create)**: Authenticated user `uid_attacker` attempts to create `/reservations/res_1` with `ownerId: "uid_victim"`. -> `PERMISSION_DENIED`.
2. **Payload 2 (Shadow Field Injection on Reservation Create)**: User sends valid reservation payload plus extra field `"isAdminApproved": true`. -> `PERMISSION_DENIED` via `hasOnly()`.
3. **Payload 3 (Unverified Email Admin Spoof)**: User with `email: "jjosevilla01@gmail.com"` but `email_verified: false` attempts to approve a reservation or read another user's PII. -> `PERMISSION_DENIED`.
4. **Payload 4 (PII Blanket Read Attempt)**: Authenticated user `uid_other` attempts `get` on `/reservations/res_1/private/contact` owned by `uid_owner`. -> `PERMISSION_DENIED`.
5. **Payload 5 (Orphaned Subcollection Write)**: User attempts to create `/reservations/non_existent_res/private/contact` without parent reservation existing or being created atomically. -> `PERMISSION_DENIED`.
6. **Payload 6 (Terminal State Mutation)**: Owner attempts to update a reservation whose existing `status` is `'completed'` or `'cancelled'`. -> `PERMISSION_DENIED`.
7. **Payload 7 (Value Poisoning on Update)**: Owner updates whitelisted field `notes` with a 10,000-character string or numeric value. -> `PERMISSION_DENIED` via `isValidReservation(incoming())`.
8. **Payload 8 (Immortal Field Tampering)**: Owner attempts to change `createdAt` or `ownerId` during an update. -> `PERMISSION_DENIED`.
9. **Payload 9 (Client Timestamp Forgery)**: User sets `createdAt` to a past/future timestamp instead of `request.time`. -> `PERMISSION_DENIED`.
10. **Payload 10 (ID Poisoning Attack)**: Attacker attempts to create document with 300-character or special-character ID `res$!@#`. -> `PERMISSION_DENIED` via `isValidId()`.
11. **Payload 11 (Unauthorized Calendar Block Write)**: Non-admin user attempts to create or delete `/calendarBlocks/blk_1`. -> `PERMISSION_DENIED`.
12. **Payload 12 (Unbounded List Query Scraping)**: User attempts an unconstrained `list` query on `/reservations` where `resource.data.ownerId != request.auth.uid` (and user is not admin). -> `PERMISSION_DENIED`.
