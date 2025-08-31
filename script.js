document.addEventListener('DOMContentLoaded', () => {
    // 將這個 URL 替換成你部署 Apps Script 後得到的 URL
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw13ZKohUZlQU-jjrg8C-bN4au4Jd2KwjSa9jmHIVppYjOE-Avxew1Bz_gWWlUGus68/exec';

    const chatBox = document.getElementById('chat-box');
    const usernameInput = document.getElementById('username');
    const messageInput = document.getElementById('message');
    const sendButton = document.getElementById('send-button');

    // 讀取訊息函式
    function fetchMessages() {
        $.ajax({
            url: APPS_SCRIPT_URL,
            type: 'GET',
            dataType: 'jsonp', // 使用 JSONP 處理跨域
            success: function(data) {
                chatBox.innerHTML = '';
                data.messages.forEach(msg => {
                    const messageElement = document.createElement('div');
                    messageElement.classList.add('message');
                    messageElement.innerHTML = `<strong>${msg.user}:</strong> ${msg.message}`;
                    chatBox.appendChild(messageElement);
                });
                chatBox.scrollTop = chatBox.scrollHeight;
            },
            error: function(xhr, status, error) {
                console.error('Error fetching messages:', error);
            }
        });
    }

    // 發送訊息函式（使用 GET 模擬 POST）
    function sendMessage() {
        const user = usernameInput.value.trim();
        const message = messageInput.value.trim();

        if (!user || !message) {
            alert('請輸入你的名字和訊息！');
            return;
        }

        $.ajax({
            url: APPS_SCRIPT_URL,
            type: 'GET', // 關鍵：使用 GET 請求
            data: { 
                action: 'send', // 告訴後端這是寫入請求
                user: user,
                message: message
            },
            dataType: 'jsonp', // 使用 JSONP
            success: function(response) {
                if (response.status === 'success') {
                    messageInput.value = '';
                    fetchMessages();
                } else {
                    alert('訊息發送失敗！');
                }
            },
            error: function(xhr, status, error) {
                console.error('Error sending message:', error);
                alert('訊息發送失敗！');
            }
        });
    }

    // 監聽按鈕點擊和 Enter 鍵
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // 每隔 3 秒自動更新訊息
    fetchMessages();
    setInterval(fetchMessages, 3000);
});
