from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.db.models import Count
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(name='notifications.send_weekly_digest', bind=True, max_retries=2)
def send_weekly_digest(self):
    """
    Send a weekly digest email to all active users.
    Summarises: top community threads, new tools tip, site stats.
    Runs every Sunday at 09:00 UTC via Celery Beat.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()

    one_week_ago = timezone.now() - timedelta(days=7)

    # Top threads from the last week
    import html
    try:
        from apps.community.models import Thread
        top_threads = Thread.objects.filter(
            created_at__gte=one_week_ago, is_active=True
        ).order_by('-vote_count', '-reply_count')[:5]
        threads_html = ''.join(
            f'<li><a href="https://expectexception.com/community/thread/{t.slug}" style="color:#3dfc55">{html.escape(t.title)}</a> '
            f'— {t.reply_count} replies</li>'
            for t in top_threads
        )
    except Exception:
        threads_html = '<li>Check the community for the latest threads.</li>'

    # Recipient list: active users with email
    recipients = list(
        User.objects.filter(is_active=True, email__isnull=False)
        .exclude(email='')
        .values_list('email', flat=True)[:500]  # hard cap
    )

    if not recipients:
        logger.info('Weekly digest: no recipients found.')
        return {'sent': 0}

    html_body = f"""
    <html>
    <body style="font-family: 'Outfit', Arial, sans-serif; background:#050505; color:#f1f5f9; margin:0; padding:0;">
      <div style="max-width:600px; margin:0 auto; padding:32px 24px;">
        <h1 style="color:#3dfc55; font-size:1.8rem; margin-bottom:4px;">ExpectException</h1>
        <p style="color:#94a3b8; margin-top:0;">Weekly Digest</p>
        <hr style="border:none; border-top:1px solid #1e293b; margin:24px 0;" />

        <h2 style="font-size:1.1rem; color:#f1f5f9;">🔥 Top Community Threads This Week</h2>
        <ul style="padding-left:20px; color:#cbd5e1; line-height:2;">
          {threads_html}
        </ul>

        <hr style="border:none; border-top:1px solid #1e293b; margin:24px 0;" />

        <h2 style="font-size:1.1rem; color:#f1f5f9;">🛠️ Try Our Latest Tools</h2>
        <p style="color:#94a3b8;">
          We've added new developer tools:
          <a href="https://expectexception.com/services/css-box-shadow" style="color:#3dfc55">CSS Box Shadow Generator</a>,
          <a href="https://expectexception.com/services/json-to-typescript" style="color:#3dfc55">JSON→TypeScript</a>,
          <a href="https://expectexception.com/services/favicon-generator" style="color:#3dfc55">Favicon Generator</a> and
          <a href="https://expectexception.com/services/http-status-codes" style="color:#3dfc55">HTTP Status Code Reference</a>.
        </p>

        <div style="margin:32px 0; text-align:center;">
          <a href="https://expectexception.com" style="background:#3dfc55; color:#000; font-weight:700; padding:12px 32px; border-radius:8px; text-decoration:none; font-size:1rem;">
            Visit ExpectException →
          </a>
        </div>

        <hr style="border:none; border-top:1px solid #1e293b; margin:24px 0;" />
        <p style="color:#475569; font-size:0.75rem; text-align:center;">
          You're receiving this because you have an account at expectexception.com.<br/>
          <a href="https://expectexception.com/profile" style="color:#64748b">Manage email preferences</a>
        </p>
      </div>
    </body>
    </html>
    """

    from django.core.mail import get_connection, EmailMultiAlternatives
    sent_count = 0
    try:
        connection = get_connection()
        messages = []
        for email in recipients:
            msg = EmailMultiAlternatives(
                subject='📬 Your weekly digest from ExpectException',
                body='Check the latest community threads and new tools at https://expectexception.com',
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email],
                connection=connection
            )
            msg.attach_alternative(html_body, "text/html")
            messages.append(msg)
        
        sent_count = connection.send_messages(messages)
    except Exception as exc:
        logger.error(f'Weekly digest sending failed: {exc}')

    logger.info(f'Weekly digest sent to {sent_count} users.')
    return {'sent': sent_count}
