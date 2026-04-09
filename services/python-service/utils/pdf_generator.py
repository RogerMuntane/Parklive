import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from datetime import datetime

def generar_tiquet_pdf(reserva_data, storage_path="/app/storage/tickets"):
    """
    Genera un fitxer PDF amb la informació de la reserva
    """
    if not os.path.exists(storage_path):
        os.makedirs(storage_path, exist_ok=True)

    filename = f"tiquet_{reserva_data['codi_reserva']}.pdf"
    filepath = os.path.join(storage_path, filename)
    
    doc = SimpleDocTemplate(filepath, pagesize=A4)
    styles = getSampleStyleSheet()
    
    # Estils personalitzats
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#2C3E50"),
        alignment=1, # Center
        spaceAfter=20
    )
    
    content = []
    
    # Capçalera
    content.append(Paragraph("ParkLive - Tiquet de Reserva", title_style))
    content.append(Paragraph(f"Codi de Reserva: <b>{reserva_data['codi_reserva']}</b>", styles['Normal']))
    content.append(Paragraph(f"Data de generació: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    content.append(Spacer(1, 20))
    
    # Informació de l'aparcament
    content.append(Paragraph("<b>Detalls de l'Aparcament</b>", styles['Heading2']))
    content.append(Paragraph(f"Nom: {reserva_data['aparcament']['nom']}", styles['Normal']))
    content.append(Paragraph(f"Adreça: {reserva_data['aparcament']['adreca']}, {reserva_data['aparcament']['ciutat']}", styles['Normal']))
    content.append(Spacer(1, 15))
    
    # Detalls de la reserva
    content.append(Paragraph("<b>Detalls de la Reserva</b>", styles['Heading2']))
    
    data_reserva = [
        ["Entrada:", reserva_data['data_entrada']],
        ["Sortida:", reserva_data['data_sortida']],
        ["Estat:", reserva_data['estat'].capitalize()],
        ["Preu Total:", f"{reserva_data['preu_total']} €"],
        ["Notes:", reserva_data.get('notes') or "-"]
    ]
    
    t = Table(data_reserva, colWidths=[100, 300])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    content.append(t)
    content.append(Spacer(1, 30))
    
    # Peu de pàgina
    content.append(Paragraph("Gràcies per confiar en ParkLive!", styles['Italic']))
    content.append(Paragraph("Si tens qualsevol dubte, contacta amb el nostre suport.", styles['Normal']))
    
    doc.build(content)
    
    return filepath
