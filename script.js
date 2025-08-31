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

    // 獲取並顯示群組列表
    function fetchGroups() {
        $.ajax({
            url: APPS_SCRIPT_URL,
            type: 'GET',
            data: { action: 'getGroups' },
            dataType: 'jsonp',
            success: function(response) {
                groupList.innerHTML = '';
                response.groups.forEach(group => {
                    const groupItem = document.createElement('li');
                    groupItem.textContent = group.GroupName;
                    groupItem.dataset.groupId = group.GroupID;
                    groupItem.addEventListener('click', () => selectGroup(group));
                    groupList.appendChild(groupItem);

                    // 預設選擇第一個群組
                    if (!currentGroup) {
                        selectGroup(group);
                    }
                });
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
        fetchMessages();
        // 移除所有 group-list li 的 active 類別
        document.querySelectorAll('#group-list li').forEach(item => item.classList.remove('active'));
        // 加上當前群組的 active 類別
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
                response.messages.forEach(msg => {
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

    // 發送訊息
    function sendMessage() {
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

    // 啟動應用程式
    fetchGroups();
    setInterval(fetchMessages, 3000);
});
