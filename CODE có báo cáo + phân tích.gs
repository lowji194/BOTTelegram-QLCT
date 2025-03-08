var TELEGRAM_BOT_TOKEN = "TOKEN CỦA BẠN"; // Thay bằng token bot của bạn
var TELEGRAM_CHAT_ID = "CHAT ID CỦA BẠN"; // Sau khi chạy getChatID(), cập nhật giá trị này

// ✅ Xóa Webhook để có thể sử dụng getUpdates() lấy CHAT_ID
function deleteWebhook() {
  var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/deleteWebhook";
  var response = UrlFetchApp.fetch(url);
  Logger.log("Delete Webhook response: " + response.getContentText());
}

// ✅ Lấy CHAT_ID tự động từ tin nhắn gần nhất
function getChatID() {
  var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/getUpdates";
  var response = UrlFetchApp.fetch(url);
  var data = JSON.parse(response.getContentText());
  
  if (data.result.length > 0) {
    var chatID = data.result[data.result.length - 1].message.chat.id;
    Logger.log("CHAT_ID: " + chatID);
    return chatID;
  } else {
    Logger.log("Không tìm thấy tin nhắn nào.");
    return null;
  }
}

// ✅ Thiết lập Webhook tự động sau khi triển khai
function setupWebhook() {
  var scriptUrl = "URL CỦA BẠN"; // Thay URL của Apps Script
  var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/setWebhook?url=" + encodeURIComponent(scriptUrl);
  
  var response = UrlFetchApp.fetch(url);
  Logger.log("Webhook response: " + response.getContentText());
}

// ✅ Lưu update_id mới nhất vào sheet "Update Log" (chỉ lưu 1 ID duy nhất)
function saveUpdateID(update_id) {
  var sheetName = "Update Log";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  // Nếu sheet chưa tồn tại, tạo mới
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Update_ID"]); // Tạo tiêu đề cột
  }

  // Lấy giá trị update_id hiện tại từ ô A2
  var lastUpdateID = sheet.getRange("A2").getValue();

  // Nếu update_id đã tồn tại, bỏ qua
  if (String(lastUpdateID) === String(update_id)) {
    Logger.log("🔁 Tin nhắn trùng, bỏ qua update_id: " + update_id);
    return false;
  }

  // Ghi đè update_id mới vào ô A2
  sheet.getRange("A2").setValue(update_id);
  Logger.log("✅ Update ID mới nhất đã lưu: " + update_id);

  return true; // Xác nhận đã cập nhật update_id mới
}

// ✅ Gửi trạng thái "typing..." để hiển thị bot đang nhập liệu
function sendTypingAction() {
  var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendChatAction";
  var payload = {
    "chat_id": TELEGRAM_CHAT_ID,
    "action": "typing"
  };

  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  };

  UrlFetchApp.fetch(url, options);
}

// ✅ Xử lý tin nhắn từ Telegram
function doPost(e) {
    if (!e.postData || !e.postData.contents) {
        Logger.log("❌ Dữ liệu POST không hợp lệ!");
        return;
    }

    var data;
    try {
        data = JSON.parse(e.postData.contents);
        Logger.log("📩 Dữ liệu nhận được: " + JSON.stringify(data));
    } catch (error) {
        Logger.log("❌ Lỗi khi phân tích JSON: " + error.message);
        return;
    }

    if (!data.message || !data.message.text) {
        Logger.log("❌ Tin nhắn không có nội dung text!");
        return;
    }

    var text = data.message.text.trim();
    var update_id = data.update_id || null;

  // ✅ Xử lý lệnh báo cáo ngày
if (text.startsWith("/baocaongay")) {
    text = text.replace(/\s+/g, " ").trim(); // Chuẩn hóa khoảng trắng

    let day, month;
    const dateMatch = text.match(/^\/baocaongay\s*(\d{1,2})?\/?(\d{1,2})?$/);

    if (dateMatch && dateMatch[1] && dateMatch[2]) {
        // Nếu nhập ngày & tháng (VD: /baocaongay 5/2)
        day = Number(dateMatch[1]);
        month = Number(dateMatch[2]);
    } else {
        // Nếu không có số ngày, lấy ngày hiện tại
        const now = new Date();
        day = now.getDate();
        month = now.getMonth() + 1;
    }

    // ✅ Kiểm tra ngày & tháng hợp lệ
    if (month < 1 || month > 12 || day < 1 || day > 31) {
        sendMessage("❌ Ngày hoặc tháng không hợp lệ! Vui lòng nhập đúng định dạng.\nVí dụ: `/baocaongay 5/2` hoặc `/baocaongay` để lấy ngày hiện tại.");
        return;
    }

    sendTypingAction();
    sendDailyReport(day, month);
    return;
}
// ✅ Xử lý lệnh báo cáo tháng
if (text.startsWith("/baocaothang")) {
    text = text.replace(/\s+/g, " ").trim(); // Chuẩn hóa khoảng trắng

    let month;
    const monthMatch = text.match(/^\/baocaothang\s*(\d{1,2})?$/);

    if (monthMatch && monthMatch[1]) {
        month = Number(monthMatch[1]);
    } else {
        // ✅ Nếu không có số tháng, lấy tháng hiện tại
        const now = new Date();
        month = now.getMonth() + 1; // Vì getMonth() trả về từ 0-11, nên +1
    }

    // ✅ Kiểm tra tháng hợp lệ (1-12)
    if (month < 1 || month > 12) {
        sendMessage("❌ Tháng không hợp lệ! Vui lòng nhập từ 1 đến 12.");
        return;
    }

    sendTypingAction();
    sendMonthlyReport(month);
    return;
}
// ✅ Sửa lỗi hàm xử lý lệnh phân tích tháng
if (text.startsWith("/phantichthang")) {
    text = text.replace(/\s+/g, " ").trim();
    let month;
    const monthMatch = text.match(/^\/phantichthang\s*(\d{1,2})?$/);
    
    if (monthMatch && monthMatch[1]) {
        month = Number(monthMatch[1]);
    } else {
        month = new Date().getMonth() + 1; // Lấy tháng hiện tại
    }
    
    if (month < 1 || month > 12) {
        sendMessage("❌ Tháng không hợp lệ! Vui lòng nhập từ 1 đến 12.");
        return;
    }
    
    sendTypingAction();
    Logger.log("📊 Đang phân tích tháng: " + month);
    sendTextChart(month, null);
    return;
}

// ✅ Sửa lỗi hàm xử lý lệnh phân tích ngày
if (text.startsWith("/phantichngay")) {
    text = text.replace(/\s+/g, " ").trim();
    
    let day, month;
    const dateMatch = text.match(/^\/phantichngay\s*(\d{1,2})?\/?(\d{1,2})?$/);
    
    if (dateMatch && dateMatch[1] && dateMatch[2]) {
        day = Number(dateMatch[1]);
        month = Number(dateMatch[2]);
    } else {
        const now = new Date();
        day = now.getDate();
        month = now.getMonth() + 1;
    }
    
    if (month < 1 || month > 12 || day < 1 || day > 31) {
        sendMessage("❌ Ngày hoặc tháng không hợp lệ! Vui lòng nhập đúng định dạng.");
        return;
    }
    
    sendTypingAction();
    Logger.log("📊 Đang phân tích ngày: " + day + "/" + month);
    sendTextChart(month, day);
    return;
}

// ✅ Sửa lỗi hiển thị Tổng thu nhập và Tổng chi tiêu
function sendTextChart(month, day) {
    var sheetName = "Tháng " + month;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    
    if (!sheet) {
        sendMessage(`❌ Không tìm thấy sheet '${sheetName}'. Vui lòng kiểm tra Google Sheets!`);
        return;
    }
    
    var data = sheet.getDataRange().getValues();
    var expenseDetails = {};
    var incomeTotal = 0;
    var expenseTotal = 0;
    
    for (var i = 1; i < data.length; i++) {
        var dateText = data[i][0]; 
        var type = data[i][1];
        var categoryDetail = data[i][4];
        var amount = data[i][3];
        
        if (!amount || isNaN(amount) || amount === 0) continue;
        
        if (day) {
            var parts = dateText.split("/");
            if (parts.length !== 2) continue;
            var rowDay = parseInt(parts[0]);
            var rowMonth = parseInt(parts[1]);
            if (rowDay !== day || rowMonth !== month) continue;
        }
        
        if (type === "Chi tiêu") {
            expenseTotal += amount;
            if (!expenseDetails[categoryDetail]) expenseDetails[categoryDetail] = 0;
            expenseDetails[categoryDetail] += amount;
        } else if (type === "Thu nhập") {
            incomeTotal += amount;
        }
    }
    
    if (incomeTotal === 0 && expenseTotal === 0) {
        sendMessage(`📊 *Không có dữ liệu ${day ? 'chi tiêu cho ngày ' + day + '/' + month : 'chi tiêu cho tháng ' + month}*`);
        return;
    }

    var chartText = `📊 *Biểu đồ chi tiêu ${day ? 'ngày ' + day + '/' + month : 'tháng ' + month}*\n\n`;
    
    for (var category in expenseDetails) {
        var amount = expenseDetails[category];
        var percentage = ((amount / expenseTotal) * 100).toFixed(1);
        chartText += `📌 *${category}* | ${percentage}%\n`;
    }
    
    chartText += `\n💰 *Tổng thu nhập tháng ${month}:* ${incomeTotal.toLocaleString()} VNĐ\n`;
    chartText += `💸 *Tổng chi tiêu tháng ${month}:* ${expenseTotal.toLocaleString()} VNĐ\n`;

    sendMessage(chartText, { parse_mode: "Markdown" });
}
  var sheet = SpreadsheetApp.getActiveSpreadsheet();

  // Gửi trạng thái "typing..."
  sendTypingAction();

  // Lưu update_id, nếu trùng lặp thì bỏ qua xử lý
  if (!saveUpdateID(update_id)) return;

  // Regex kiểm tra cú pháp
  var regex = /^(\d{1,2}\/\d{1,2})\s+([+-]?\d+[kKmM]?)\s+(.+)$/;
  var match = text.match(regex);

  var now = new Date();
  var inputDate = Utilities.formatDate(now, "GMT+7", "dd/MM");
  var amountText, category;

  if (match) {
    var dateParts = match[1].split("/");
    var day = parseInt(dateParts[0], 10);
    var month = parseInt(dateParts[1], 10);
    
    inputDate = ("0" + day).slice(-2) + "/" + ("0" + month).slice(-2);
    amountText = match[2];
    category = match[3].trim();
  } else {
    var oldRegex = /^([+-]?\d+[kKmM]?)\s+(.+)$/;
    var oldMatch = text.match(oldRegex);

    if (!oldMatch) {
    sendMessage(
    `❌ *Sai cú pháp nhập liệu!*
		💰 *Nếu muốn nhập số tiền thu nhập:*
		*Nhập:* \`+Số tiền danh mục\`
		*Ví dụ:* \`+15m lương tháng 2\`
		*Hoặc:* \`Ngày +số tiền danh mục\`
		*Ví dụ:* \`3/2 +5m lương OT \`
		
		💸 *Nếu muốn nhập số tiền chi tiêu:*
		*Nhập:* \`Số tiền danh mục\`
		*Ví dụ:* \`500k đổ dầu xe\`
		*Hoặc:* \`Ngày số tiền danh mục\`
		*Ví dụ:* \`3/2 500k mua áo\`

		📊 *Nếu muốn xem báo cáo:*
		*Nhập:*
		\`/baocaothang\` để xem báo cáo tháng hiện tại
		\`/baocaothang + số tháng\` để xem báo cáo tháng cụ thể
		*Ví dụ:* \`/baocaothang 2\`
		\`/baocaongay\` để xem báo cáo ngày hiện tại
		\`/baocaongay + số ngày\` để xem báo cáo của ngày cụ thể
		*Ví dụ:* \`/baocaongay 14/2\`

		📊 *Nếu muốn xem biểu đồ % các hạng mục:*
		*Nhập:*
		\`/phantichthang\` để xem biểu đồ % tháng hiện tại
		\`/phantichthang + số tháng\` để xem biểu đồ % tháng cụ thể
		*Ví dụ:* \`/phantichthang 2\`
		\`/phantichngay\` để xem biểu đồ % ngày hiện tại
		\`/phantichngay + số ngày\` để xem biểu đồ % của ngày cụ thể
		*Ví dụ:* \`/phantichngay 14/2\``,
        { parse_mode: "Markdown" }
    );
    return;
}
    amountText = oldMatch[1];
    category = oldMatch[2].trim();
  }

  category = capitalizeFirstLetter(category);
  var amount = parseMoney(amountText);
  if (!amount) {
    sendMessage("❌ Số tiền không hợp lệ!");
    return;
  }

  var monthSheet = parseInt(inputDate.split("/")[1], 10);
  var sheetName = "Tháng " + monthSheet;
  var activeSheet = sheet.getSheetByName(sheetName);

  // ✅ Phản hồi tin nhắn từ Telegram nếu sheet không tồn tại
  if (!activeSheet) {
    sendMessage(`❌ Sheet '${sheetName}' không tồn tại! Hãy tạo Sheet '${sheetName}' trong Google Sheet của bạn rồi quay lại Telegram để nhập dữ liệu`);
    return;
}

  var type = amountText.startsWith("+") ? "Thu nhập" : "Chi tiêu";
  var categoryDetail = getCategory(category);
  var lastRow = activeSheet.getLastRow();
  var dateColumn = activeSheet.getRange("A2:A" + lastRow).getValues().flat();

  var insertRow = lastRow + 1; // Dữ liệu điền vào bắt đầu từ hàng thứ 3 (Tránh trường hợp lỗi công thức tính Tổng thu nhập ở ô G2 - Tổng chi tiêu ở ô H2)
  for (var i = 0; i < dateColumn.length; i++) {
    if (dateColumn[i] && dateColumn[i] > inputDate) {
      insertRow = i + 2;
      break;
    }
  }

  activeSheet.insertRowBefore(insertRow);
  activeSheet.getRange(insertRow, 1).setValue(inputDate);
  activeSheet.getRange(insertRow, 2).setValue(type);
  activeSheet.getRange(insertRow, 3).setValue(category);
  activeSheet.getRange(insertRow, 4).setValue(amount);
  activeSheet.getRange(insertRow, 5).setValue(categoryDetail);

  var totalIncome = activeSheet.getRange("G2").getValue();
  var totalExpense = activeSheet.getRange("H2").getValue();

// Định nghĩa icon cho từng danh mục
let icons = {
    "Đi lại": "🚗",
    "Ăn uống": "🍽️",
    "Mua sắm": "🛍️",
    "Dịch vụ giặt ủi": "👕", 
    "Hóa đơn": "🧾",
    "Nhà cửa": "🏠",
    "Giải trí": "🎉",
    "Y tế": "💊",
    "Giáo dục": "📚",
    "Gia đình": "👨‍👩‍👧‍👦",
    "Đầu tư": "📈",
    "Tiết kiệm": "💰",
    "Công việc & Kinh doanh": "💼",
    "Từ thiện & Xã hội": "🤝",
    "Công nghệ & Thiết bị điện tử": "📱",
    "Thú cưng & Chăm sóc thú cưng": "🐾",
    "Tiệc tùng & Sự kiện": "🥂",
    "Dịch vụ tài chính & Ngân hàng": "🏦",
    "Dịch vụ pháp lý & Hành chính công": "📜",
    "Dịch vụ sửa chữa & Bảo trì": "🛠️",
    "Làm đẹp & Chăm sóc cá nhân": "💄",
    "Mua sắm online & TMĐT": "🛒",
    "Nghệ thuật & Sáng tạo": "🎭",
    "Công cụ & Phụ tùng": "🔧",
    "Thuế & Dịch vụ kế toán": "🧾",
    "An ninh & Giám sát": "🚨",
    "Dịch vụ pháp lý & Công chứng": "⚖️",
    "Công nghệ & Thiết bị số": "💻",
    "Vận chuyển & Logistics": "🚛",
    "Sản xuất & Gia công": "🏭",
    "Khóa học kỹ năng & Đào tạo chuyên sâu": "📖",
    "Quà tặng & Đồ lưu niệm": "🎁",
    "Nông nghiệp & Làm vườn": "🌾",
    "Bảo hiểm & Tài chính cá nhân": "🛡️",
    "Sức khỏe & Đời sống": "🌱",
    "Khác": "❗"
};

// Chọn icon cho danh mục và phân loại
let categoryIcon = icons[category] || (type === "Thu nhập" ? "💰" : "💸"); 
let categoryDetailIcon = icons[categoryDetail] || "📂"; // Thêm icon cho phân loại

sendMessage(
    `✅ *Đã ghi nhận:*\n` +
    `${categoryIcon} *${type}* - _${category}_ - *${amount.toLocaleString("vi-VN")} VNĐ*\n` +
    `📅 *Ngày:* ${inputDate}\n` +
    `${categoryDetailIcon} *Phân loại:* _${categoryDetail}_\n` +
    `📊 *Tổng thu nhập tháng ${monthSheet}:* ${totalIncome.toLocaleString("vi-VN")} VNĐ\n` +
    `📉 *Tổng chi tiêu tháng ${monthSheet}:* ${totalExpense.toLocaleString("vi-VN")} VNĐ`,
    { parse_mode: "Markdown" }
);
}

// ✅ Kiểm tra ngày trong tháng để đảm bảo điền đúng ngày vào vị trí
function compareDates(date1, date2) {
  var parts1 = date1.split("/");
  var parts2 = date2.split("/");

  var day1 = parseInt(parts1[0]);
  var month1 = parseInt(parts1[1]);
  var day2 = parseInt(parts2[0]);
  var month2 = parseInt(parts2[1]);

  if (month1 < month2) return -1;
  if (month1 > month2) return 1;
  return day1 - day2;
}
// ✅ Chuyển đổi số tiền sang số nguyên đúng đơn vị
function parseMoney(input) {
  var amount = input.toLowerCase().replace(/[,vnđ]/g, "").trim();
  if (amount.includes("k")) return parseFloat(amount) * 1000;
  if (amount.includes("m")) return parseFloat(amount) * 1000000;
  return parseFloat(amount);
}

// ✅ Viết hoa chữ cái đầu tiên của danh mục
function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ✅ Xác định danh mục chi tiết
function getCategory(input) {
  input = input.toLowerCase().trim(); // Chuẩn hóa chuỗi đầu vào
  Logger.log("Input nhận được: " + input);
  
  var categoryMap = {
      "Đi lại": [
		"đổ xăng", "xăng", "dầu", "taxi", "grab", "be", "xe ôm", "vé xe", "phí cầu đường",
		"bảo hiểm xe", "đăng kiểm", "rửa xe", "thuê xe", "bến xe", "bãi đỗ xe", "gửi xe",
		"phí giao thông", "trạm thu phí", "bảo trì xe"
	],
"Ăn uống": [
		"ăn sáng", "ăn trưa", "ăn tối", "cafe", "cà phê", "trà sữa", "nhà hàng", "ăn",
		"nhậu", "mua đồ ăn", "buffet", "bánh mì", "trà chanh", "bia", "rượu", "nước ngọt",
		"cơm văn phòng", "ship đồ ăn", "nấu ăn", "bếp gas", "bữa ăn", "gọi đồ ăn", "đặt đồ ăn",
		"đồ uống", "nước ép", "fastfood", "đồ ăn nhanh"
	],
"Mua sắm": [
		"mua", "mua áo", "mua quần", "mua váy", "mua áo khoác", "mua giày", "mua túi", "mua dép",
		"thời trang", "quần áo", "giày dép", "túi xách", "đồng hồ", "mỹ phẩm", "kính mắt", "nước hoa",
		"mua sắm", "shopping", "balo", "đồng hồ thông minh", "phụ kiện thời trang"
	],
"Dịch vụ giặt ủi": [ 
		"giặt quần áo", "giặt", "sửa quần áo", "giặt khô", "ủi đồ", "giặt ủi", "dịch vụ giặt", 
		"giặt thảm", "giặt rèm", "giặt nệm", "lau dọn"
	],
"Hóa đơn": [
		"tiền điện", "tiền nước", "internet", "cáp quang", "truyền hình", "gas", "nạp điện thoại",
		"điện thoại trả sau", "dịch vụ công", "hóa đơn điện tử", "tiền rác", "bảo trì hệ thống",
		"phí chung cư", "điện lực", "tiền cước", "cước viễn thông", "hóa đơn sinh hoạt"
	],
"Nhà cửa": [
		"tiền nhà", "thuê nhà", "sửa nhà", "nội thất", "đồ gia dụng", "cây cảnh", "chung cư",
		"bảo trì nhà", "trang trí nhà", "sơn nhà", "rèm cửa", "giường tủ", "sofa", "đồ bếp",
		"bát đĩa", "máy lọc nước", "bảo dưỡng nhà", "xây nhà", "cải tạo nhà", "sửa chữa điện nước"
	],
"Giải trí": [
		"rạp phim", "xem phim", "karaoke", "trò chơi", "chơi game", "du lịch", "khách sạn",
		"vé máy bay", "công viên", "spa", "xem bóng đá", "nhạc hội", "thể thao", "gym", "yoga",
		"bơi lội", "concert", "giải đấu", "thuê homestay", "vé sự kiện", "tham quan", "giải trí", "phim chiếu rạp"
	],
"Y tế": [
		"bệnh viện", "khám bệnh", "thuốc", "bảo hiểm", "gym", "yoga", "bác sĩ", "nha khoa", "xét nghiệm",
		"mua thuốc", "tiêm chủng", "sức khỏe", "đông y", "viện phí", "bảo hiểm sức khỏe", "dược phẩm",
		"khẩu trang", "vật tư y tế"
	],
"Giáo dục": [
		"học phí", "sách vở", "khóa học", "đồng phục", "gia sư", "trung tâm anh ngữ", "luyện thi",
		"đại học", "học online", "học thêm", "chứng chỉ", "tài liệu học tập", "khóa học trực tuyến",
		"đăng ký lớp học", "giáo trình", "học liệu", "đào tạo"
	],
"Gia đình": [
		"sinh nhật", "tiền mừng", "chăm con", "bỉm sữa", "đồ chơi trẻ em", "mừng thọ", "hỗ trợ người thân",
		"quà lễ tết", "nuôi thú cưng", "đồ dùng trẻ em", "chăm sóc ông bà", "gia đình", "đám cưới", "mừng sinh nhật", "tặng quà"
	],
"Đầu tư": [
		"đầu tư", "chứng khoán", "coin", "bất động sản", "forex", "crypto", "cổ phiếu", "lợi nhuận",
		"lãi suất", "vàng", "quỹ đầu tư", "trái phiếu", "giao dịch", "hợp đồng", "bất động sản cho thuê",
		"lợi nhuận đầu tư", "quỹ hưu trí"
	],
"Tiết kiệm": [
		"tiết kiệm", "gửi ngân hàng", "sổ tiết kiệm", "quỹ đầu tư", "lãi suất ngân hàng", "bảo hiểm nhân thọ",
		"tích lũy", "ngân hàng số", "tài khoản tiết kiệm", "gửi góp", "khoản tiết kiệm"
	],
"Công việc & Kinh doanh": [
        "doanh nghiệp", "khởi nghiệp", "startup", "kinh doanh", "bán hàng", 
        "đầu tư", "thu nhập", "hợp tác", "tuyển dụng", "tìm việc", 
        "công ty", "lương", "đàm phán", "hợp đồng kinh doanh"
	],
"Từ thiện & Xã hội": [
        "từ thiện", "quyên góp", "ủng hộ", "hỗ trợ cộng đồng", "trợ cấp", 
        "tình nguyện", "chương trình xã hội", "tổ chức phi lợi nhuận", "giúp đỡ", 
        "quỹ từ thiện", "hiến máu", "tặng sách", "hỗ trợ người khó khăn"
	],
"Công nghệ & Thiết bị điện tử": [
        "điện thoại", "máy tính bảng", "máy tính xách tay", "tai nghe", "loa bluetooth", 
        "máy ảnh", "smartwatch", "ổ cứng", "USB", "card đồ họa", 
        "bàn phím cơ", "tai nghe gaming", "màn hình máy tính", "chuột không dây"
	],
"Thú cưng & Chăm sóc thú cưng": [
        "thức ăn cho thú cưng", "bánh thưởng", "chăm sóc lông", "phụ kiện thú cưng", 
        "chuồng nuôi", "dụng cụ vệ sinh", "bác sĩ thú y", "spa thú cưng", "thức ăn khô", 
        "đồ chơi chó mèo", "huấn luyện thú cưng", "cát vệ sinh", "balo vận chuyển"
	],
"Tiệc tùng & Sự kiện": [
        "đặt tiệc", "sinh nhật", "tiệc cưới", "hội nghị", "trang trí sự kiện", 
        "đám cưới", "party", "thuê MC", "ban nhạc", "dịch vụ chụp ảnh", 
        "tổ chức sự kiện", "thuê âm thanh ánh sáng", "đặt bánh kem", "pháo hoa"
	],
"Dịch vụ tài chính & Ngân hàng": [
        "ngân hàng", "chuyển khoản", "phí dịch vụ ngân hàng", "tài khoản số", 
        "dịch vụ tài chính", "rút tiền", "nạp tiền", "đầu tư tài chính", 
        "mở tài khoản", "bảo hiểm tài chính", "vay vốn", "tiền gửi"
    ],
"Dịch vụ pháp lý & Hành chính công": [
        "tư vấn pháp lý", "luật sư", "dịch vụ pháp lý", "soạn thảo hợp đồng", 
        "giấy phép kinh doanh", "công chứng", "luật doanh nghiệp", "tòa án", 
        "dịch vụ hành chính", "cấp giấy phép", "hợp đồng lao động", "bảo hiểm xã hội"
    ],
"Dịch vụ sửa chữa & Bảo trì": [
        "sửa", "sửa chữa", "bảo trì", "thay thế linh kiện", "điện lạnh", "điện tử", 
        "thợ sửa chữa", "điện nước", "sửa máy tính", "sửa đồ gia dụng", "bảo trì thiết bị", 
        "thay pin", "vệ sinh máy lạnh", "bảo dưỡng xe máy", "sửa chữa ô tô"
    ],
"Làm đẹp & Chăm sóc cá nhân": [
        "mỹ phẩm", "làm đẹp", "spa", "tóc", "nail", "chăm sóc da", "dịch vụ thẩm mỹ", 
        "thời trang nữ", "nước hoa", "makeup", "dịch vụ massage", "sáp vuốt tóc", 
        "chăm sóc tóc", "điều trị mụn", "phẫu thuật thẩm mỹ"
    ],
"Mua sắm online & TMĐT": [
        "mua sắm online", "mua", "đặt hàng online", "thương mại điện tử", "shopee", "lazada", 
        "tiki", "sendo", "mua hàng quốc tế", "amazon", "ebay", "order hàng", "đặt hàng nước ngoài"
    ],
"Nghệ thuật & Sáng tạo": [
        "hội họa", "điêu khắc", "vẽ tranh", "thiết kế đồ họa", "nhiếp ảnh", "sáng tác", 
        "viết sách", "âm nhạc", "vẽ digital", "nghệ thuật đường phố", "đàn piano", 
        "trang trí nội thất", "đồ handmade"
    ],
"Công cụ & Phụ tùng": [
        "dụng cụ sửa chữa", "máy khoan", "búa", "cờ lê", "đinh vít", "máy cắt", 
        "bộ dụng cụ", "súng bắn keo", "dụng cụ cơ khí", "máy hàn", "máy bơm nước"
    ],
"Thuế & Dịch vụ kế toán": [
        "thuế thu nhập", "kế toán doanh nghiệp", "báo cáo tài chính", "quyết toán thuế", 
        "dịch vụ kế toán", "tư vấn thuế", "hóa đơn đỏ", "sổ sách kế toán"
    ],
"An ninh & Giám sát": [
        "camera giám sát", "hệ thống báo động", "khóa vân tay", "bảo vệ", 
        "báo cháy", "hệ thống an ninh", "thiết bị chống trộm", "cảm biến cửa"
    ],
"Dịch vụ pháp lý & Công chứng": [
        "công chứng", "chứng thực giấy tờ", "hợp đồng mua bán", "chuyển nhượng đất", 
        "luật sư tư vấn", "di chúc", "giấy tờ nhà đất", "đăng ký kinh doanh"
    ],
"Công nghệ & Thiết bị số": [
        "điện thoại", "máy tính", "máy ảnh", "tivi", "tablet", "phụ kiện điện tử", 
        "ổ cứng", "ram", "card đồ họa", "router wifi", "đồng hồ thông minh"
    ],
"Vận chuyển & Logistics": [
        "giao hàng", "vận chuyển", "chuyển phát nhanh", "dịch vụ ship hàng", 
        "chuyển nhà", "bốc xếp hàng hóa", "logistics", "dịch vụ kho bãi", "chuyển hàng quốc tế"
    ],
"Sản xuất & Gia công": [
        "sản xuất công nghiệp", "máy móc", "gia công cơ khí", "in ấn", "xưởng sản xuất", 
        "may mặc", "chế biến thực phẩm", "gia công nhựa", "gia công gỗ"
    ],
"Khóa học kỹ năng & Đào tạo chuyên sâu": [
        "học kỹ năng", "đào tạo nghề", "chứng chỉ hành nghề", "học lập trình", 
        "học marketing", "đào tạo kế toán", "học ngoại ngữ", "luyện thi chứng chỉ"
    ],
"Quà tặng & Đồ lưu niệm": [
        "quà tặng", "đồ lưu niệm", "quà sinh nhật", "tranh treo tường", "đồ decor", 
        "hoa tươi", "hộp quà", "quà tặng doanh nghiệp", "quà cưới"
    ],
"Nông nghiệp & Làm vườn": [
        "cây trồng", "hạt giống", "phân bón", "thuốc trừ sâu", "đất trồng cây", 
        "vườn rau", "chăm sóc cây cảnh", "dụng cụ làm vườn", "hoa kiểng"
    ],
"Bảo hiểm & Tài chính cá nhân": [
        "bảo hiểm nhân thọ", "bảo hiểm sức khỏe", "bảo hiểm xe máy", "bảo hiểm ô tô", 
        "quỹ đầu tư", "chứng khoán", "bảo hiểm du lịch", "bảo hiểm lao động"
    ],
"Sức khỏe & Đời sống": [
        "dinh dưỡng", "thực phẩm chức năng", "vitamin", "khoáng chất", "sữa dinh dưỡng", 
        "omega-3", "collagen", "men vi sinh", "tinh dầu thư giãn", "giấc ngủ", 
        "thiền định", "trị liệu tâm lý", "xe đạp", "giảm cân", "sức khỏe sinh sản"
    ],
     "Khác": [] // Nếu không khớp danh mục nào
};

 // Tính điểm cho từng danh mục
  var categoryScores = {};
  var bestCategory = "Khác";
  var highestScore = 0;

  for (var category in categoryMap) {
    var score = 0;
    var keywords = categoryMap[category];

    for (var i = 0; i < keywords.length; i++) {
      if (input.includes(keywords[i])) {
        score++;
      }
    }

    if (score > 0) {
      categoryScores[category] = score;
      if (score > highestScore) {
        highestScore = score;
        bestCategory = category;
      }
    }
  }

  Logger.log("Điểm danh mục: " + JSON.stringify(categoryScores));
  Logger.log("Chọn danh mục: " + bestCategory);

  return bestCategory;
}

// ✅ Kiểm tra tính đúng đắn
function testCategory() {
  Logger.log(getCategory("50k mua dây đồng hồ shopee"));   // Mua sắm online & TMĐT
  Logger.log(getCategory("100k mua giày adidas"));         // Mua sắm
  Logger.log(getCategory("200k đặt hàng lazada"));         // Mua sắm online & TMĐT
  Logger.log(getCategory("150k mua quần áo"));             // Mua sắm
  Logger.log(getCategory("50k đổ xăng xe máy"));           // Đi lại
  Logger.log(getCategory("300k đi khám bệnh viện"));       // Y tế
  Logger.log(getCategory("250k thuê homestay"));           // Giải trí
  Logger.log(getCategory("400k giặt rèm cửa"));            // Dịch vụ giặt ủi
  Logger.log(getCategory("120k mua sách giáo trình"));     // Giáo dục
  Logger.log(getCategory("999k tiền lặt vặt"));            // Khác
}

// ✅ Báo cáo ngày
function sendDailyReport(day, month) {
    var sheetName = "Tháng " + month;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    if (!sheet) {
        sendMessage(`❌ Không tìm thấy sheet '${sheetName}'. Vui lòng kiểm tra Google Sheets!`);
        return;
    }

    var data = sheet.getDataRange().getValues();
    var report = `📅 *Báo cáo ngày ${day}/${month}*\n\n`;
    var expenseDetails = {};
    var totalExpense = 0;
    var totalIncome = 0;

    for (var i = 1; i < data.length; i++) {
        var dateText = data[i][0]; // Cột ngày
        var type = data[i][1]; // Chi tiêu hay Thu nhập
        var categoryDetail = data[i][4]; // Phân loại
        var amount = data[i][3]; // Số tiền

        if (!amount || isNaN(amount) || amount === 0) continue;
        if (!dateText || typeof dateText !== "string") continue;

        var parts = dateText.split("/");
        if (parts.length !== 2) continue;

        var rowDay = parseInt(parts[0]);
        var rowMonth = parseInt(parts[1]);

        if (rowDay !== day || rowMonth !== month) continue;

        if (type === "Chi tiêu") {
            totalExpense += amount;
            if (!expenseDetails[categoryDetail]) expenseDetails[categoryDetail] = 0;
            expenseDetails[categoryDetail] += amount;
        } else if (type === "Thu nhập") {
            totalIncome += amount;
        }
    }

    if (totalExpense === 0 && totalIncome === 0) {
        sendMessage(`📅 *Báo cáo ngày ${day}/${month}*\n\n❌ Không có dữ liệu chi tiêu hoặc thu nhập.`);
        return;
    }

    for (var category in expenseDetails) {
        report += `📌 *${category}*: ${expenseDetails[category].toLocaleString("vi-VN")} VNĐ\n`;
    }

    report += `\n💰 *Tổng thu nhập:* ${totalIncome.toLocaleString("vi-VN")} VNĐ\n`;
    report += `💸 *Tổng chi tiêu:* ${totalExpense.toLocaleString("vi-VN")} VNĐ\n`;

    sendMessage(report, { parse_mode: "Markdown" });
}

// ✅ Báo cáo tháng
function sendMonthlyReport(month) {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
        sendMessage("❌ Lỗi hệ thống! Tháng không hợp lệ.");
        return;
    }

    var sheetName = "Tháng " + month;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    
    if (!sheet) {
        sendMessage(`❌ Không tìm thấy sheet '${sheetName}'. Vui lòng kiểm tra Google Sheets!`);
        return;
    }

    var data = sheet.getDataRange().getValues();

    if (data.length <= 1) { 
        sendMessage(`📊 *Báo cáo tháng ${month}*\n\n❌ Không có dữ liệu giao dịch trong tháng này.`);
        return;
    }

    var report = `📊 *Báo cáo tháng ${month}*\n\n`;
    var expenseDetails = {};
    var totalExpense = 0;
    var totalIncome = 0;

    for (var i = 1; i < data.length; i++) { 
        var type = data[i][1]; 
        var categoryDetail = data[i][4]; 
        var amount = data[i][3];

        if (!amount || isNaN(amount) || amount === 0) continue;

        if (type === "Chi tiêu") {
            totalExpense += amount;
            if (!expenseDetails[categoryDetail]) expenseDetails[categoryDetail] = 0;
            expenseDetails[categoryDetail] += amount;
        } else if (type === "Thu nhập") {
            totalIncome += amount;
        }
    }

    for (var category in expenseDetails) {
        report += `📌 *${category}*: ${expenseDetails[category].toLocaleString("vi-VN")} VNĐ\n`;
    }

    report += `\n💰 *Tổng thu nhập:* ${totalIncome.toLocaleString("vi-VN")} VNĐ\n`;
    report += `💸 *Tổng chi tiêu:* ${totalExpense.toLocaleString("vi-VN")} VNĐ\n`;

    sendMessage(report, { parse_mode: "Markdown" });
}


// ✅ Gửi tin nhắn Telegram
function sendMessage(text) {
  if (!TELEGRAM_CHAT_ID) {
    Logger.log("CHAT_ID chưa được thiết lập! Vui lòng chạy getChatID() trước.");
    return; // Cần return để không tiếp tục chạy code
  }

  var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
  var payload = {
    "chat_id": TELEGRAM_CHAT_ID,
    "text": text,
    "parse_mode": "Markdown"
  };

  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  };

  UrlFetchApp.fetch(url, options);
}