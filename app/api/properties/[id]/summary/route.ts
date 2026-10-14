import { NextResponse } from 'next/server';
import { getPropertyAccountantReportData } from '@/lib/properties/accountant-report-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const fy = searchParams.get('fy');

    const data = await getPropertyAccountantReportData(id, fy);
    if (!data) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({
      property: data.property,
      financialYear: data.financialYear,
      financialYearLabel: data.financialYearLabel,
      summary: data.summary,
      yoyComparison: data.yoyComparison,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch summary' },
      { status: 500 }
    );
  }
}
