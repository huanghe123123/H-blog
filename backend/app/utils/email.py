import logging
import smtplib
from email.mime.text import MIMEText

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def send_verification_email(email: str, token: str) -> None:
    settings = get_settings()
    verify_url = f"{settings.frontend_url}/verify-email?token={token}"

    body = f"""Welcome!

Please verify your email address by clicking the link below:

{verify_url}

If you did not create an account, please ignore this email.
"""

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = "Verify your email address"
    msg["From"] = settings.smtp_from_email
    msg["To"] = email

    try:
        if settings.smtp_port == 465:
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)
        with server:
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from_email, [email], msg.as_string())
    except Exception:
        logger.warning("Failed to send verification email via SMTP, printing to console instead.")
        print(f"\n{'='*60}")
        print(f"Verification email for {email}:")
        print(f"Click: {verify_url}")
        print(f"{'='*60}\n")
