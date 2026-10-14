import { NextResponse } from 'next/server';
import { getPropertyAccountantReportData } from '@/lib/properties/accountant-report-service';
import { generateATOPropertyPdf } from '@/lib/pdf/ato-property-report-pdf';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let fy: string | number | null = null;
    try {
      const body = await request.json();
      fy = body?.financialYear ?? body?.fy;
    } catch {
      // Body may be empty, read from searchParams
      const { searchParams } = new URL(request.url);
      fy = searchParams.get('fy');
    }

    const data = await getPropertyAccountantReportData(id, fy);
    if (!data) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const pdfBuffer = generateATOPropertyPdf(data);

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ATO-Rental-Schedule-${data.property.name.replace(/\s+/g, '-')}-${data.financialYearLabel}.pdf"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to export PDF' },
      { status: 500 }
    );
  }
}
