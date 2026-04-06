const fs = require('fs');

let content = fs.readFileSync('screens/DashboardScreen.js', 'utf-8');
content = content.replace(/#FAFAFA/ig, '#D5B893');
content = content.replace(/backgroundColor:\s*'#fff'/g, "backgroundColor: '#EAD8C5'");
content = content.replace(/#1a1a1a/ig, '#25344F');
content = content.replace(/#666/ig, '#6F4D38');
content = content.replace(/#888/ig, '#6F4D38');
content = content.replace(/#444/ig, '#6F4D38');
content = content.replace(/#333/ig, '#25344F');
content = content.replace(/#f0f0f0/ig, '#C6A57A');
content = content.replace(/#f8f8f8/ig, '#D5B893');

content = content.replace(/actionButtonMain: \{[\s\S]*?backgroundColor:\s*'#25344F'/g, m => m.replace('#25344F', '#632024'));
content = content.replace(/ootdBadge: \{[\s\S]*?backgroundColor:\s*'#25344F'/g, m => m.replace('#25344F', '#632024'));
content = content.replace(/<Ionicons name="checkmark-circle-outline" size=\{22\} color="#25344F" \/>/g, '<Ionicons name="checkmark-circle-outline" size={22} color="#632024" />');

fs.writeFileSync('screens/DashboardScreen.js', content);

let drawerContent = fs.readFileSync('screens/MainDrawer.js', 'utf-8');
drawerContent = drawerContent.replace(/#1a1a1a/ig, '#25344F');
drawerContent = drawerContent.replace(/#FAFAFA/ig, '#D5B893');
drawerContent = drawerContent.replace(/drawerActiveBackgroundColor:\s*'#25344F'/g, "drawerActiveBackgroundColor: '#632024'");
drawerContent = drawerContent.replace(/drawerInactiveTintColor:\s*'#333'/g, "drawerInactiveTintColor: '#6F4D38'");
drawerContent = drawerContent.replace(/#666/ig, '#6F4D38');
fs.writeFileSync('screens/MainDrawer.js', drawerContent);

console.log('Update Complete');
