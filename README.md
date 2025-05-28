# 🧠 MantaHQ API Engine

> **Custom API logic, safely sandboxed.** Run user-defined validation logic with guaranteed isolation, shape checking, and response wrapping, all in one endpoint.

View Documentation at [Postman Documenter](https://documenter.getpostman.com/view/28783766/2sB2qdh136).

---

## 🚀 Quickstart

```bash
git clone https://github.com/alexindevs/mantahq_api_engine.git
cd mantahq_api_engine

# Install dependencies
npm install

# Start the dev server
npm run start:dev
```

Ensure your environment supports `isolated-vm`. If running into issues with snapshots:

```bash
export NODE_OPTIONS="--no-node-snapshot"
```

Or use the cross-platform version:

```bash
npm install --save-dev cross-env
```

Update your scripts:

```json
"start:dev": "cross-env NODE_OPTIONS=--no-node-snapshot nest start --watch"
```

---

## 📬 Example Requests

### 1. Register a Custom API Config

```bash
curl -X POST http://localhost:3000/config \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-api",
    "method": "POST",
    "body": { "email": "string", "username": "string" },
    "customValidation": "function customValidation(data) {\n  const email = data?.body?.email;\n  if (typeof email === \"string\" && email.includes(\"@\") && email.includes(\".\")) {\n    return {\n      isValid: true,\n      message: \"Valid email\"\n    };\n  } else {\n    return {\n      isValid: false,\n      message: \"Invalid email\"\n    };\n  }\n}"
  }'
```

### 2. Trigger the API Logic

```bash
curl -X POST http://localhost:3000/api/test-api \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "tester123"
  }'
```

Response:

```json
{
  "success": true,
  "processedMessage": "Valid email",
  "timestamp": "2025-05-27T10:00:00.000Z",
  "isValid": true,
  "message": "Valid email"
}
```

---

## ⚙️ Tech Decisions

### 🧩 `isolated-vm`

Used for safe, sandboxed execution. Guarantees that custom user code **cannot access Node internals** (no `require`, no `process`, no external I/O). Strict memory and timeout caps ensure stability.

### 🧱 Input Validation with `class-validator`

* Custom pipes auto-validate request structure against `body` fields declared in each config, using `class-validator` instead of Zod.
* Guards can be extended for token-based authentication if needed.

### 🔐 Schema Enforcement

* Sandbox return must include `{ isValid, message }`
* Any other result triggers a rejection
* Result is deep-copied and wrapped for traceable response handling
* Timeout and memory limits are enforced via `SANDBOX_TIMEOUT_MS` and `SANDBOX_MAX_MEMORY_MB` environment variables

---

## 🧠 Challenges Solved

1. **Sandbox Return Type Errors**
   `isolated-vm` rejects non-transferable objects. Solved by **wrapping all execution in a self-invoking function** that `JSON.stringify`s the result, and `JSON.parse`s on host side.

2. **Time-sensitive Failures**
   Added robust error logging and timeout-specific messages for debugging untrusted code.

3. **Preventing Access to Node.js APIs**
   Explicitly jailed global scope in `isolated-vm` and injected only sanitized data.

4. **Unclear Support for Next Function**
   It was unclear whether users should define their own `next` function in the config. To keep things safe and consistent, a predefined `predefinedNextActionFunction()` is hardcoded into the internal logic and called only after validation passes.

---

## ⚠️ Limitations & Future Plans

### Current Limitations

* Validation logic must be synchronous
* Max memory and timeout are fixed via `.env` vars
* `configs` are stored in-memory, not persisted across server restarts
* No input schema validation yet beyond `required body fields`

### Future Improvements

* Implement **disk-based or DB-backed config storage**
* Add **config versioning** and rollback
* Expose **dashboard UI** for testing, editing, and triggering API configs

---

## ✨ Final Notes

This was built as part of a backend engineering take-home assessment. It combines practical API security, runtime evaluation, and shape enforcement into one minimal NestJS project. All user code is boxed, traced, and wrapped.

> Created with TypeScript and NestJS for the MantaHQ backend assessment.
