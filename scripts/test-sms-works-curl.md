# Test SMS Works token with cURL

Run this **on your computer** (PowerShell or Command Prompt) to check if your SMS Works token works outside the app.

**Replace `YOUR_JWT_TOKEN` with your actual token from SMS Works (the long eyJ... string).**

## Option 1: Bearer token (most common)

```bash
curl -X POST "https://api.thesmsworks.co.uk/v1/message/send" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_JWT_TOKEN" ^
  -d "{\"sender\":\"BeBeautyBar\",\"destination\":\"447857772232\",\"content\":\"Test from cURL\"}"
```

## Option 2: Raw token (no prefix)

```bash
curl -X POST "https://api.thesmsworks.co.uk/v1/message/send" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: YOUR_JWT_TOKEN" ^
  -d "{\"sender\":\"BeBeautyBar\",\"destination\":\"447857772232\",\"content\":\"Test from cURL\"}"
```

## Option 3: JWT prefix

```bash
curl -X POST "https://api.thesmsworks.co.uk/v1/message/send" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: JWT YOUR_JWT_TOKEN" ^
  -d "{\"sender\":\"BeBeautyBar\",\"destination\":\"447857772232\",\"content\":\"Test from cURL\"}"
```

---

**What to look for:**
- **Success:** HTTP 201 and a JSON response with `messageid`, `status: "SENT"`
- **Unauthorized:** HTTP 401 – token is invalid, expired, or wrong format
- **402:** Insufficient credits – top up at thesmsworks.co.uk

**Important:** If you generated a **new Key & Secret** in SMS Works, that **invalidates all previous tokens**. You must generate a fresh token (API Key tab → Generate Token) and use that.

---

**If cURL works but the app still fails:** Try setting `SMS_WORKS_AUTH_STYLE` in Vercel to the format that worked:
- `raw` – if Option 2 worked
- `jwt` – if Option 3 worked  
(Default is Bearer, used if unset.)
