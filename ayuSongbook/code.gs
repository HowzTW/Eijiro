// 請替換成您的試算表 ID
const SPREADSHEET_ID = '1tv3Bv-5dv6J18gWzezb6FNuAjU7KRsQkSiMLj2FUpMA';
const SHEET_NAME = 'Songs';

/**
 * 處理網頁請求入口
 */
function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    if (action === 'search') {
      result = searchExternalSongs(e.parameter.keyword);
    } else if (action === 'getlist') {
      result = getMySonglist();
    } else if (action === 'add') {
      result = addSong(e.parameter);
    } else if (action === 'delete') {
      result = deleteSong(e.parameter.code);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * (1) 外部搜尋邏輯：抓取 song.corp.com.tw 並解析
 */
function searchExternalSongs(keyword) {
  if (!keyword) return [];
  const cleanKeyword = keyword.replace(/\s+/g, '');
  const url = `https://song.corp.com.tw/songs.aspx?company=%E9%87%91%E5%97%93&keyword=${encodeURIComponent(cleanKeyword)}`;
  
  const response = UrlFetchApp.fetch(url);
  const html = response.getContentText();
  
  // 使用正則表達式解析 HTML 中的歌曲資訊
  const regex = /<li[^>]*>([\s\S]*?)<\/li>/g;
  const songs = [];
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    const content = match[1];
    const name = extractTagContent(content, 'name');
    const singer = extractTagContent(content, 'singer');
    const code = extractTagContent(content, 'code');
    const lang = extractTagContent(content, 'lang');
    
    if (name && code) {
      songs.push({ name, singer, code, lang });
    }
  }
  return songs;
}

function extractTagContent(html, className) {
  const regex = new RegExp(`<div class="${className}">([\\s\\S]*?)<\/div>`);
  const match = regex.exec(html);
  return match ? match[1].trim().replace(/<[^>]*>?/gm, '') : '';
}

/**
 * (2) 讀取個人歌單
 */
function getMySonglist() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  return data.map(row => ({
    name: row[0],
    singer: row[1],
    code: row[2],
    lang: row[3]
  }));
}

/**
 * (3) 新增歌曲到歌單
 */
function addSong(params) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  sheet.appendRow([params.name, params.singer, params.code, params.lang, new Date()]);
  return "Successfully added";
}

/**
 * (4) 刪除歌曲
 */
function deleteSong(code) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][2].toString() === code.toString()) {
      sheet.deleteRow(i + 1);
      return "Successfully deleted";
    }
  }
  throw new Error("Song not found in list");
}
