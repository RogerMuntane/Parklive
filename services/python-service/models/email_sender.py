import os
import smtplib
from email.message import EmailMessage


class EmailSender:
    """Envia emails utilitzant credencials SMTP de l'entorn."""

    def __init__(self, host: str | None = None, port: int | None = None):
        self.host = host or os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.port = port or int(os.getenv("SMTP_PORT", 587))
        self.smtp_user = os.getenv("smtp_mail")
        self.smtp_password = os.getenv("smtp_pasword")

        if not self.smtp_user or not self.smtp_password:
            raise RuntimeError(
                "Falten credencials SMTP (smtp_mail / smtp_pasword)")

    def send_reset_code(self, to_email: str, code: str, ttl_minutes: int) -> None:
        message = EmailMessage()
        message["Subject"] = "Codi de verificacio per canvi de contrasenya"
        message["From"] = self.smtp_user
        message["To"] = to_email
        message.set_content(
            f"Hola,\n\nEl teu codi de verificacio es: {code}\n"
            f"Aquest codi caduca en {ttl_minutes} minuts.\n\nEquip Parklive"
        )

        with smtplib.SMTP(self.host, self.port) as server:
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            server.send_message(message)
