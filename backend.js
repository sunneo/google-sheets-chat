const GROUP_HUB_SHEET_NAME = 'Group Hub';

// doGet 函數：處理所有讀寫請求
function doGet(e) {
  const params = e.parameter;
  let result = {};

  try {
    if (params.action === 'send') {
      const { groupID, user, message } = params;

      // 檢查是否為置頂群組，如果是則拋出錯誤
      if (groupID === '0') {
        throw new Error('無法在「置頂」群組中發送訊息。');
      }

      const targetSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetById(parseInt(groupID));
      if (!targetSheet) throw new Error('指定的群組不存在。');
      targetSheet.appendRow([new Date(), user, message]);
      result = { status: "success", message: "訊息已送出！" };
      
    } else if (params.action === 'getGroups') {
      const hubSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GROUP_HUB_SHEET_NAME);
      const data = hubSheet.getDataRange().getValues();
      const headers = data.shift();
      const groups = data.map(row => {
        const obj = {};
        headers.forEach((header, i) => obj[header] = row[i]);
        return obj;
      });
      result = { status: "success", groups: groups };
      
    } else if (params.action === 'createGroup') {
      const { groupName } = params;
      if (!groupName) throw new Error('群組名稱不能為空。');
      
      const newSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(groupName);
      newSheet.appendRow(['Timestamp', 'user', 'message']);
      const newSheetId = newSheet.getSheetId();

      const hubSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GROUP_HUB_SHEET_NAME);
      hubSheet.appendRow([newSheetId, groupName]);
      result = { status: "success", message: "群組已成功建立！", groupID: newSheetId, groupName: groupName };
      
    } else {
      // 預設為讀取訊息
      const { groupID } = params;
      if (!groupID) throw new Error('請選擇一個群組。');
      
      // 關鍵修改：將 groupID 字串轉換為數字
      const targetSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetById(parseInt(groupID));
      if (!targetSheet) throw new Error('指定的群組不存在。');
      const data = targetSheet.getDataRange().getValues();
      const headers = data.shift();
      const messages = data.map(row => {
        const obj = {};
        headers.forEach((header, i) => obj[header] = row[i]);
        return obj;
      });
      result = { status: "success", messages: messages };
    }
  } catch (error) {
    result = { status: "error", message: error.toString() };
  }

  // 統一回傳 JSONP
  if (params.callback) {
    return ContentService.createTextOutput(params.callback + '(' + JSON.stringify(result) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    const output = ContentService.createTextOutput(JSON.stringify(result));
    output.setMimeType(ContentService.MimeType.JSON);
    output.setHeader('Access-Control-Allow-Origin', '*');
    return output;
  }
}

// 每天自動清理舊訊息
function deleteOldMessages() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  sheets.forEach(sheet => {
    if (sheet.getName() === GROUP_HUB_SHEET_NAME) return;
    if (sheet.getSheetId() === 0) return; // 不刪除置頂公告區

    const range = sheet.getDataRange();
    if (range.getNumRows() <= 1) return; // 避免刪除標題列

    const values = range.getValues();
    const rowsToDelete = [];

    for (let i = 1; i < values.length; i++) {
      const timestamp = values[i][0];
      if (timestamp && timestamp instanceof Date && timestamp < threeMonthsAgo) {
        rowsToDelete.push(i + 1);
      }
    }

    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      sheet.deleteRow(rowsToDelete[i]);
    }
  });
}
