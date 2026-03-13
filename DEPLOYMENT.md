# Production connectivity (Vercel + Railway)

Use these values so the Teacher Dashboard, Student App, and hardware script all talk to the same backend.

---

## 1. Vercel (Teacher Dashboard and Student Dashboard)

Set **Environment Variables** in the Vercel dashboard for **each** project (teacher and student).

| Variable | Value | Notes |
|----------|--------|--------|
| `NEXT_PUBLIC_API_URL` | `https://piano-tracker-api-production-d7b7.up.railway.app` | **No trailing slash.** Replace with your actual Railway URL if different. |

- **Teacher Dashboard** (e.g. keysight-teacher): add `NEXT_PUBLIC_API_URL` for **Production** (and Preview if you want).
- **Student Dashboard** (e.g. keysight-student): same variable for **Production** (and Preview).

If this is missing or wrong (e.g. still `http://localhost:8000`), the browser will call the wrong host and sessions will not appear / Start Practicing will not register with the production backend.

---

## 2. Railway (Backend)

- Ensure the backend is deployed and the public URL is the one you use (e.g. `https://piano-tracker-api-production-d7b7.up.railway.app`).
- **CORS**: `main.py` already allows `https://keysight-teacher.vercel.app` and `https://keysight-student.vercel.app`. If you use different Vercel URLs, add them to `allow_origins` in `backend/main.py`.
- **Active sessions** are stored **in memory**. A restart or multiple instances will clear or split state. For production, use a **single instance** if you rely on “active session” for the hardware script, or plan to move active sessions to Redis/DB later.

---

## 3. Hardware script (`midi_listener.py`)

Run with the **production API URL** so it hits the same backend as the apps:

```bash
export API_URL=https://piano-tracker-api-production-d7b7.up.railway.app
export DEVICE_ID=keysight-pi
# optional: STUDENT_ID=2
python3 midi_listener.py
```

Or in a `.env` or systemd unit:

- `API_URL=https://piano-tracker-api-production-d7b7.up.railway.app`
- `DEVICE_ID=keysight-pi`

If `API_URL` is unset, the script defaults to `http://localhost:8000` and will not see sessions from the production backend.

---

## 4. Why `/sessions/active/keysight-pi` can return 404 in production

1. **Frontend env**: Teacher/Student on Vercel must have `NEXT_PUBLIC_API_URL` set to the Railway URL. Otherwise the student’s “Start Practicing” POST goes to localhost and never touches Railway.
2. **Hardware URL**: `midi_listener.py` must use the same Railway URL via `API_URL`. Otherwise the script is asking a different server (or localhost) for the active session.
3. **Backend memory**: Active sessions live in memory. Railway restarts or multiple replicas clear or split that state, so the session may be set on one process and read on another (or lost). Use one instance until you persist active sessions.
4. **Order of operations**: Student clicks “Start Practicing” → POST to Railway creates active session for `keysight-pi`. Hardware script polls GET `/sessions/active/keysight-pi` on Railway. If 1–3 are correct, the 404 should stop once the student has started and the script is using the production URL.

---

## Quick checklist

- [ ] **Vercel (Teacher)**: `NEXT_PUBLIC_API_URL` = Railway URL (Production)
- [ ] **Vercel (Student)**: `NEXT_PUBLIC_API_URL` = Railway URL (Production)
- [ ] **Railway**: App running; CORS includes your Vercel domains
- [ ] **Hardware**: `API_URL` = same Railway URL when running `midi_listener.py`
- [ ] **Student**: Click “Start Practicing” on the **deployed** student app (not localhost) so the production backend gets the active session
