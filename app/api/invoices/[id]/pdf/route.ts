import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition/container';
import { PdfInvoiceAdapter } from '@/modules/invoices/infrastructure/documents/pdf/pdf-invoice-adapter';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoiceService = await container.resolve('invoiceService');

    const renderDto = await invoiceService.getInvoiceRenderData(id);
    if (!renderDto) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const pdfBytes = await PdfInvoiceAdapter.generate(renderDto);
    const download = request.nextUrl.searchParams.get('download') === '1';
    const disposition = download ? 'attachment' : 'inline';

    return new Response(pdfBytes as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${renderDto.invoiceNumber || 'Invoice'}.pdf"`,
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('[API /invoices/[id]/pdf] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF document' },
      { status: 500 }
    );
  }
}
