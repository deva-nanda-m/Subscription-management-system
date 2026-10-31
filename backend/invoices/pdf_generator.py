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


def generate_invoice_pdf(invoice):
    """
    Generates a professional, branded PDF document for a given Invoice.
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

    # Brand Colors
    primary_color = colors.HexColor('#4F46E5')    # Indigo
    dark_slate = colors.HexColor('#0F172A')
    muted_slate = colors.HexColor('#64748B')
    border_color = colors.HexColor('#E2E8F0')
    table_header_bg = colors.HexColor('#F8FAFC')
    emerald_color = colors.HexColor('#059669')
    amber_color = colors.HexColor('#D97706')

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

    meta_label_style = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=muted_slate
    )

    meta_val_style = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=dark_slate
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=dark_slate
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=dark_slate
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=dark_slate
    )

    table_cell_right = ParagraphStyle(
        'TableCellRight',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        alignment=2,
        textColor=dark_slate
    )

    table_cell_right_bold = ParagraphStyle(
        'TableCellRightBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        alignment=2,
        textColor=dark_slate
    )

    small_note_style = ParagraphStyle(
        'SmallNote',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=9,
        textColor=muted_slate
    )

    elements = []

    # 1. Header (Brand + Invoice Number)
    header_left = [
        Paragraph("BRIGHTLOOP SOFTWARE", title_style),
        Paragraph("Enterprise Subscription & Cloud Platform Solutions", brand_subtitle),
        Paragraph("Brightloop Software Technologies Pvt. Ltd. • GSTIN: 29AABCB1234F1Z8", brand_subtitle),
        Paragraph("Bangalore Technology Corridor, Karnataka 560103, India", brand_subtitle),
    ]

    status_color = emerald_color if invoice.status == 'PAID' else (amber_color if invoice.is_overdue else primary_color)
    status_label = "PAID IN FULL" if invoice.status == 'PAID' else ("OVERDUE" if invoice.is_overdue else invoice.get_status_display().upper())

    status_style = ParagraphStyle(
        'StatusBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=14,
        textColor=status_color,
        alignment=2
    )

    header_right = [
        Paragraph("TAX INVOICE", ParagraphStyle('TaxInvH', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=14, alignment=2, textColor=dark_slate)),
        Paragraph(f"<b>#{invoice.invoice_number}</b>", ParagraphStyle('InvNumH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=11, alignment=2, textColor=primary_color)),
        Paragraph(status_label, status_style),
    ]

    header_table = Table(
        [[header_left, header_right]],
        colWidths=[4.2 * inch, 3.1 * inch]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 14))
    elements.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceAfter=14))

    # 2. Metadata Columns (Bill To, Dates & Subscription Reference)
    customer_info = [
        Paragraph("BILLED TO:", meta_label_style),
        Paragraph(f"<b>{invoice.customer.full_name}</b>", meta_val_style),
        Paragraph(f"{invoice.customer.email}", meta_val_style),
        Paragraph(f"Customer Ref: BL-CUST-{invoice.customer.id:04d}", meta_val_style),
    ]

    sub_ref = invoice.subscription.subscription_number if invoice.subscription else "Direct Order"
    invoice_dates = [
        Paragraph("INVOICE DETAILS:", meta_label_style),
        Paragraph(f"Invoice Date: <b>{invoice.invoice_date.strftime('%d %b %Y')}</b>", meta_val_style),
        Paragraph(f"Payment Due Date: <b>{invoice.due_date.strftime('%d %b %Y')}</b>", meta_val_style),
        Paragraph(f"Payment Terms: {invoice.payment_terms}", meta_val_style),
    ]

    billing_period = [
        Paragraph("SUBSCRIPTION CONTEXT:", meta_label_style),
        Paragraph(f"Subscription: <b>{sub_ref}</b>", meta_val_style),
        Paragraph(f"Billing Period: {invoice.billing_period_start.strftime('%d %b %Y')} - {invoice.billing_period_end.strftime('%d %b %Y')}", meta_val_style),
        Paragraph(f"Currency: {invoice.currency}", meta_val_style),
    ]

    meta_grid = Table(
        [[customer_info, invoice_dates, billing_period]],
        colWidths=[2.5 * inch, 2.5 * inch, 2.3 * inch]
    )
    meta_grid.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(meta_grid)
    elements.append(Spacer(1, 16))

    # 3. Itemized Lines Table
    headers = [
        Paragraph("DESCRIPTION & PLAN", table_header_style),
        Paragraph("PRICE", table_cell_right_bold),
        Paragraph("QTY", table_header_style),
        Paragraph("DISC", table_cell_right_bold),
        Paragraph("TAX", table_cell_right_bold),
        Paragraph("TOTAL", table_cell_right_bold),
    ]
    lines_data = [headers]

    for line in invoice.lines.all():
        desc_text = f"<b>{line.product_name}</b>"
        if line.variant_name:
            desc_text += f"<br/><font color='#64748B'>Variant: {line.variant_name}</font>"
        if line.plan_name:
            desc_text += f"<br/><font color='#4F46E5'>Plan: {line.plan_name}</font>"

        lines_data.append([
            Paragraph(desc_text, table_cell_style),
            Paragraph(f"₹{line.unit_price:,.2f}", table_cell_right),
            Paragraph(str(line.quantity), table_cell_style),
            Paragraph(f"₹{line.discount_amount:,.2f}" if line.discount_amount > 0 else "-", table_cell_right),
            Paragraph(f"₹{line.tax_amount:,.2f} ({line.tax_rate}%)", table_cell_right),
            Paragraph(f"₹{line.line_total:,.2f}", table_cell_right_bold),
        ])

    table_widths = [3.2 * inch, 0.9 * inch, 0.5 * inch, 0.8 * inch, 0.9 * inch, 1.0 * inch]
    items_table = Table(lines_data, colWidths=table_widths, repeatRows=1)
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), table_header_bg),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, primary_color),
        ('LINEBELOW', (0, 1), (-1, -1), 0.5, border_color),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 14))

    # 4. Summary & Totals Table
    notes_block = []
    if invoice.notes:
        notes_block.append(Paragraph("<b>Notes:</b>", meta_label_style))
        notes_block.append(Paragraph(invoice.notes, small_note_style))
        notes_block.append(Spacer(1, 6))

    notes_block.append(Paragraph("<b>Payment Instructions:</b>", meta_label_style))
    notes_block.append(Paragraph("• Pay online instantly via Razorpay through the Customer Portal.", small_note_style))
    notes_block.append(Paragraph("• Bank Transfer: Brightloop Technologies, HDFC Bank, A/C: 50200012345678, IFSC: HDFC0001234", small_note_style))
    notes_block.append(Paragraph("• UPI Payment: brightloop@hdfcbank", small_note_style))

    summary_rows = [
        [Paragraph("Subtotal:", table_cell_style), Paragraph(f"₹{invoice.subtotal:,.2f}", table_cell_right_bold)],
    ]
    if invoice.discount_amount > Decimal('0.00'):
        summary_rows.append([
            Paragraph("Discounts Applied:", table_cell_style),
            Paragraph(f"-₹{invoice.discount_amount:,.2f}", table_cell_right_bold)
        ])
    summary_rows.extend([
        [Paragraph("Taxes (GST):", table_cell_style), Paragraph(f"+₹{invoice.tax_amount:,.2f}", table_cell_right_bold)],
        [Paragraph("<b>Total Amount:</b>", table_cell_bold), Paragraph(f"<b>₹{invoice.total_amount:,.2f}</b>", table_cell_right_bold)],
        [Paragraph("Amount Paid:", table_cell_style), Paragraph(f"₹{invoice.amount_paid:,.2f}", table_cell_right_bold)],
        [
            Paragraph("<b>Balance Outstanding:</b>", ParagraphStyle('BalDue', fontName='Helvetica-Bold', fontSize=9, textColor=primary_color)),
            Paragraph(f"<b>₹{invoice.outstanding_amount:,.2f}</b>", ParagraphStyle('BalDueVal', fontName='Helvetica-Bold', fontSize=10, textColor=primary_color, alignment=2))
        ],
    ])

    summary_table = Table(summary_rows, colWidths=[1.6 * inch, 1.2 * inch])
    summary_table.setStyle(TableStyle([
        ('LINEBELOW', (0, -3), (-1, -3), 1, border_color),
        ('LINEBELOW', (0, -1), (-1, -1), 1.5, primary_color),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))

    bottom_grid = Table(
        [[notes_block, summary_table]],
        colWidths=[4.5 * inch, 2.8 * inch]
    )
    bottom_grid.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(bottom_grid)
    elements.append(Spacer(1, 24))

    # 5. Sign-off Footer
    footer_text = Paragraph(
        "This is a system-generated computer invoice issued under the Information Technology Act. "
        "For billing inquiries, email billing@brightloopsoftware.com.",
        ParagraphStyle('FooterDisclaimer', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=7, alignment=1, textColor=muted_slate)
    )
    elements.append(footer_text)

    doc.build(elements)
    buffer.seek(0)
    return buffer

