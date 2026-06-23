import { google } from 'googleapis';
import { getAuth } from './drive';

// シートAPIサービスクライアントを取得
export async function getSheetsService() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

// MTGNotes と MTGParticipants のシートを初期化（存在しなければ作成、あれば無視）
async function ensureSheetExists(spreadsheetId: string, sheetName: string, headers: string[]) {
  const sheets = await getSheetsService();
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = spreadsheet.data.sheets?.some(s => s.properties?.title === sheetName);
    
    if (!sheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: sheetName }
            }
          }]
        }
      });
      
      // ヘッダー行を追加
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] }
      });
    }
  } catch (error) {
    console.error(`Error ensuring sheet ${sheetName} exists:`, error);
  }
}

// --- MTGNotes の読み書き ---
// シート構造: [AccountId, NoteId, Timestamp, Content]
export async function getNotesFromSheet(accountId?: string) {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SPREADSHEET_ID is not set');

  await ensureSheetExists(spreadsheetId, 'MTGNotes', ['AccountId', 'NoteId', 'Timestamp', 'Content']);
  const sheets = await getSheetsService();
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'MTGNotes!A2:D',
  });

  const rows = res.data.values || [];
  const notesByAccount: Record<string, any[]> = {};

  for (const row of rows) {
    const [rowAccountId, noteId, timestamp, content] = row;
    if (!rowAccountId || !noteId) continue;
    
    if (!notesByAccount[rowAccountId]) {
      notesByAccount[rowAccountId] = [];
    }
    
    notesByAccount[rowAccountId].push({
      id: noteId,
      timestamp,
      content: content || ''
    });
  }

  // 日付の降順（新しい順）でソート
  for (const acc in notesByAccount) {
    notesByAccount[acc].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  if (accountId) {
    return notesByAccount[accountId] || [];
  }
  return notesByAccount;
}

export async function saveNoteToSheet(accountId: string, noteBlock: any) {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SPREADSHEET_ID is not set');

  await ensureSheetExists(spreadsheetId, 'MTGNotes', ['AccountId', 'NoteId', 'Timestamp', 'Content']);
  const sheets = await getSheetsService();
  
  // 既存のNoteIdかチェックして更新または追記する
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'MTGNotes!A:B', // AccountId と NoteId
  });
  
  const rows = res.data.values || [];
  let rowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === accountId && rows[i][1] === noteBlock.id) {
      rowIndex = i + 1; // 1-indexed
      break;
    }
  }

  if (rowIndex !== -1) {
    // 更新
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `MTGNotes!C${rowIndex}:D${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[noteBlock.timestamp, noteBlock.content]] }
    });
  } else {
    // 追記
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'MTGNotes!A:D',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[accountId, noteBlock.id, noteBlock.timestamp, noteBlock.content]] }
    });
  }
}

export async function deleteNoteFromSheet(accountId: string, noteId: string) {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SPREADSHEET_ID is not set');

  const sheets = await getSheetsService();
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'MTGNotes!A:B', // AccountId と NoteId
  });
  
  const rows = res.data.values || [];
  let rowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === accountId && rows[i][1] === noteId) {
      rowIndex = i + 1; // 1-indexed
      break;
    }
  }

  if (rowIndex !== -1) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `MTGNotes!A${rowIndex}:D${rowIndex}`,
    });
  }
}

// --- Participants の読み書き ---
// シート構造: [Key (固定), Participants (JSON)]
export async function getParticipantsFromSheet() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SPREADSHEET_ID is not set');

  await ensureSheetExists(spreadsheetId, 'MTGParticipants', ['Key', 'ParticipantsData']);
  const sheets = await getSheetsService();
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'MTGParticipants!A2:B',
  });

  const rows = res.data.values || [];
  const row = rows.find(r => r[0] === 'global');
  
  if (row && row[1]) {
    try {
      return JSON.parse(row[1]);
    } catch (e) {
      return [];
    }
  }
  return [];
}

export async function saveParticipantsToSheet(participants: string[]) {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SPREADSHEET_ID is not set');

  await ensureSheetExists(spreadsheetId, 'MTGParticipants', ['Key', 'ParticipantsData']);
  const sheets = await getSheetsService();
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'MTGParticipants!A:A',
  });
  
  const rows = res.data.values || [];
  let rowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === 'global') {
      rowIndex = i + 1;
      break;
    }
  }

  const jsonStr = JSON.stringify(participants);

  if (rowIndex !== -1) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `MTGParticipants!B${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[jsonStr]] }
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'MTGParticipants!A:B',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [['global', jsonStr]] }
    });
  }
}
