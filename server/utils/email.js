const nodemailer = require('nodemailer');

// Global mock account so we don't spam create accounts per request
let testAccount = null;

/**
 * Creates and returns a NodeMailer transporter
 */
async function getTransporter() {
  // If user provided a real SMTP in .env
  if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback to Nodemailer's Ethereal (Fake Inbox for developers)
  if (!testAccount) {
    console.log('No SMTP config found in .env. Falling back to Ethereal Mail for testing.');
    testAccount = await nodemailer.createTestAccount();
  }

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, 
    auth: {
      user: testAccount.user, 
      pass: testAccount.pass, 
    },
  });
}

/**
 * Sends an email notification to a developer
 */
async function sendNotificationEmail({ toEmail, toName, subject, htmlContent }) {
  try {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: '"TeamPulse Assistant" <notifications@teampulse.dev>',
      to: toEmail,
      subject: subject,
      html: htmlContent,
    });

    console.log(`\n📧 Email sent successfully to ${toEmail}`);
    
    // If using Ethereal, print the link so the developer can see the fake email!
    if (info.messageId && nodemailer.getTestMessageUrl(info)) {
      console.log('👀 VIEW EMAIL PREVIEW: %s\n', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Email Dispatch Error:', error);
    return false;
  }
}

/**
 * Pre-configured template for Task Escalation/Assignments
 */
const sendTaskNotification = async (developer, task, actionType) => {
  if (!developer || !developer.email) return;

  const isCritical = task.priority === 'High' || task.priority === 'Critical';
  const color = isCritical ? '#ef4444' : '#6366f1';
  
  const subject = isCritical 
    ? `🚨 URGENT: High Priority Task Assigned to you - ${task.title}`
    : `📋 New Task Assignment: ${task.title}`;

  const html = `
    <div style="font-family: 'Inter', Helvetica, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${color}; padding: 24px; text-align: center;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px;">TeamPulse Alert</h2>
      </div>
      <div style="padding: 32px;">
        <h3 style="color: #0f172a; margin-top: 0; font-size: 18px;">Hello, ${developer.name}</h3>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          You have been ${actionType === 'new' ? 'assigned a new task' : 'updated on a task'}
          in the sprint tracking system.
        </p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-left: 4px solid ${color}; margin: 24px 0; border-radius: 4px;">
          <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px;">${task.title}</h4>
          <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px;">Estimate: ${task.estimateHours} hrs | Story Points: ${task.storyPoints}</p>
          <span style="background-color: ${color}20; color: ${color}; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold;">
            ${task.priority.toUpperCase()} PRIORITY
          </span>
        </div>

        ${isCritical ? `
        <p style="color: #b91c1c; font-size: 14px; font-weight: bold; background: #fef2f2; padding: 12px; border-radius: 6px;">
          ⚠️ This task has been escalated to Critical Priority. Immediate attention is requested by the management team.
        </p>
        ` : ''}

        <p style="color: #475569; font-size: 14px;">
          Please log into the TeamPulse Dashboard to review the full acceptance criteria and move it to "In Progress".
        </p>
        
        <div style="text-align: center; margin-top: 32px;">
          <a href="http://localhost:5173/tasks" style="background-color: ${color}; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">View Task in TeamPulse</a>
        </div>
      </div>
      <div style="background-color: #f8fafc; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0;">
        You're receiving this because you are an active developer on the TeamPulse platform.
      </div>
    </div>
  `;

  await sendNotificationEmail({
    toEmail: developer.email,
    toName: developer.name,
    subject,
    htmlContent: html,
  });
};

module.exports = {
  sendNotificationEmail,
  sendTaskNotification
};
