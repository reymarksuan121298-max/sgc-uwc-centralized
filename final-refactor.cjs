const fs = require('fs');
const path = require('path');

const headerPath = path.join(__dirname, 'src', 'components', 'common', 'Header.jsx');
let content = fs.readFileSync(headerPath, 'utf8');

// 1. Messenger Replacement
const messengerStartStr = '{/* MESSENGER ACTIVE USERS DROPDOWN */}';
const messengerEndStr = '{/* NOTIFICATIONS CENTER BELL & DROPDOWN */}';
const messStartIndex = content.indexOf(messengerStartStr);
const messEndIndex = content.lastIndexOf('</div>', content.indexOf(messengerEndStr));

const messengerReplacement = `{/* MESSENGER ACTIVE USERS DROPDOWN */}
          <HeaderMessengerWidget
            isMiniWidgetOpen={isMiniWidgetOpen}
            setIsMiniWidgetOpen={setIsMiniWidgetOpen}
            filteredUsers={filteredUsers}
            filteredGroups={filteredGroups}
            canCreateGroup={canCreateGroup}
            setIsCreateGroupOpen={setIsCreateGroupOpen}
            isSSR={isSSR}
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            chatCategory={chatCategory}
            latestMessages={latestMessages}
            currentUser={currentUser}
            readTimes={readTimes}
            markAsRead={markAsRead}
            onOpenTicketChat={onOpenTicketChat}
            formatMsgTime={formatMsgTime}
            getUserAvatarColor={getUserAvatarColor}
          />
        </div>`;

content = content.substring(0, messStartIndex) + messengerReplacement + '\n\n        ' + content.substring(messEndIndex + 6);

// 2. Notification Replacement
const notifStartStr = '{/* NOTIFICATION CENTER DROPDOWN PANEL (Matches UI Mockup) */}';
const profileStartStr = '{/* COLLAPSIBLE USER PROFILE */}';
const notifStartIndex = content.indexOf(notifStartStr);
const notifEndIndex = content.lastIndexOf('</div>', content.indexOf(profileStartStr));

const notifReplacement = `{/* NOTIFICATION CENTER DROPDOWN PANEL (Matches UI Mockup) */}
          <HeaderNotificationWidget
            isNotificationOpen={isNotificationOpen}
            setIsNotificationOpen={setIsNotificationOpen}
            unreadNotificationsCount={unreadNotificationsCount}
            isSSR={isSSR}
            permissionStatus={permissionStatus}
            handleRequestPermission={handleRequestPermission}
            onMarkAllNotificationsRead={onMarkAllNotificationsRead}
            cleanNotifications={cleanNotifications}
            handleClickNotificationItem={handleClickNotificationItem}
            getNotificationVisuals={getNotificationVisuals}
            formatTimeAgo={formatTimeAgo}
          />
        </div>`;

content = content.substring(0, notifStartIndex) + notifReplacement + '\n\n        ' + content.substring(notifEndIndex + 6);

// 3. Add Imports
content = content.replace("import ProfileSettingsModal from './ProfileSettingsModal';", "import HeaderMessengerWidget from './HeaderMessengerWidget';\nimport HeaderNotificationWidget from './HeaderNotificationWidget';\nimport ProfileSettingsModal from './ProfileSettingsModal';");

fs.writeFileSync(headerPath, content);
console.log("Refactored Header.jsx successfully!");
