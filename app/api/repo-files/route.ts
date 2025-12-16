import { NextResponse } from 'next/server';
import { getRepoFiles, getFilesByDirectory } from '@/lib/repo-files';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'flat';
    const forceRefresh = searchParams.get('refresh') === 'true';
    
    console.log(`[API Route] /api/repo-files - format: ${format}, refresh: ${forceRefresh}`);
    
    if (format === 'directory') {
      const filesByDir = await getFilesByDirectory();
      console.log(`[API Route] Returning ${Object.keys(filesByDir).length} directories`);
      return NextResponse.json({ files: filesByDir });
    } else {
      const files = await getRepoFiles(forceRefresh);
      console.log(`[API Route] Returning ${files.length} files`);
      return NextResponse.json({ files });
    }
  } catch (error: any) {
    console.error('Error fetching repo files:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStatus = error?.status || 500;
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: error?.response?.data || error?.stack,
      },
      { status: errorStatus }
    );
  }
}

