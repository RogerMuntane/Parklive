import smtplib
import random
import string
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional


class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', 587))
        self.smtp_username = os.getenv('SMTP_USERNAME', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.from_email = os.getenv('SMTP_FROM_EMAIL', self.smtp_username)

        # Emmagatzematge temporal dels codis (en producció, usar Redis o BD)
        self.verification_codes = {}

    def generate_verification_code(self, length: int = 6) -> str:
        """Genera un codi de verificació aleatori de només números"""
        return ''.join(random.choices(string.digits, k=length))

    def store_verification_code(self, email: str, code: str, expiration_minutes: int = 15):
        """Emmagatzema el codi de verificació amb temps d'expiració"""
        expiration_time = datetime.now() + timedelta(minutes=expiration_minutes)
        self.verification_codes[email] = {
            'code': code,
            'expiration': expiration_time
        }

    def verify_code(self, email: str, code: str) -> bool:
        """Verifica si el codi és vàlid i no ha expirat"""
        if email not in self.verification_codes:
            return False

        stored_data = self.verification_codes[email]

        # Comprovar si el codi ha expirat
        if datetime.now() > stored_data['expiration']:
            del self.verification_codes[email]
            return False

        # Comprovar si el codi coincideix
        if stored_data['code'] == code:
            # Eliminar el codi després de la verificació exitosa
            del self.verification_codes[email]
            return True

        return False

    def send_verification_email(self, to_email: str, code: str) -> bool:
        """Envia un email amb el codi de verificació"""
        try:
            # Crear missatge
            message = MIMEMultipart('alternative')
            message['Subject'] = 'Parklive - Codi de verificació'
            message['From'] = self.from_email
            message['To'] = to_email

            # Crear contingut HTML
            html_content = f"""
            <!DOCTYPE html>
            <html lang="ca">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px;">
                    <h1 style="color: #333; text-align: center;">Parklive</h1>
                    <h2 style="color: #555; text-align: center;">Canvi de contrasenya</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                        Has sol·licitat canviar la teva contrasenya. Si no has estat tu, ignora aquest missatge.
                    </p>
                    <div style="background-color: #f0f0f0; padding: 20px; border-radius: 4px; text-align: center; margin: 30px 0;">
                        <p style="color: #666; font-size: 14px; margin-bottom: 10px;">El teu codi de verificació és:</p>
                        <h1 style="color: #007bff; font-size: 36px; letter-spacing: 5px; margin: 10px 0;">
                            {code}
                        </h1>
                    </div>
                    <p style="color: #666; font-size: 14px; line-height: 1.6;">
                        Aquest codi expirarà en 15 minuts.
                    </p>
                    <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
                        Si no has sol·licitat aquest canvi, ignora aquest email.
                    </p>
                </div>
            </body>
            </html>
            """

            # Contingut en text pla com a alternativa
            text_content = f"""
            Parklive - Canvi de contrasenya
            
            Has sol·licitat canviar la teva contrasenya.
            
            El teu codi de verificació és: {code}
            
            Aquest codi expirarà en 15 minuts.
            
            Si no has sol·licitat aquest canvi, ignora aquest email.
            """

            # Afegir ambdues parts al missatge
            part1 = MIMEText(text_content, 'plain')
            part2 = MIMEText(html_content, 'html')
            message.attach(part1)
            message.attach(part2)

            # Enviar email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(message)

            return True
        except Exception as e:
            print(f"Error en enviar l'email: {e}")
            return False

    def send_password_reset_code(self, email: str) -> tuple[bool, Optional[str], Optional[str]]:
        """
        Genera un codi, l'emmagatzema i l'envia per email
        Retorna: (èxit, codi, missatge_error)
        """
        try:
            # Generar codi
            code = self.generate_verification_code()

            # Emmagatzemar codi
            self.store_verification_code(email, code)

            # Enviar email
            if self.send_verification_email(email, code):
                return True, code, None
            else:
                return False, None, "Error en enviar l'email"
        except Exception as e:
            return False, None, str(e)


# Instància global del servei d'email
email_service = EmailService()
