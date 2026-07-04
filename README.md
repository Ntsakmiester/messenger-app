# Custom Messenger — Starter Codebase

A real-time, cross-platform messenger (WhatsApp-style) with a Node.js backend
and a React Native mobile app. This is a working MVP: phone-number auth,
1:1 messaging, live delivery, typing indicators, and read receipts. It is
**not** feature-complete (no end-to-end encryption, media upload, voice/video,
or push notifications yet) — see "Next steps" below for how to add those.

## Architecture

```
[Phone A - South Africa]        [Phone B - Japan]
        |                              |
        v                              v
  Backend server (af-south-1)   Backend server (ap-northeast-1)
        |                              |
        +---------- Redis Pub/Sub -----+
                       |
                  PostgreSQL (shared, e.g. one primary + read replicas)
```

**Why this connects users across continents:** each user connects via
WebSocket to whichever backend server is geographically closest to them
(lowest latency). Socket.io's Redis adapter relays events between server
instances, so a message sent by a user connected to the Japan server is
instantly forwarded to a user connected to the South Africa server. This
is the same fundamental pattern real messaging platforms use — regional
edge servers + a shared coordination layer, not one server the whole world
connects to directly.

- **Backend**: Node.js, TypeScript, Express, Socket.io, Prisma, PostgreSQL, Redis
- **Mobile**: React Native (Expo), TypeScript, React Navigation, socket.io-client
- **Auth**: phone number + OTP (mocked SMS in dev — swap in Twilio/Vonage for real SMS)

## Running it locally

### Backend
```bash
cd backend
cp .env.example .env       # fill in DATABASE_URL and REDIS_URL
npm install
npx prisma migrate dev --name init
npm run dev                # starts on http://localhost:4000
```
You'll need a local Postgres and Redis, or use free-tier hosted ones (see below).

### Mobile app
```bash
cd mobile
npm install
# edit src/services/api.ts: set API_BASE_URL to your backend's URL
npx expo start
```
Scan the QR code with the Expo Go app on your phone (iOS or Android) to run it live.
Note: on a physical device, `localhost` won't reach your dev machine — use your
computer's LAN IP (e.g. `http://192.168.1.42:4000`) or a tunnel like ngrok.

## Deploying for real, cross-continent use

1. **Database**: use a managed Postgres (Supabase, Neon, AWS RDS). Pick a
   primary region, and add read replicas closer to other continents later
   if read latency becomes a problem.
2. **Redis**: use a managed Redis (Upstash, Redis Cloud) reachable from all
   your backend regions.
3. **Backend servers**: deploy the `backend/` app to at least 2–3 regions
   (e.g. Railway, Render, Fly.io, or AWS/GCP in `us-east`, `eu-west`,
   `ap-southeast`). Put them behind a global load balancer or use DNS-based
   geo-routing (e.g. Cloudflare, Route 53 latency routing) so each user's
   app connects to the nearest one.
4. **Mobile app**: build with `eas build` (Expo Application Services) to
   produce real iOS/Android binaries, then submit via `eas submit` to the
   App Store and Google Play. This requires an Apple Developer account
   ($99/yr) and a Google Play Developer account ($25 one-time).
5. **Media storage**: add an S3-compatible bucket (AWS S3, Cloudflare R2)
   for photos/videos, with a CDN in front so media loads fast globally.

## Next steps to reach WhatsApp-level functionality

- **End-to-end encryption**: implement the Signal Protocol (libsignal has
  official bindings) so message content is unreadable even to your own
  servers — this is a substantial addition and worth scoping separately.
- **Push notifications**: integrate Firebase Cloud Messaging (Android) and
  APNs (iOS) so users get notified when the app is closed.
- **Media messages**: wire up direct-to-S3 upload from the app, then send
  the resulting URL over the existing `message:send` socket event.
- **Voice/video calls**: would need WebRTC with a TURN/STUN server (e.g.
  coturn, or a managed service like Twilio/Agora) for NAT traversal.
- **Group chats**: the data model already supports it (`isGroup` flag);
  the mobile UI would need a group-creation and group-info screen.
- **Multi-device support**: currently one active session assumption is
  simplified; a real system tracks multiple device connections per user.

## Project structure
```
backend/
  src/
    controllers/     REST endpoint logic
    routes/           Express route definitions
    socket/           Real-time Socket.io handlers (messaging, presence)
    services/         OTP/SMS, external integrations
    db/               Prisma client
  prisma/schema.prisma  Database schema

mobile/
  src/
    screens/          Login, OTP, chat list, chat, contacts
    services/         REST API client, socket client
    context/          Auth state management
    navigation/        App navigation flow
```
