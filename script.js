document.addEventListener('DOMContentLoaded', () => {
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw13ZKohUZlQU-jjrg8C-bN4au4Jd2KwjSa9jmHIVppYjOE-Avxew1Bz_gWWlUGus68/exec';

    const chatBox = document.getElementById('chat-box');
    const usernameInput = document.getElementById('username');
    const messageInput = document.getElementById('message');
    const sendButton = document.getElementById('send-button');
    const groupList = document.getElementById('group-list');
    const createGroupBtn = document.getElementById('create-group-btn');
    const currentGroupTitle = document.getElementById('current-group-title');

    let currentGroup = null;
    let lastDate = null;

    // 格式化日期和時間
    function formatMessageTime(timestamp) {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    function formatDateHeader(timestamp) {
        const date = new Date(timestamp);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('zh-TW', options);
    }

    // 獲取並顯示群組列表
    function fetchGroups() {
        $.ajax({
            url: APPS_SCRIPT_URL,
            type: 'GET',
            data: { action: 'getGroups' },
            dataType: 'jsonp',
            success: function(response) {
                groupList.innerHTML = '';
                
                // 找到 ID 為 0 的置頂公告，並從列表中移除
                let pinnedGroup = null;
                const filteredGroups = response.groups.filter(group => {
                    if (parseInt(group.GroupID) === 0) {
                        pinnedGroup = group;
                        return true; // 移除這個群組
                    }
                    return true;
                });
                
                // 處理置頂公告區，不顯示在群組列表
                if (pinnedGroup) {
                    // 模擬選擇置頂群組
                    currentGroup = pinnedGroup;
                    currentGroupTitle.textContent = pinnedGroup.GroupName;
                    
                    // 禁用輸入區
                    messageInput.disabled = true;
                    messageInput.placeholder = "此為置頂公告區，無法發送訊息";
                    sendButton.disabled = true;
                    
                    fetchMessages(); // 載入置頂訊息
                }

                // 顯示剩下的群組列表
                filteredGroups.forEach(group => {
                    const groupItem = document.createElement('li');
                    groupItem.textContent = group.GroupName;
                    groupItem.dataset.groupId = group.GroupID;
                    groupItem.addEventListener('click', () => selectGroup(group));
                    groupList.appendChild(groupItem);
                });
                
                // 如果還沒有選擇群組，且過濾後還有群組，則預設選擇第一個
                if (!currentGroup && filteredGroups.length > 0) {
                    selectGroup(filteredGroups[0]);
                } else if (filteredGroups.length > 0) {
                    // 如果已經有選擇群組，確保其在列表中有active類別
                    document.querySelector(`[data-group-id="${currentGroup.GroupID}"]`).classList.add('active');
                } else if (!currentGroup) {
                    const noGroupsMessage = document.createElement('li');
                    noGroupsMessage.textContent = '沒有其他群組，請新增群組。';
                    noGroupsMessage.style.textAlign = 'center';
                    noGroupsMessage.style.padding = '15px';
                    groupList.appendChild(noGroupsMessage);
                }
            },
            error: function(xhr, status, error) {
                console.error('Error fetching groups:', error);
            }
        });
    }

    // 選擇群組並載入訊息
    function selectGroup(group) {
        currentGroup = group;
        currentGroupTitle.textContent = group.GroupName;
        lastDate = null; // 重置日期
        
        // 根據群組 ID 啟用或禁用輸入區
        if (currentGroup.GroupID === '0') {
            messageInput.disabled = true;
            messageInput.placeholder = "此為置頂公告區，無法發送訊息";
            sendButton.disabled = true;
        } else {
            messageInput.disabled = false;
            messageInput.placeholder = "輸入訊息...";
            sendButton.disabled = false;
        }
        
        fetchMessages();
        document.querySelectorAll('#group-list li').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-group-id="${group.GroupID}"]`).classList.add('active');
    }

    // 讀取訊息
    function fetchMessages() {
        if (!currentGroup) return;
        $.ajax({
            url: APPS_SCRIPT_URL,
            type: 'GET',
            data: { groupID: currentGroup.GroupID },
            dataType: 'jsonp',
            success: function(response) {
                chatBox.innerHTML = '';
                lastDate = null; // 重新載入訊息時重置日期
                response.messages.forEach(msg => {
                    const messageDate = new Date(msg.Timestamp);
                    const currentDateString = messageDate.toDateString();

                    // 檢查是否需要顯示日期分隔線
                    if (lastDate && currentDateString !== lastDate) {
                        const dateHeader = document.createElement('div');
                        dateHeader.classList.add('date-header');
                        dateHeader.textContent = formatDateHeader(messageDate);
                        chatBox.appendChild(dateHeader);
                    }
                    lastDate = currentDateString;

                    const messageElement = document.createElement('div');
                    messageElement.classList.add('message');
                    messageElement.innerHTML = `
                        <strong>${msg.user}:</strong> ${msg.message}
                        <span class="message-time">${formatMessageTime(msg.Timestamp)}</span>
                    `;
                    chatBox.appendChild(messageElement);
                });
                chatBox.scrollTop = chatBox.scrollHeight;
            },
            error: function(xhr, status, error) {
                console.error('Error fetching messages:', error);
            }
        });
    }

    // 發送訊息
    function sendMessage() {
        if (sendButton.disabled) return;
        if (!currentGroup) {
            alert('請先選擇一個群組！');
            return;
        }
        const user = usernameInput.value.trim();
        const message = messageInput.value.trim();

        if (!user || !message) {
            alert('請輸入你的名字和訊息！');
            return;
        }

        $.ajax({
            url: APPS_SCRIPT_URL,
            type: 'GET',
            data: {
                action: 'send',
                groupID: currentGroup.GroupID,
                user: user,
                message: message
            },
            dataType: 'jsonp',
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

    // 建立新群組
    function createGroup() {
        const groupName = prompt('請輸入新群組名稱：');
        if (groupName) {
            $.ajax({
                url: APPS_SCRIPT_URL,
                type: 'GET',
                data: { action: 'createGroup', groupName: groupName },
                dataType: 'jsonp',
                success: function(response) {
                    if (response.status === 'success') {
                        alert('新群組已建立！');
                        fetchGroups();
                    } else {
                        alert('群組建立失敗！');
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Error creating group:', error);
                }
            });
        }
    }

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    createGroupBtn.addEventListener('click', createGroup);

    fetchGroups();
    setInterval(fetchMessages, 3000);
});