import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'];

function getAuth() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Google credentials not set in environment variables');
  }
  
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  if (privateKey) {
    // ログに出力して実際の構造を確認（中身は見せない）
    console.log("Key length:", privateKey.length);
    console.log("Has literal \\n:", privateKey.includes('\\n'));
    console.log("Has real newlines:", privateKey.includes('\n'));
    console.log("Starts with quote:", privateKey.startsWith('"') || privateKey.startsWith("'"));
    console.log("Ends with quote:", privateKey.endsWith('"') || privateKey.endsWith("'"));

    // 先頭・末尾のクォートを除去
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    // 文字列の `\n` を実際の改行に変換
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    // それでも改行がない場合は、BEGINとENDの間を無理やり改行する（一列になっている場合用）
    if (!privateKey.includes('\n')) {
      privateKey = privateKey.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
      privateKey = privateKey.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
      // 間の空白も改行にすべきかもしれないが、通常は\nが失われた状態
      // ユーザーがコピーミスした可能性が高い
    }
    
    // 更にクォートが残っていたら消す
    privateKey = privateKey.replace(/"/g, '');
  }

  const credentials = {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: privateKey,
  };

  return new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
}

export async function getDriveService() {
  const auth = getAuth();
  return google.drive({ version: 'v3', auth });
}

export async function findFileByName(fileName: string) {
  const drive = await getDriveService();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID not set');
  }

  const res = await drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0];
  }
  return null;
}

export async function readJsonFile(fileName: string) {
  const drive = await getDriveService();
  const file = await findFileByName(fileName);

  if (!file || !file.id) {
    return null;
  }

  const res = await drive.files.get(
    { fileId: file.id, alt: 'media' },
    { responseType: 'text' }
  );

  try {
    // If res.data is empty string, return empty array/object
    if (!res.data) return null;
    return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  } catch (e) {
    console.error(`Error parsing JSON from Drive file ${fileName}:`, e);
    return null;
  }
}

export async function writeJsonFile(fileName: string, data: any) {
  const drive = await getDriveService();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const existingFile = await findFileByName(fileName);
  const fileContent = JSON.stringify(data, null, 2);

  const media = {
    mimeType: 'application/json',
    body: Readable.from([fileContent]),
  };

  if (existingFile && existingFile.id) {
    // Update existing file
    await drive.files.update({
      fileId: existingFile.id,
      media: media,
    });
  } else {
    // Create new file
    await drive.files.create({
      requestBody: {
        name: fileName,
        parents: folderId ? [folderId] : undefined,
      },
      media: media,
      fields: 'id',
    });
  }
}
