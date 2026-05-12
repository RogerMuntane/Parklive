"""
Servei d'enviament de correus electrònics transaccionals.

Proporciona la classe `EmailSender` per enviar missatges SMTP amb suport
per a contingut HTML i text pla. Utilitzat principalment per a l'enviament
de codis de recuperació de contrasenya.

Les credencials i configuració del servidor SMTP es llegeixen exclusivament
de les variables d'entorn (SMTP_HOST, SMTP_PORT, smtp_mail, smtp_pasword).
"""

import os
import smtplib
from email.message import EmailMessage


class EmailSender:
    """
    Client SMTP per a l'enviament de correus electrònics des del servei Python.

    Llegeix la configuració del servidor i les credencials des de les variables
    d'entorn. Llança un RuntimeError en cas que les credencials no estiguin definides.

    Raises:
        RuntimeError: Si smtp_mail o smtp_pasword no estan configurats.
    """

    def __init__(self, host: str | None = None, port: int | None = None):
        """
        Inicialitza el client SMTP amb la configuració de l'entorn.

        Args:
            host (str|None): Servidor SMTP. Per defecte 'smtp.gmail.com'.
            port (int|None): Port SMTP. Per defecte 587 (STARTTLS).
        """
        self.host = host or os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.port = port or int(os.getenv("SMTP_PORT", 587))
        self.smtp_user = os.getenv("smtp_mail")
        self.smtp_password = os.getenv("smtp_pasword")

        if not self.smtp_user or not self.smtp_password:
            raise RuntimeError(
                "Falten credencials SMTP (smtp_mail / smtp_pasword)")

    def send_reset_code(self, to_email: str, code: str, ttl_minutes: int) -> None:
        """
        Envia un correu HTML amb el codi de recuperació de contrasenya.

        El missatge inclou un cos HTML amb estils visuals i un text pla alternatiu
        per a clients que no suporten HTML (RFC 2046 multipart/alternative).

        Args:
            to_email (str): Adreça de destí del correu.
            code (str): Codi de verificació numèric a enviar.
            ttl_minutes (int): Minuts de validesa del codi.

        Raises:
            smtplib.SMTPException: Si hi ha un error en la connexió o l'autenticació SMTP.
        """
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
