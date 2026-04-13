import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exportId: string }> }
) {
  const { exportId } = await params;

  // Obter URL da API Cloud
  const cloudApiUrl = process.env.NEXT_PUBLIC_CLOUD_API_URL;
  if (!cloudApiUrl) {
    return NextResponse.json(
      { error: 'API URL not configured' },
      { status: 500 }
    );
  }

  // Fazer proxy para o arquivo ZIP na API Cloud
  try {
    const zipUrl = `${cloudApiUrl}/exports/${exportId}.zip`;
    const response = await fetch(zipUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Export not found' },
        { status: 404 }
      );
    }

    // Obter o arquivo como buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Retornar o arquivo com headers corretos
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${exportId}.zip"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

  } catch (error) {
    console.error('Error serving ZIP file:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
