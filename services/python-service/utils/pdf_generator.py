"""
Generador de tiquets PDF per a reserves de ParkLive.

Aquest mòdul utilitza la llibreria ReportLab per construir un document PDF
amb el disseny corporatiu de ParkLive. El tiquet inclou:
  - Informació de l'aparcament (nom, adreça, ciutat).
  - Dates i hores d'entrada i sortida.
  - Codi de reserva i matrícula del vehicle.
  - Preu total pagat.
  - Codi QR generat dinàmicament via API externa (qrserver.com).

Funció principal:
    generar_tiquet_pdf_python(reserva, storage_path=None) -> str

Dependencies:
    - reportlab  : Generació del PDF.
    - urllib     : Descàrrega del QR des de l'API pública.

Variables d'entorn:
    TICKET_STORAGE_PATH : Directori on s'emmagatzemen els tiquets PDF.
                          Valor per defecte: /app/storage/tickets
"""

import logging
import os
from datetime import datetime
from urllib.error import URLError
from urllib.request import Request, urlopen

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Funcions auxiliars
# ---------------------------------------------------------------------------

def format_datetime(dt_str: str) -> tuple[str, str]:
    """
    Converteix un string ISO 8601 en una tupla de data i hora formatades.

    Suporta formats com ``2026-04-15T10:00:00`` i ``2026-04-15T10:00:00Z``.
    En cas d'error de parsejat, retorna el valor original i una cadena buida.

    Args:
        dt_str (str): Data/hora en format ISO 8601 o ``None``/cadena buida.

    Returns:
        tuple[str, str]: Parella ``(data, hora)`` en format ``DD/MM/YYYY`` i ``HH:MM``.
                         Retorna ``("--/--/----", "--:--)`` si l'entrada és invàlida.
    """
    if not dt_str:
        return "--/--/----", "--:--"
    try:
        d = datetime.fromisoformat(dt_str.replace('Z', ''))
        return d.strftime("%d/%m/%Y"), d.strftime("%H:%M")
    except Exception:
        return dt_str, ""


def _parse_matricula(notes: str | None) -> str:
    """
    Extreu la matrícula del vehicle des del camp ``notes`` d'una reserva.

    El camp ``notes`` pot contenir el text ``"Matrícula: ABC1234"``.
    Si no es troba o el format és incorrecte, retorna ``"NO DISPONIBLE"``.

    Args:
        notes (str | None): Text de notes de la reserva.

    Returns:
        str: Matrícula extraïda o ``"NO DISPONIBLE"``.
    """
    if notes and "Matrícula:" in notes:
        try:
            return notes.split("Matrícula:")[1].strip()
        except (IndexError, AttributeError):
            pass
    return "NO DISPONIBLE"


# ---------------------------------------------------------------------------
# Generador principal
# ---------------------------------------------------------------------------

def generar_tiquet_pdf_python(reserva: dict, storage_path: str | None = None) -> str:
    """
    Genera un tiquet PDF per a una reserva confirmada de ParkLive.

    Construeix un document d'una pàgina en format A4 amb el disseny
    corporatiu de ParkLive: capçalera de confirmació, detalls de
    l'aparcament, dates d'entrada/sortida, resum econòmic i codi QR.

    El PDF es dà un nom único basat en el ``codi_reserva`` i es desa
    al directori indicat per la variable d'entorn ``TICKET_STORAGE_PATH``
    (o al valor de ``storage_path`` si es proporciona explícitament).

    Args:
        reserva (dict): Diccionari amb les dades de la reserva. Camps esperats:
            - ``codi_reserva`` (str)  : Identificador único de la reserva.
            - ``data_entrada`` (str)  : Data/hora d'entrada en ISO 8601.
            - ``data_sortida`` (str)  : Data/hora de sortida en ISO 8601.
            - ``preu_total`` (float)  : Preu total pagat en euros.
            - ``notes`` (str)         : Notes opcionals, pot incloure la matrícula.
            - ``aparcament`` (dict)   : Sub-diccionari amb ``nom``, ``adreca`` i ``ciutat``.
        storage_path (str | None): Directori de destí del PDF. Si és ``None``,
            s'utilitza la variable d'entorn ``TICKET_STORAGE_PATH`` o el
            valor per defecte ``/app/storage/tickets``.

    Returns:
        str: Ruta absoluta del fitxer PDF generat.

    Raises:
        OSError: Si no es pot crear el directori de destí o escriure el fitxer.

    Notes:
        - El codi QR es baixa des de ``https://api.qrserver.com``; si la
          xarxa no està disponible, es mostra un missatge d'error al PDF.
        - La funció utilitza coordenades absolutes (pt) per posicionar
          cada element en el canvas de ReportLab.
    """
    if storage_path is None:
        storage_path = os.getenv("TICKET_STORAGE_PATH", "/app/storage/tickets")
    os.makedirs(storage_path, exist_ok=True)
    filename = f"tiquet_{reserva['codi_reserva']}.pdf"
    filepath = os.path.join(storage_path, filename)

    c = canvas.Canvas(filepath, pagesize=A4)
    width, height = A4

    # Colors corporatius suposats (fosc per text, gris per secundari)
    primary_text = HexColor("#1a1a2e")
    secondary_text = HexColor("#6c757d")
    danger_text = HexColor("#dc3545")
    success_color = HexColor("#198754")
    border_color = HexColor("#dee2e6")

    # Offset al centre de la pàgina
    center_x = width / 2
    
    # Caixa principal - Tiquet
    margin_x = 50
    margin_y = 50
    box_width = width - (margin_x * 2)
    box_height = height - (margin_y * 2)
    
    c.setStrokeColor(border_color)
    c.setLineWidth(1)
    # Dibuixar la vora exterior amb un petit radi
    c.roundRect(margin_x, margin_y, box_width, box_height, 15, stroke=1, fill=0)

    # --- Header (Reserva confirmada) ---
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(primary_text)
    c.drawCentredString(center_x, height - 120, "Reserva Confirmada!")

    c.setFont("Helvetica", 11)
    c.setFillColor(secondary_text)
    c.drawCentredString(center_x, height - 145, "Pagament realitzat amb èxit a través de Stripe")

    # --- Detalls Aparcament ---
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(center_x, height - 210, "APARCAMENT")
    
    aparcament = reserva.get('aparcament', {})
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(primary_text)
    c.drawCentredString(center_x, height - 235, aparcament.get('nom', 'Aparcament Desconegut'))

    c.setFont("Helvetica", 11)
    c.setFillColor(secondary_text)
    adreca = f"{aparcament.get('adreca', '')}, {aparcament.get('ciutat', '')}".strip(', ')
    c.drawCentredString(center_x, height - 255, adreca)

    # --- Entrada i Sortida ---
    ent_data, ent_hora = format_datetime(reserva.get('data_entrada'))
    sor_data, sor_hora = format_datetime(reserva.get('data_sortida'))

    # Línia divisòria al mig
    c.setStrokeColor(border_color)
    c.line(center_x, height - 290, center_x, height - 370)

    # Entrada
    col_left_x = center_x - 120
    c.setFont("Helvetica", 10)
    c.setFillColor(secondary_text)
    c.drawString(margin_x + 50, height - 310, "ENTRADA")
    
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(primary_text)
    c.drawString(margin_x + 50, height - 335, ent_hora)
    
    c.setFont("Helvetica", 11)
    c.drawString(margin_x + 50, height - 355, ent_data)

    # Sortida
    c.setFont("Helvetica", 10)
    c.setFillColor(secondary_text)
    c.drawString(center_x + 20, height - 310, "SORTIDA")
    
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(primary_text)
    c.drawString(center_x + 20, height - 335, sor_hora)
    
    c.setFont("Helvetica", 11)
    c.drawString(center_x + 20, height - 355, sor_data)

    # --- Dades econòmiques i codi ---
    y_pos = height - 410
    c.setFont("Helvetica", 12)
    c.setFillColor(secondary_text)
    c.drawString(margin_x + 50, y_pos, "Codi de Reserva:")
    
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(primary_text)
    c.drawRightString(width - margin_x - 50, y_pos, f"#{reserva.get('codi_reserva', '')}")

    # Matrícula
    y_pos -= 30
    c.setFont("Helvetica", 12)
    c.setFillColor(secondary_text)
    c.drawString(margin_x + 50, y_pos, "Matrícula:")
    
    matricula = _parse_matricula(reserva.get('notes', ''))

    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(primary_text)
    c.drawRightString(width - margin_x - 50, y_pos, matricula)

    # Preu Total
    y_pos -= 30
    c.setFont("Helvetica", 12)
    c.setFillColor(secondary_text)
    c.drawString(margin_x + 50, y_pos, "Total Pagat:")
    
    preu = reserva.get('preu_total', 0)
    preu_str = f"{float(preu):.2f}".replace('.', ',') + " €"
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(danger_text)
    c.drawRightString(width - margin_x - 50, y_pos, preu_str)

    # --- Línia de punts de tall ---
    dash_y = height - 540
    c.setStrokeColor(primary_text)
    c.setDash(4, 4) # Patró de línia puntejada
    c.line(margin_x + 20, dash_y, width - margin_x - 20, dash_y)
    c.setDash() # Reset

    # --- QR i Footer ---
    c.setFont("Helvetica", 10)
    c.setFillColor(secondary_text)
    c.drawCentredString(center_x, dash_y - 30, "Mostra aquest codi a l'entrada de l'aparcament.")

    # QR Code des de l'API
    qr_y = dash_y - 200
    qr_size = 150
    qr_data = reserva.get('codi_reserva', 'UNKNOWN')
    qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size={qr_size}x{qr_size}&data={qr_data}"
    
    try:
        req = Request(qr_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urlopen(req, timeout=10) as qr_response:
            c.drawImage(
                ImageReader(qr_response),
                center_x - (qr_size / 2),
                qr_y,
                width=qr_size,
                height=qr_size,
            )
    except Exception as e:
        logger.warning("[PDF] No s'ha pogut baixar el QR per a '%s': %s", qr_data, e)
        c.setFont("Helvetica", 10)
        c.setFillColor(danger_text)
        c.drawCentredString(center_x, qr_y + (qr_size / 2), "[QR no disponible]")
        c.setFont("Helvetica", 9)
        c.setFillColor(secondary_text)
        c.drawCentredString(center_x, qr_y + (qr_size / 2) - 16, str(qr_data))

    # Footer final
    c.setFont("Helvetica", 9)
    c.setFillColor(secondary_text)
    c.drawCentredString(center_x, qr_y - 30, "ParkLive Web App © 2026")

    # Finalitzar la pàgina i guardar
    c.showPage()
    c.save()

    return filepath
