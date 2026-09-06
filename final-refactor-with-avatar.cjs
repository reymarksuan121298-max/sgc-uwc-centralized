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
content = content.replace("import AgentMascotAvatar from '../chat/AgentMascotAvatar';", "import AgentMascotAvatar from '../chat/AgentMascotAvatar';\nimport HeaderMessengerWidget from './HeaderMessengerWidget';\nimport HeaderNotificationWidget from './HeaderNotificationWidget';");

// 4. Update Profile Icons to use avatar_url
const smallAvatarStr = `            <div className="w-8 h-8 rounded-full bg-[#002B66] text-[#FFD700] border-2 border-white shadow-xs flex items-center justify-center font-black text-xs font-mono shrink-0">
              {(currentUser?.full_name || currentUser?.username || 'U')[0].toUpperCase()}
            </div>`;
const smallAvatarReplacement = `            <div className="w-8 h-8 rounded-full bg-[#002B66] text-[#FFD700] border-2 border-white shadow-xs flex items-center justify-center font-black text-xs font-mono shrink-0 overflow-hidden">
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt="Profile" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
              ) : (
                (currentUser?.full_name || currentUser?.username || 'U')[0].toUpperCase()
              )}
            </div>`;
content = content.replace(smallAvatarStr, smallAvatarReplacement);

const largeAvatarStr = `                <div className="w-11 h-11 rounded-full bg-[#002B66] text-[#FFD700] border-2 border-[#FFD700]/50 shadow-sm flex items-center justify-center font-black text-base font-mono shrink-0">
                  {(currentUser?.full_name || currentUser?.username || 'U')[0].toUpperCase()}
                </div>`;
const largeAvatarReplacement = `                <div className="w-11 h-11 rounded-full bg-[#002B66] text-[#FFD700] border-2 border-[#FFD700]/50 shadow-sm flex items-center justify-center font-black text-base font-mono shrink-0 overflow-hidden">
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="Profile" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                  ) : (
                    (currentUser?.full_name || currentUser?.username || 'U')[0].toUpperCase()
                  )}
                </div>`;
content = content.replace(largeAvatarStr, largeAvatarReplacement);

fs.writeFileSync(headerPath, content);
console.log("Refactored Header.jsx and included avatar logic successfully!");
