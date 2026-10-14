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
      propertyId: id,
      property: data.property,
      financialYear: data.financialYear,
      financialYearLabel: data.financialYearLabel,
      performance: data.performance,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}
