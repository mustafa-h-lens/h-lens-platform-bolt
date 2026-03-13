# SMTP OTP Email Integration - Setup Guide

## ✅ What Was Implemented

Your existing OTP system now has **production-ready SMTP email delivery** using Brevo (formerly Sendinblue). The implementation:

- ✅ Integrated nodemailer for SMTP email sending
- ✅ Replaced console.log placeholder with real email delivery
- ✅ Preserved all existing OTP logic (generation, validation, expiration)
- ✅ Kept all security features intact (rate limiting, attempt tracking)
- ✅ Maintained the beautiful Arabic RTL HTML email template
- ✅ Removed development mode OTP exposure for production security
- ✅ Added proper error handling for email delivery failures
- ✅ Edge Function successfully deployed to Supabase

---

## 🔐 Required Secrets Configuration

You need to add these **6 secrets** to your Supabase Edge Functions environment:

### Secret Names and Values

| Secret Name | Value |
|------------|-------|
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `898d68001@smtp-brevo.com` |
| `SMTP_PASSWORD` | `xsmtpsib-c905cafdc9e50b60e02843f4ce2d4ef6199519aad9881dee1882433ad55ceb25-gT1Ew32Vz8psL4T9` |
| `SMTP_FROM_EMAIL` | `platform@h-lens.co` |
| `SMTP_FROM_NAME` | `Half Lens` |

### Important Notes About Secret Format

- Enter each value as **plain text** without quotes
- ✅ Correct: `smtp-relay.brevo.com`
- ❌ Incorrect: `"smtp-relay.brevo.com"` or `'smtp-relay.brevo.com'`

---

## 📋 Setup Steps

### Step 1: Add Secrets to Supabase

You need to configure the SMTP secrets in your Supabase project. Since I don't have direct access to add secrets, you'll need to do this through the Supabase CLI or Dashboard.

**Option A: Using Supabase CLI** (Recommended)

```bash
supabase secrets set SMTP_HOST=smtp-relay.brevo.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=898d68001@smtp-brevo.com
supabase secrets set SMTP_PASSWORD=xsmtpsib-c905cafdc9e50b60e02843f4ce2d4ef6199519aad9881dee1882433ad55ceb25-gT1Ew32Vz8psL4T9
supabase secrets set SMTP_FROM_EMAIL=platform@h-lens.co
supabase secrets set SMTP_FROM_NAME="Half Lens"
```

**Option B: Using Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** → **Settings** (or **Secrets**)
3. Add each secret one by one using the table above
4. Save changes

### Step 2: Verify Secrets Are Loaded

After adding the secrets, the Edge Function should automatically pick them up. If needed, you can restart the function to ensure secrets are loaded.

### Step 3: Test Email Delivery

Use your vendor login flow to test OTP email delivery with a real email address.

---

## ✅ Testing Checklist

### Pre-Deployment Tests
- [x] Edge Function code updated with SMTP integration
- [x] Edge Function deployed to Supabase
- [ ] All 6 SMTP secrets added to Supabase
- [ ] Secrets verified in Supabase dashboard

### Post-Deployment Email Delivery Tests
- [ ] Send OTP to a valid vendor email address
- [ ] Verify email arrives within 30 seconds
- [ ] Confirm email sender shows as "Half Lens <platform@h-lens.co>"
- [ ] Check subject line: "رمز التحقق - Half Lens"
- [ ] Verify OTP code displays correctly in 4 blue boxes
- [ ] Confirm Arabic RTL text displays properly
- [ ] Check all email sections render correctly:
  - [ ] Header with Half Lens logo
  - [ ] Greeting and message text
  - [ ] OTP boxes with 4 digits
  - [ ] Expiry notice (10 minutes)
  - [ ] Request details (time, email, device)
  - [ ] Warning box
  - [ ] Login button
  - [ ] Footer with links and copyright

### Functional Tests
- [ ] Test rate limiting: Send OTP twice within 60 seconds (should block second request)
- [ ] Test with invalid email format (should reject)
- [ ] Test with non-existent vendor email (should reject)
- [ ] Verify OTP expires after 10 minutes
- [ ] Test OTP verification flow end-to-end
- [ ] Check device info appears correctly in email

### Email Client Compatibility Tests
- [ ] Gmail desktop (web)
- [ ] Gmail mobile app
- [ ] Outlook desktop
- [ ] Outlook mobile app
- [ ] Apple Mail (iOS)
- [ ] Other email clients as needed

### Security Tests
- [ ] Verify OTP is NOT exposed in API response
- [ ] Confirm rate limiting works (60-second cooldown)
- [ ] Test that expired OTPs cannot be used
- [ ] Verify failed attempts are tracked
- [ ] Check IP address logging works

---

## 🔍 How It Works

### Email Flow

1. **Vendor requests OTP** → Frontend calls `send-otp-email` Edge Function
2. **Email validation** → Function checks email format and vendor existence
3. **Rate limiting** → Prevents spam (max 1 OTP per 60 seconds)
4. **OTP generation** → Creates random 4-digit code
5. **Database storage** → Saves OTP with 10-minute expiration
6. **SMTP connection** → Connects to Brevo SMTP server on port 587
7. **Email sending** → Sends beautiful Arabic HTML email
8. **Response** → Returns success message (OTP NOT exposed)

### Security Features (Already in Place)

- ✅ Rate limiting: 60-second cooldown between OTP requests
- ✅ Expiration: OTPs expire after 10 minutes
- ✅ Attempt tracking: Failed verification attempts are logged
- ✅ IP logging: Request IP addresses are stored
- ✅ Device info: User device information is tracked
- ✅ Secure transmission: STARTTLS encryption for SMTP

---

## 🐛 Troubleshooting

### Issue: "إعدادات البريد الإلكتروني غير مكتملة"

**Cause:** One or more SMTP secrets are missing.

**Solution:**
1. Verify all 6 secrets are added to Supabase
2. Check secret names match exactly (case-sensitive)
3. Restart Edge Function if needed

### Issue: "حدث خطأ أثناء إرسال البريد الإلكتروني"

**Cause:** Email delivery failed (SMTP error).

**Possible reasons:**
- Invalid SMTP credentials
- Network connectivity issue
- Brevo account issue
- Invalid recipient email address

**Solution:**
1. Check Supabase Edge Function logs for detailed error
2. Verify SMTP credentials are correct
3. Test SMTP connection manually
4. Check Brevo account status and sending limits

### Issue: Email not arriving

**Possible reasons:**
- Email in spam folder
- Email blocked by recipient's server
- Delayed delivery (wait 2-3 minutes)

**Solution:**
1. Check spam/junk folder
2. Verify recipient email is valid
3. Check Supabase Edge Function logs for confirmation
4. Test with different email provider (Gmail, Outlook, etc.)

### Issue: Arabic text not displaying correctly

**Cause:** Email client doesn't support RTL properly.

**Solution:** The email template includes proper RTL directives. Try viewing in a different email client.

---

## 📊 Monitoring and Logs

### Check Email Delivery Status

View Edge Function logs in Supabase Dashboard:

1. Go to **Edge Functions** → **send-otp-email**
2. Click **Logs** tab
3. Look for messages like:
   - `OTP email sent successfully to {email}. Message ID: {id}`
   - Error messages if delivery failed

### What to Monitor

- Email delivery success rate
- SMTP connection errors
- Rate limiting triggers
- Invalid email attempts
- OTP expiration patterns

---

## 🎯 Next Steps

1. **Add the 6 SMTP secrets** to your Supabase project
2. **Test with a real email** to verify delivery works
3. **Check email rendering** in different email clients
4. **Monitor logs** for the first few days
5. **Set up alerts** for email delivery failures (optional)

---

## 📝 Notes

- The OTP is **never exposed** in API responses (removed development mode)
- All existing database logic remains unchanged
- Rate limiting and security features are fully intact
- The Arabic RTL email template is preserved exactly as designed
- SMTP uses STARTTLS on port 587 (secure but not SSL)
- Brevo has sending limits - monitor usage if you have high volume

---

## ✨ What Changed in the Code

### File: `supabase/functions/send-otp-email/index.ts`

**Changes made:**

1. **Added nodemailer import** (line 3)
   ```typescript
   import { createTransport } from "npm:nodemailer@6.9.8";
   ```

2. **Replaced TODO section** (lines 436-452)
   - Added SMTP configuration validation
   - Created nodemailer transport with Brevo settings
   - Implemented actual email sending with proper error handling
   - Removed development mode OTP exposure
   - Added success/failure logging

3. **What was NOT changed:**
   - OTP generation logic
   - Database operations
   - Rate limiting logic
   - Email template (Arabic RTL HTML)
   - Vendor validation
   - Error messages
   - CORS headers
   - All security features

---

**Status:** ✅ Edge Function deployed and ready. Add secrets to activate email delivery!
