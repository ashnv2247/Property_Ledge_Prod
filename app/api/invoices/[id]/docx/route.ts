import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition/container';
import { DocxInvoiceAdapter } from '@/modules/invoices/infrastructure/documents/docx/docx-invoice-adapter';

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

    const docxBuffer = await DocxInvoiceAdapter.generate(renderDto);

    return new Response(docxBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${renderDto.invoiceNumber || 'Invoice'}.docx"`,
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    });
  } catch (error: any) {
    console.error('[API /invoices/[id]/docx] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate Word document' },
      { status: 500 }
    );
  }
}
