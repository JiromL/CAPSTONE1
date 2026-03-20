"""
PDF Generation Service for Appointment Confirmations
Generates DOH-style appointment confirmation documents
"""

import os
from datetime import datetime
from io import BytesIO


def generate_appointment_confirmation_pdf(appointment_data, output_path=None):
    """
    Generate appointment confirmation PDF using reportlab
    
    Args:
        appointment_data: Dict containing:
            - student_name: Full name
            - student_id: Student ID
            - student_contact: Contact info
            - student_email: Email address (optional)
            - reference_id: Confirmation number
            - appointment_date: Date of appointment
            - appointment_time: Time of appointment
            - platform: Meeting platform
            - counselor_name: Assigned counselor
            - concern: Primary concern (optional)
            - screenings_completed: List of screening assessments
        output_path: Path to save PDF (if None, returns bytes)
    
    Returns:
        Path to generated PDF or BytesIO object with PDF data
    """
    
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
    except ImportError:
        raise ImportError(
            "PDF generation requires 'reportlab' package. "
            "Install with: pip install reportlab"
        )
    
    # Create PDF
    if output_path is None:
        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    else:
        doc = SimpleDocTemplate(output_path, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    # Container for PDF elements
    story = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1B5E20'),
        spaceAfter=6,
        alignment=TA_CENTER
    )
    
    section_style = ParagraphStyle(
        'Section',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.whitesmoke,
        backColor=colors.HexColor('#1B5E20'),
        spaceAfter=12,
        leftIndent=10,
        rightIndent=10
    )
    
    # Header
    story.append(Paragraph("Appointment Confirmation", title_style))
    story.append(Paragraph("Counseling & Psychological Services", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Confirmation number
    story.append(Paragraph(f"<b>Confirmation No.: {appointment_data.get('reference_id', '')}</b>", styles['Normal']))
    story.append(Spacer(1, 0.2*inch))
    
    # Student info table
    story.append(Paragraph("STUDENT INFORMATION", section_style))
    
    student_data = [
        ['Student Name:', appointment_data.get('student_name', '')],
        ['Student ID:', appointment_data.get('student_id', '')],
        ['Contact Information:', appointment_data.get('student_contact', '')],
    ]
    
    # Add email if provided
    if appointment_data.get('student_email'):
        student_data.append(['Email:', appointment_data.get('student_email')])
    
    if appointment_data.get('concern'):
        student_data.append(['Primary Concern:', appointment_data.get('concern')])
    
    table = Table(student_data, colWidths=[2*inch, 4*inch])
    table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
    ]))
    story.append(table)
    story.append(Spacer(1, 0.3*inch))
    
    # Appointment details
    story.append(Paragraph("APPOINTMENT DETAILS", section_style))
    
    apt_data = [
        ['Date:', appointment_data.get('appointment_date', '')],
        ['Time:', appointment_data.get('appointment_time', '')],
        ['Format:', appointment_data.get('platform', 'In-Person')],
        ['Assigned Counselor:', appointment_data.get('counselor_name', 'CPS Staff')],
    ]
    
    table = Table(apt_data, colWidths=[2*inch, 4*inch])
    table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
    ]))
    story.append(table)
    story.append(Spacer(1, 0.2*inch))
    
    # Important notes
    story.append(Paragraph("Important Notes:", styles['Heading3']))
    notes = [
        "Please arrive 10 minutes early for in-person appointments.",
        "If meeting via Google Meet or Zoom, ensure stable internet connection.",
        "Contact CPS at least 24 hours before for rescheduling requests.",
        "For concerns or questions, reach out to our support team."
    ]
    
    for note in notes:
        story.append(Paragraph(f"• {note}", styles['Normal']))
    
    # Build PDF
    doc.build(story)
    
    if output_path is None:
        pdf_buffer.seek(0)
        return pdf_buffer
    else:
        print(f"✓ PDF generated: {output_path}")
        return output_path
