import os
from datetime import datetime
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.lib.colors import HexColor
from urllib.request import urlopen, Request
from urllib.error import URLError

def format_datetime(dt_str):
    """Parses ISO datetime string and returns (date_str, time_str)"""
    if not dt_str:
        return "--/--/----", "--:--"
    try:
        # Assuming format like 2026-04-15T10:00:00
        d = datetime.fromisoformat(dt_str.replace('Z', ''))
        return d.strftime("%d/%m/%Y"), d.strftime("%H:%M")
    except Exception:
        return dt_str, ""

def generar_tiquet_pdf_python(reserva, storage_path="/app/storage/tickets"):
    """
    Genera un tiquet PDF usant ReportLab basat en el disseny del frontend.
    Es crida automàticament durant la confirmació de la reserva.
    """
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
    
    matricula = "NO DISPONIBLE"
    notes = reserva.get('notes', '')
    if notes and "Matrícula:" in notes:
        try:
            matricula = notes.split("Matrícula:")[1].strip()
        except:
            pass

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
        qr_image = urlopen(req)
        c.drawImage(ImageReader(qr_image), center_x - (qr_size/2), qr_y, width=qr_size, height=qr_size)
    except Exception as e:
        print(f"[PDF] No s'ha pogut baixar el QR: {e}")
        # Si falla el QR previ, dibuixa text d'error al lloc del QR
        c.setFont("Helvetica", 12)
        c.setFillColor(danger_text)
        c.drawCentredString(center_x, qr_y + (qr_size/2), "[Error de xarxa carregant QR]")

    # Footer final
    c.setFont("Helvetica", 9)
    c.setFillColor(secondary_text)
    c.drawCentredString(center_x, qr_y - 30, "ParkLive Web App © 2026")

    # Finalitzar la pàgina i guardar
    c.showPage()
    c.save()

    return filepath
