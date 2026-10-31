import io
from decimal import Decimal
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


def generate_quotation_pdf(quotation):
    """
    Generates a professional, branded PDF document for a given Quotation.
    Returns: BytesIO buffer containing the PDF bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor('#4F46E5')    # Indigo
    dark_slate = colors.HexColor('#0F172A')
    muted_slate = colors.HexColor('#64748B')
    border_color = colors.HexColor('#E2E8F0')
    table_header_bg = colors.HexColor('#F8FAFC')

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=2
    )

    brand_subtitle = ParagraphStyle(
        'BrandSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=muted_slate
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=dark_slate,
        spaceBefore=8,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=dark_slate
    )

    bold_body = ParagraphStyle(
        'DocBodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=dark_slate
    )

    right_body = ParagraphStyle(
        'RightBody',
        parent=body_style,
        alignment=2
    )

    right_bold = ParagraphStyle(
        'RightBold',
        parent=bold_body,
        alignment=2
    )

    story = []

    # 1. Header: Brand (Left) & Quotation Identifiers (Right)
    brand_text = """
    <b>BRIGHTLOOP SOFTWARE INC.</b><br/>
    Subscription Platforms & Enterprise Suite<br/>
    Email: billing@brightloopsoftware.com<br/>
    Web: https://brightloopsoftware.com
    """
    q_meta_text = f"""
    <b>QUOTATION</b><br/>
    <b>Quotation #:</b> {quotation.quotation_number}<br/>
    <b>Date:</b> {quotation.quotation_date}<br/>
    <b>Valid Until:</b> {quotation.expiry_date}<br/>
    <b>Status:</b> {quotation.status}
    """

    header_table = Table(
        [
            [
                Paragraph("<b>Brightloop Software</b>", title_style),
                Paragraph(q_meta_text, right_body)
            ],
            [
                Paragraph(brand_text, brand_subtitle),
                ""
            ]
        ],
        colWidths=[3.25 * inch, 4.25 * inch]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceBefore=4, spaceAfter=14))

    # 2. Customer Information Card
    customer = quotation.customer
    customer_info = f"""
    <b>PREPARED FOR:</b><br/>
    <b>Name:</b> {customer.full_name}<br/>
    <b>Email:</b> {customer.email}<br/>
    <b>Customer Reference ID:</b> BL-CUST-{customer.id}
    """
    cust_table = Table(
        [[Paragraph(customer_info, body_style)]],
        colWidths=[7.5 * inch]
    )
    cust_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F1F5F9')),
        ('BOX', (0, 0), (-1, -1), 1, border_color),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    story.append(cust_table)
    story.append(Spacer(1, 14))

    # 3. Itemized Quotation Line Items Table
    headers = [
        Paragraph("<b>Product / Variant</b>", bold_body),
        Paragraph("<b>Plan / Interval</b>", bold_body),
        Paragraph("<b>Qty</b>", bold_body),
        Paragraph("<b>Unit Price</b>", right_bold),
        Paragraph("<b>Tax Rate</b>", right_bold),
        Paragraph("<b>Total</b>", right_bold),
    ]

    table_data = [headers]

    for line in quotation.lines.all():
        prod_title = line.product_name
        if line.variant_name:
            prod_title += f"<br/><font color='#64748B' size='7.5'>Tier: {line.variant_name}</font>"

        plan_title = f"{line.plan_name}<br/><font color='#64748B' size='7.5'>Interval: {line.billing_interval}</font>"

        table_data.append([
            Paragraph(prod_title, body_style),
            Paragraph(plan_title, body_style),
            Paragraph(str(line.quantity), body_style),
            Paragraph(f"${line.unit_price:,.2f}", right_body),
            Paragraph(f"{line.tax_rate}%", right_body),
            Paragraph(f"${line.line_total:,.2f}", right_body),
        ])

    items_table = Table(
        table_data,
        colWidths=[2.2 * inch, 1.8 * inch, 0.6 * inch, 1.0 * inch, 0.8 * inch, 1.1 * inch]
    )
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), table_header_bg),
        ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 14))

    # 4. Financial Summary
    summary_data = [
        [Paragraph("Subtotal:", right_body), Paragraph(f"${quotation.subtotal:,.2f}", right_body)],
        [Paragraph("Estimated Tax:", right_body), Paragraph(f"${quotation.tax_amount:,.2f}", right_body)],
    ]
    if quotation.discount_amount and quotation.discount_amount > Decimal('0.00'):
        summary_data.append([
            Paragraph("Discount Applied:", right_body),
            Paragraph(f"-${quotation.discount_amount:,.2f}", right_body)
        ])
    summary_data.append([
        Paragraph("<b>Grand Total:</b>", right_bold),
        Paragraph(f"<b>${quotation.grand_total:,.2f}</b>", right_bold)
    ])

    summary_table = Table(summary_data, colWidths=[6.0 * inch, 1.5 * inch])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('PADDING', (0, 0), (-1, -1), 3),
        ('LINEBELOW', (0, -1), (-1, -1), 1, primary_color),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 14))

    # 5. Notes & Terms
    if quotation.notes:
        story.append(Paragraph("<b>Notes & Instructions:</b>", h2_style))
        story.append(Paragraph(quotation.notes.replace("\n", "<br/>"), body_style))
        story.append(Spacer(1, 8))

    if quotation.terms_and_conditions:
        story.append(Paragraph("<b>Terms and Conditions:</b>", h2_style))
        story.append(Paragraph(quotation.terms_and_conditions.replace("\n", "<br/>"), brand_subtitle))
        story.append(Spacer(1, 8))

    # 6. Sign-off Footer
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=border_color, spaceBefore=4, spaceAfter=6))
    footer_text = "This quotation is subject to Brightloop Software terms of service. Generated automatically by Brightloop Subscription Management System."
    story.append(Paragraph(footer_text, brand_subtitle))

    doc.build(story)
    buffer.seek(0)
    return buffer

