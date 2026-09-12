# HR Inactive Auto-Reply Notification (EmailJS Template)

To setup the email auto-reply that is sent to HR, you need to create a new template inside your EmailJS dashboard and map the newly generated Template ID to the system.

## 1. Environment Variable Setup
When you create the template, EmailJS will give you a **Template ID** (e.g. `template_hr_validate_01`).
Update this ID in your `.env` or Netlify/Vercel settings:
```env
VITE_EMAILJS_HR_INACTIVE_TEMPLATE_ID=your_template_id_here
```

## 2. Template Configuration in EmailJS

Go to your EmailJS Dashboard -> **Email Templates** -> **Create New Template**.

### Template Setup:
- **To Email**: `{{to_email}}`
- **Reply To**: (Leave blank or system admin email)
- **Subject**: `[ACTION REQUIRED] Teller Status Validation: {{teller_name}} - {{teller_status}}`

### Email Content (Body):
```text
Hello HR Team,

This is an automated notification from the SGC UWC Centralized System.

A ticket return request has just been filed by {{submitted_by}} citing that the assigned teller is currently inactive.

Details:
- Teller / Outlet Name: {{teller_name}}
- Reported Status: {{teller_status}}
- Associated Transaction ID: {{transaction_id}}

This ticket is currently parked and pending for Unclaimed Specialist Approval. 

If this teller is NOT on {{teller_status}} status, please REPLY to this email immediately to dispute and counter this action so that the Unclaimed Specialist can reject the request. If no counter is received, the {{teller_status}} status will be assumed correct and the ticket will be processed for permanent deletion/deduction.

Thank you,
System Administrator
```

## 3. Save and Test
Once saved, anytime an SSR selects AWOL, Pull-Out, or Terminated and enters an HR email, EmailJS will automatically fire this sequence to "counter" or validate the status directly with HR.
