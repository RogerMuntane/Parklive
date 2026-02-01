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
        """Envia el codi de reset de contrasenya per email (format HTML)"""
        message = EmailMessage()
        message["Subject"] = "Codi de reset de contrasenya - Parklive"
        message["From"] = self.smtp_user
        message["To"] = to_email

        # Contingut HTML
        html_content = f"""
        <!DOCTYPE html>
        <html lang="ca">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; }}
                h1 {{ color: #333; text-align: center; }}
                h2 {{ color: #555; text-align: center; }}
                p {{ color: #666; font-size: 16px; line-height: 1.6; }}
                .code-box {{ background-color: #f0f0f0; padding: 20px; border-radius: 4px; text-align: center; margin: 30px 0; }}
                .code {{ color: #007bff; font-size: 36px; letter-spacing: 5px; margin: 10px 0; font-weight: bold; font-family: monospace; }}
                .footer {{ color: #999; font-size: 12px; margin-top: 30px; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Parklive</h1>
                <h2>Reset de contrasenya</h2>
                <p>Has sol·licitat canviar la teva contrasenya. Si no has estat tu, ignora aquest missatge.</p>
                
                <div class="code-box">
                    <p>El teu codi de verificació és:</p>
                    <div class="code">{code}</div>
                </div>
                
                <p>Aquest codi serà vàlid durant <strong>{ttl_minutes} minuts</strong>.</p>
                <p style="color: #d32f2f; margin-top: 20px;"><strong>Avís de seguretat:</strong> No comparteixis aquest codi amb ningú.</p>
                
                <div class="footer">
                    <p>Si no has sol·licitat aquest canvi, ignora aquest email.</p>
                    <p>&copy; 2026 Parklive. Tots els drets reservats.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Afegir text pla com a alternativa
        text_content = f"""
Parklive - Reset de contrasenya

Has sol·licitat canviar la teva contrasenya.

El teu codi de verificació és: {code}

Aquest codi serà vàlid durant {ttl_minutes} minuts.

AVÍS DE SEGURETAT: No comparteixis aquest codi amb ningú.

Si no has sol·licitat aquest canvi, ignora aquest email.

© 2026 Parklive. Tots els drets reservats.
        """

        message.set_content(text_content)
        message.add_alternative(html_content, subtype="html")

        with smtplib.SMTP(self.host, self.port) as server:
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            server.send_message(message)
