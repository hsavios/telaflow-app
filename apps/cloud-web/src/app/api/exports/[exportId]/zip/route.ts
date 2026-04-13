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

  // Redirecionar para o arquivo ZIP na API Cloud
  try {
    const zipUrl = `${cloudApiUrl}/exports/${exportId}.zip`;

    // Fazer redirect para a URL original
    return NextResponse.redirect(zipUrl, 302);

  } catch (error) {
    console.error('Error redirecting to ZIP file:', error);
    return NextResponse.json(
      { error: 'Failed to redirect to file' },
      { status: 500 }
    );
  }
}
