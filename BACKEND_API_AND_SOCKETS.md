# Backend Routes and Logic

This document summarizes the backend routes and the core exchange/match lifecycle logic for the P2P platform backend.

---

## Route Overview

### User Routes

- `POST /user/register`
  - Registers a new user with `username`, `email`, and `password`.
- `POST /user/login`
  - Logs in an existing user and issues a signed session cookie (`sid`).
- `GET /user/`
  - Returns authenticated user details.
  - Middleware: `checkAuth`

---

### Exchange Request Routes (`/exchange`)

> All exchange routes use `checkAuth` in `app.js`.

- `POST /exchange/create`
  - Controller: `createRequest`
  - Creates a new exchange request.
  - Validates request payload using `exchangeRequestSchema`.
  - Ensures the creator has no existing active or matched request that is still unexpired.
  - Sets status = `ACTIVE` and computes `expiresAt` from `expiry`.
  - Emits socket event: `newRequest`.

- `PATCH /exchange/cancel/:requestId`
  - Controller: `cancelRequest`
  - Cancels the creator's own active request.
  - Only allows cancellation when request status = `ACTIVE` and not expired.
  - Blocks cancel if any `Match` exists with status `PENDING` or `ACTIVE` for that request.
  - Sets request status = `CANCELLED`.
  - Emits socket event: `requestCancelled`.

- `GET /exchange/public`
  - Controller: `getPublicRequests`
  - Returns publicly available `ACTIVE` requests that are not expired.
  - Excludes requests created by the current user.
  - Excludes requests for which the current user already has a `PENDING` or `ACTIVE` match.

- `GET /exchange/me`
  - Controller: `getMyRequests`
  - Returns all requests created by the authenticated user.
  - Marks requests as expired if `expiresAt < now`.

---

### Match Routes (`/match`)

> All match routes use `checkAuth` in `app.js`.

- `POST /match/accept/:requestId`
  - Controller: `createMatch`
  - Creates a `PENDING` match for an existing `ACTIVE` exchange request.
  - Validates that the accepter has no existing `PENDING` or `ACTIVE` match.
  - Requires the request to belong to a different user and to still be active and unexpired.
  - Rejects creation if the request already has an active match.
  - Sets match status = `PENDING`, `accepterConfirmed = true`, `requesterConfirmed = false`.
  - Emits socket event: `newMatch` to the request creator.

- `GET /match/active`
  - Controller: `viewActiveMatch`
  - Returns all active matches where the authenticated user is either requester or accepter.
  - Populates requester, accepter, and request details.

- `GET /match/pending`
  - Controller: `viewPendingMatch`
  - Returns pending matches where the authenticated user is the requester.
  - Populates requester, accepter, and request details.

- `PATCH /match/confirm/:matchId`
  - Controller: `confirmMatch`
  - Request creator confirms a pending match.
  - Requires match status = `PENDING`, `accepterConfirmed = true`, and requester's identity.
  - Sets match status = `ACTIVE` and `requesterConfirmed = true`.
  - Cancels all other pending matches for the same request.
  - Updates the exchange request status to `MATCHED` and removes `expiresAt`.
  - Emits socket event: `confirmMatch` to the accepter.

- `PATCH /match/reject/:matchId`
  - Controller: `rejectMatch`
  - Request creator rejects a pending match.
  - Requires match status = `PENDING`, `accepterConfirmed = true`, and requester's identity.
  - Sets match status = `CANCELLED`.
  - Emits socket event: `rejectMatch` to the accepter.

- `PATCH /match/complete/:matchId`
  - Controller: `completeMatch`
  - Either participant can mark an `ACTIVE` match as completed.
  - Requires match status = `ACTIVE`, both confirmations true, and the user to be either requester or accepter.
  - Records `requesterCompleted` or `accepterCompleted`.
  - When both participants complete:
    - Sets match status = `COMPLETED`.
    - Sets request status = `COMPLETED`.
    - Emits `completeMatch` to both users with `completedCount = 2`.
  - If only one participant completes, emits `completeMatch` with `completedCount = 1`.

- `PATCH /match/cancel/:matchId`
  - Controller: `cancelActiveMatch`
  - Either participant can cancel an `ACTIVE` match.
  - Requires match status = `ACTIVE`, both confirmations true, and the user to be requester or accepter.
  - Prevents cancellation if the same participant already completed or already cancelled.
  - Sets match status = `CANCELLED` and request status = `CANCELLED`.
  - Emits `cancelActiveMatch` to the other participant.

---

### Chat Route (`/chat`)

> All chat routes use `checkAuth` in `app.js`.

- `GET /chat/:matchId`
  - Controller: `getChat`
  - Fetches chat messages for an `ACTIVE` match.
  - Requires the authenticated user to be either requester or accepter of the active match.
  - Populates `sender` username and avatar.

---

## Status Lifecycles

### Exchange Request Lifecycle

```text
ACTIVE
├── CANCELLED
├── EXPIRED
└── MATCHED
     └── COMPLETED
```

- `ACTIVE`
  - Request is publicly visible and available for matching.
  - Can transition to `CANCELLED`, `EXPIRED`, or `MATCHED`.

- `CANCELLED`
  - Request creator manually cancels an active request.
  - Final state.

- `EXPIRED`
  - Request expires via `expiresAt`.
  - Final state.

- `MATCHED`
  - A pending match is confirmed.
  - Request is locked to the selected match.
  - Transition to `COMPLETED` when both participants complete.

- `COMPLETED`
  - Final successful exchange state.

---

### Match Lifecycle

```text
PENDING
├── ACTIVE
│    ├── COMPLETED
│    └── CANCELLED
└── CANCELLED
```

- `PENDING`
  - Created when a user accepts an active request.
  - Waiting for request creator confirmation.
  - Can transition to `ACTIVE` or `CANCELLED`.

- `ACTIVE`
  - Match confirmed by the requester.
  - Exchange begins and chat becomes available.
  - Can transition to `COMPLETED` or `CANCELLED`.

- `COMPLETED`
  - Both users completed the match.
  - Request and match are finalized.

- `CANCELLED`
  - Created if the requester rejects a pending match, a competing match is confirmed, or an active match is cancelled.

---

## System Flow Summary

1. `POST /exchange/create` → new exchange request becomes `ACTIVE`.
2. Other users call `POST /match/accept/:requestId` → new `PENDING` match.
3. Request creator calls `PATCH /match/confirm/:matchId` → match becomes `ACTIVE`, request becomes `MATCHED`, other pending matches become `CANCELLED`.
4. Participants call `PATCH /match/complete/:matchId`:
   - first completion updates participant state,
   - second completion sets match and request to `COMPLETED`.
5. If either participant cancels via `PATCH /match/cancel/:matchId` before both complete, match and request become `CANCELLED`.

---

## Notes

- Socket events are emitted from `exchangeController.js` and `matchController.js`.
- `checkAuth` middleware protects `/exchange`, `/match`, and `/chat`.
- Public request discovery excludes requests already engaged by the current user.
- Only the request creator can confirm or reject pending matches.
- A match is only considered active when both participants have confirmed and the request is matched.

---

## Socket / Realtime Events

### Socket setup

- `socketAuth` authenticates connections using the signed `sid` cookie.
- On connection, each socket joins:
  - `public-room` for global exchange request events.
  - `user:<userId>` for direct user notifications.
- Chat sockets can also join a match-specific room using `joinRoom`.

### Join room

- Event: `joinRoom`
- Payload: `matchId`
- Backend validates that the authenticated user is either the `requester` or `accepter` of the match.
- If valid, socket joins room `matchId`.
- Frontend should call this when opening a match chat or entering an active match.

### Send message

- Event: `sendMessage`
- Payload: `{ matchId, message }`
- Backend validates the message and match ownership.
- Creates a `Chat` document and emits `newMessage` to room `matchId`.
- Frontend should listen for `newMessage` to display realtime chat updates.

### Server-emitted events from controllers

- `newRequest`
  - Emitted from `createRequest`.
  - Sent to `public-room` when a new exchange request is created.
  - Frontend can listen on `public-room` to update public request listings instantly.

- `requestCancelled`
  - Emitted from `cancelRequest`.
  - Sent to `public-room` when an active request is cancelled.
  - Frontend should remove the cancelled request from public listings.

- `newMatch`
  - Emitted from `createMatch`.
  - Sent to `user:<requestCreatorId>` when someone applies to the creator's request.
  - Frontend can notify the requester of a new pending match.

- `confirmMatch`
  - Emitted from `confirmMatch`.
  - Sent to `user:<accepterId>` when the requester confirms a pending match.
  - Frontend should update the accepter’s match status to `ACTIVE` and unlock chat.

- `rejectMatch`
  - Emitted from `rejectMatch`.
  - Sent to `user:<accepterId>` when the requester rejects a pending match.
  - Frontend should update the match state to `CANCELLED` for the accepter.

- `completeMatch`
  - Emitted from `completeMatch`.
  - Sent to both users after a completion event.
  - Payload includes `matchId`, `completedCount`, and `totalCount`.
  - Frontend can show progress toward full completion and transition to `COMPLETED` once both users finish.

- `cancelActiveMatch`
  - Emitted from `cancelActiveMatch`.
  - Sent to the other participant when one user cancels an active match.
  - Frontend should mark the match as cancelled and end the exchange.

### Frontend realtime usage guidance

- Connect to socket.io after login and before interacting with requests/matches.
- Use the signed session cookie for socket authentication.
- Listen on:
  - `newRequest` for live public request creation.
  - `requestCancelled` for request removal.
  - `newMatch`, `confirmMatch`, `rejectMatch`, `completeMatch`, `cancelActiveMatch` for match-related events.
- Join `matchId` rooms before sending chat messages and to receive `newMessage` events.
- Use room-based events so only users involved in a match receive its chat and status updates.

### Socket Event Table

| Event               | Direction       | Room / Target                              | Trigger                             | Frontend Use                                |
| ------------------- | --------------- | ------------------------------------------ | ----------------------------------- | ------------------------------------------- |
| `newRequest`        | server → client | `public-room`                              | `POST /exchange/create`             | Refresh public request listings             |
| `requestCancelled`  | server → client | `public-room`                              | `PATCH /exchange/cancel/:requestId` | Remove cancelled request from listings      |
| `newMatch`          | server → client | `user:<requestCreatorId>`                  | `POST /match/accept/:requestId`     | Notify requester of new pending match       |
| `confirmMatch`      | server → client | `user:<accepterId>`                        | `PATCH /match/confirm/:matchId`     | Transition match to active and enable chat  |
| `rejectMatch`       | server → client | `user:<accepterId>`                        | `PATCH /match/reject/:matchId`      | Mark pending match cancelled for accepter   |
| `completeMatch`     | server → client | `user:<requesterId>` / `user:<accepterId>` | `PATCH /match/complete/:matchId`    | Show completion progress and finalize match |
| `cancelActiveMatch` | server → client | `user:<otherParticipantId>`                | `PATCH /match/cancel/:matchId`      | End active match and update UI to cancelled |
| `newMessage`        | server → client | `matchId` room                             | `sendMessage` socket event          | Display new chat message in realtime        |

---

### Frontend socket lifecycle checklist

1. Authenticate with the backend API and receive the signed `sid` cookie.
2. Connect to socket.io using the same origin and include credentials.
3. On connection, the backend automatically joins the socket to `public-room` and `user:<userId>`.
4. When opening an active match or chat screen, emit `joinRoom` with `matchId` and wait for a successful callback.
5. Listen for realtime events:
   - `newRequest`, `requestCancelled` for public request feed updates.
   - `newMatch`, `confirmMatch`, `rejectMatch`, `completeMatch`, `cancelActiveMatch` for user-specific notifications.
   - `newMessage` inside the `matchId` room for chat updates.
6. Send chat by emitting `sendMessage` with `{ matchId, message }`, then update UI using callback success and incoming `newMessage`.
7. On match/request updates, refresh local state or fetch the latest request/match data when a relevant event arrives.
8. Handle reconnects gracefully to rejoin match rooms and keep the UI in sync.
