// Two languages: English and Marathi. Missing Marathi falls back to English.

import { store } from './store.js';

const S = {
  tagline: { en: 'Walk in. Meet your town.', mr: 'आत या. आपल्या गावाला भेटा.' },
  intro_ghost: { en: 'A walkable Panvel, built from its real streets. Look around freely. Members are let in by invite.', mr: 'खऱ्या रस्त्यांवरून उभं केलेलं, चालत फिरण्याजोगं पनवेल. मोकळेपणाने फिरा. सदस्यांना आमंत्रणाने प्रवेश मिळतो.' },
  intro_member: { en: 'Welcome back, {name}. People will see you walk in.', mr: 'पुन्हा स्वागत, {name}. तुम्ही आत आलेले लोकांना दिसेल.' },
  enter: { en: 'CHALA PANVEL ▸', mr: 'चला पनवेल ▸' },
  loading: { en: 'Building the town…', mr: 'गाव उभं करतोय…' },

  // who is around
  looking: { en: 'Looking for people…', mr: 'माणसं शोधतोय…' },
  people_none: { en: 'Panvelkars drop by', mr: 'पनवेलकर येत-जात असतात' },
  people_one: { en: '1 person here', mr: 'इथे १ जण' },
  people_n: { en: '{n} people here', mr: 'इथे {n} जण' },
  people_near: { en: '{n} near', mr: '{n} जवळ' },
  people_title: { en: 'IN PANVEL NOW', mr: 'आत्ता पनवेलमध्ये' },
  people_sub: { en: 'Pick someone to go and meet them.', mr: 'कुणाला भेटायचं ते निवडा.' },
  people_empty: { en: 'Panvelkars drop by through the day. Whoever walks in shows up here.', mr: 'पनवेलकर दिवसभर येत-जात असतात. जो आत येईल तो इथे दिसेल.' },
  near_toast: { en: '{name} is nearby', mr: '{name} जवळच आहेत' },
  member_since: { en: 'Member since {when}', mr: '{when} पासून सदस्य' },
  away: { en: '{d} m away', mr: '{d} मी. दूर' },
  away_km: { en: '{d} km away', mr: '{d} किमी दूर' },
  go_to: { en: 'GO TO {name}', mr: '{name} कडे चला' },
  right_here: { en: 'They are right here. Say hello.', mr: 'ते इथेच आहेत. नमस्कार म्हणा.' },
  hide: { en: 'Hide this person', mr: 'ही व्यक्ती लपवा' },
  hide_sure: { en: 'Hide {name}? You will no longer see or hear them on this device.', mr: '{name} यांना लपवायचं? या डिव्हाइसवर ते तुम्हाला दिसणार किंवा ऐकू येणार नाहीत.' },
  hidden: { en: 'Hidden.', mr: 'लपवलं.' },
  report: { en: 'Report this person', mr: 'या व्यक्तीबद्दल कळवा' },

  // talking
  you: { en: 'You', mr: 'तुम्ही' },
  say_ph: { en: 'Say something · {n} nearby', mr: 'काहीतरी बोला · {n} जवळ' },
  say_ph_one: { en: 'Say something · 1 nearby', mr: 'काहीतरी बोला · १ जवळ' },
  say_ph_none: { en: 'Say something…', mr: 'काहीतरी बोला…' },
  to_title: { en: 'SAY IT TO', mr: 'कुणाला सांगायचं' },
  to_near: { en: 'People nearby', mr: 'जवळचे लोक' },
  to_near_none: { en: 'within 60 m', mr: '६० मी. आत' },
  to_town: { en: 'Everyone in Panvel', mr: 'पनवेलमधले सगळे' },
  to_private: { en: 'private', mr: 'खाजगी' },
  to_tip: { en: 'To write to one person, tap them and choose Message privately.', mr: 'एका व्यक्तीला लिहायला, त्यांच्यावर टॅप करा आणि खाजगी संदेश निवडा.' },
  say_town: { en: 'Say something to everyone in Panvel', mr: 'पनवेलमधल्या सगळ्यांना काहीतरी सांगा' },
  say_dm: { en: 'Private message to {name}', mr: '{name} यांना खाजगी संदेश' },
  say_dm_gone: { en: '{name} is not here now', mr: '{name} आत्ता इथे नाहीत' },
  not_here: { en: '{name} is not here now.', mr: '{name} आत्ता इथे नाहीत.' },
  dm_note: { en: 'Private messages are not secret. Keep them kind and useful.', mr: 'खाजगी संदेश गुप्त नसतात. ते चांगले आणि उपयोगी ठेवा.' },
  town_note: { en: 'Every member in Panvel sees this.', mr: 'पनवेलमधल्या प्रत्येक सदस्याला हे दिसतं.' },
  msg_private: { en: 'MESSAGE PRIVATELY', mr: 'खाजगी संदेश' },
  slow_down: { en: 'One moment, then say it again.', mr: 'एक क्षण थांबा, मग पुन्हा बोला.' },
  connecting: { en: 'Walking you in…', mr: 'तुम्हाला आत आणतोय…' },
  reconnecting: { en: 'Lost the connection. Trying again…', mr: 'संपर्क तुटला. पुन्हा प्रयत्न करतोय…' },
  relay_down: { en: 'Cannot reach the others right now. Still trying.', mr: 'आत्ता इतरांपर्यंत पोहोचता येत नाही. प्रयत्न सुरू आहे.' },

  // ghosts and invites
  ghost_name: { en: 'GHOST', mr: 'भूत' },
  ghost_line: { en: 'You are a ghost. People cannot see you.', mr: 'तुम्ही भूत आहात. तुम्ही लोकांना दिसत नाही.' },
  come_in: { en: 'COME IN', mr: 'आत या' },
  invite_title: { en: 'COME IN', mr: 'आत या' },
  invite_sub: { en: 'Members are seen by others and can talk. Every member comes in by invite.', mr: 'सदस्य इतरांना दिसतात आणि बोलू शकतात. प्रत्येक सदस्य आमंत्रणाने आत येतो.' },
  have_code: { en: 'I HAVE AN INVITE CODE', mr: 'माझ्याकडे आमंत्रण कोड आहे' },
  code_ph: { en: 'Paste your invite link or code', mr: 'तुमची आमंत्रण लिंक किंवा कोड इथे चिकटवा' },
  code_shape: { en: 'That does not look like an invite. Copy the whole link from your invite message.', mr: 'हे आमंत्रण वाटत नाही. आमंत्रणाच्या संदेशातली पूर्ण लिंक कॉपी करा.' },
  code_pubkey: { en: 'That is a reviewer key, not an invite. Invites are made on the reviewer page and sent as a link.', mr: 'ही परीक्षकाची की आहे, आमंत्रण नाही. आमंत्रणं परीक्षकाच्या पानावर बनतात आणि लिंक म्हणून पाठवली जातात.' },
  code_unknown: { en: 'This code was not made by a reviewer of this town.', mr: 'हा कोड या गावाच्या परीक्षकाने दिलेला नाही.' },
  code_revoked: { en: 'This invite has been withdrawn.', mr: 'हे आमंत्रण मागे घेतलं आहे.' },
  link_bad: { en: 'That invite link did not work. Ask for a new one.', mr: 'ती आमंत्रण लिंक चालली नाही. नवी मागा.' },
  link_revoked: { en: 'That invite has been withdrawn.', mr: 'ते आमंत्रण मागे घेतलं आहे.' },
  no_code: { en: 'I DO NOT HAVE ONE YET', mr: 'माझ्याकडे अजून नाही' },
  ask_sub: { en: 'A reviewer reads every request. If you are let in, a personal code arrives by email.', mr: 'परीक्षक प्रत्येक विनंती वाचतो. प्रवेश मिळाल्यास तुमचा स्वतःचा कोड ईमेलने येतो.' },
  ask_follow: { en: 'Follow @peopleofpanvel on Instagram and send a DM asking for an invite. Your personal link comes back in the DM. Open it and you are in.', mr: 'Instagram वर @peopleofpanvel ला फॉलो करा आणि आमंत्रणासाठी DM करा. तुमची स्वतःची लिंक DM मध्ये येईल. ती उघडली की तुम्ही आत.' },
  ask_open: { en: 'OPEN INSTAGRAM', mr: 'INSTAGRAM उघडा' },
  ask_closed: { en: 'Invites are sent by email by the People of Panvel team. Asking from here opens soon.', mr: 'आमंत्रणं People of Panvel टीम ईमेलने पाठवते. इथून मागण्याची सोय लवकरच सुरू होईल.' },
  ask_name: { en: 'YOUR NAME', mr: 'तुमचं नाव' },
  ask_name_ph: { en: 'As people should see it', mr: 'लोकांना दिसावं तसं' },
  ask_why: { en: 'YOU AND PANVEL', mr: 'तुम्ही आणि पनवेल' },
  ask_why_ph: { en: 'I grew up near the talav…', mr: 'मी तलावाजवळ वाढलो…' },
  ask_note: { en: 'Opens your email, ready to send.', mr: 'पाठवायला तयार ईमेल उघडतो.' },
  ask_send: { en: 'ASK FOR AN INVITE', mr: 'आमंत्रण मागा' },
  almost_in: { en: 'Your invite is ready.', mr: 'तुमचं आमंत्रण तयार आहे.' },
  walk_in: { en: 'WALK IN', mr: 'आत चला' },
  welcome_name: { en: 'Welcome, {name}', mr: 'स्वागत, {name}' },
  rule_1: { en: 'From now on, everyone here can see your name and where you walk. That includes ghosts who are only looking.', mr: 'आतापासून इथल्या प्रत्येकाला तुमचं नाव आणि तुम्ही कुठे फिरता ते दिसेल. नुसतं बघणाऱ्या भुतांनाही.' },
  rule_2: { en: 'What you say nearby is heard within about 60 metres. You can also write to everyone in town, or privately to one person.', mr: 'तुम्ही जवळ जे बोलता ते सुमारे ६० मीटरपर्यंत ऐकू जातं. तुम्ही गावातल्या सगळ्यांना, किंवा एका व्यक्तीला खाजगीत, लिहू शकता.' },
  rule_4: { en: 'Nothing you write here is secret, private messages included. Messages can be checked to keep everyone safe. Write only what is kind and useful.', mr: 'इथे तुम्ही लिहिलेलं काहीही गुप्त नसतं, खाजगी संदेशसुद्धा. सगळ्यांच्या सुरक्षिततेसाठी संदेश तपासले जाऊ शकतात. जे चांगलं आणि उपयोगी आहे तेच लिहा.' },
  rule_3: { en: 'This invite is yours alone. Be the neighbour you would like to have.', mr: 'हे आमंत्रण फक्त तुमचं आहे. तुम्हाला हवासा वाटेल असे शेजारी व्हा.' },
  elsewhere: { en: 'Your invite is open on another device.', mr: 'तुमचं आमंत्रण दुसऱ्या डिव्हाइसवर उघडं आहे.' },
  use_here: { en: 'USE IT HERE', mr: 'इथे वापरा' },
  leave: { en: 'Forget my invite on this device', mr: 'या डिव्हाइसवरून माझं आमंत्रण काढा' },
  leave_sure: { en: 'Forget your invite here? You will be a ghost on this device until you use the code again.', mr: 'इथून आमंत्रण काढायचं? कोड पुन्हा वापरेपर्यंत या डिव्हाइसवर तुम्ही भूत असाल.' },
  left: { en: 'You are a ghost again.', mr: 'तुम्ही पुन्हा भूत झालात.' },

  // getting around
  map_title: { en: 'PANVEL', mr: 'पनवेल' },
  map_sub: { en: 'Tap anywhere to walk there. Tap a rickshaw or a person to ride there.', mr: 'चालत जायला कुठेही टॅप करा. रिक्षाने जायला रिक्षावर किंवा व्यक्तीवर टॅप करा.' },
  marker: { en: 'Walking there', mr: 'तिथे चाललोय' },
  riding: { en: 'RIDING TO', mr: 'निघालो' },
  no_route: { en: 'No street leads there.', mr: 'तिथे जायला रस्ता नाही.' },
  walk_stuck: { en: 'Something is in the way. Walk the rest yourself.', mr: 'वाटेत काहीतरी आहे. पुढे स्वतः चाला.' },
  edge: { en: 'That is as far as this map goes, for now.', mr: 'सध्या नकाशा इथपर्यंतच आहे.' },
  click_look: { en: 'CLICK TO LOOK AROUND', mr: 'इकडेतिकडे बघायला क्लिक करा' },
  hint_keys: { en: 'W A S D to walk. Drag to look around.', mr: 'चालायला W A S D. बघायला ओढा.' },
  hint_touch: { en: 'Left thumb walks. Right thumb looks.', mr: 'डावा अंगठा चालतो. उजवा अंगठा बघतो.' },

  k_walk: { en: 'WALK', mr: 'चाला' },
  k_run: { en: 'RUN', mr: 'धावा' },
  k_look: { en: 'LOOK', mr: 'बघा' },
  k_map: { en: 'MAP', mr: 'नकाशा' },
  k_people: { en: 'PEOPLE', mr: 'माणसं' },
  k_talk: { en: 'TALK', mr: 'बोला' },

  coach_title: { en: 'HOW TO MOVE', mr: 'कसं फिरायचं' },
  coach_walk: { en: 'Drag here to walk', mr: 'चालायला इथे ओढा' },
  coach_left: { en: 'left side of the screen', mr: 'स्क्रीनची डावी बाजू' },
  coach_look: { en: 'Drag here to look around', mr: 'बघायला इथे ओढा' },
  coach_right: { en: 'right side of the screen', mr: 'स्क्रीनची उजवी बाजू' },
  coach_tap: { en: 'Or just tap a spot on the ground. You walk there.', mr: 'किंवा जमिनीवर एखाद्या जागी टॅप करा. तुम्ही तिथे चालत जाल.' },
  coach_keys: { en: 'Walk with the keys', mr: 'कीबोर्डने चाला' },
  coach_drag: { en: 'Drag to look around', mr: 'बघायला ओढा' },
  coach_scroll: { en: 'scroll to zoom', mr: 'झूमसाठी स्क्रोल करा' },
  coach_click: { en: 'Or just click a spot on the ground. You walk there.', mr: 'किंवा जमिनीवर एखाद्या जागी क्लिक करा. तुम्ही तिथे चालत जाल.' },
  got_it: { en: 'GOT IT', mr: 'समजलं' },

  // menu
  look_title: { en: 'MY LOOK', mr: 'माझं रूप' },
  f_garb: { en: 'CLOTHES', mr: 'कपडे' },
  f_top: { en: 'COLOUR', mr: 'रंग' },
  f_skin: { en: 'SKIN', mr: 'त्वचा' },
  f_hair: { en: 'HAIR', mr: 'केस' },
  save: { en: 'SAVE', mr: 'साठवा' },
  view: { en: 'VIEW', mr: 'दृश्य' },
  view_fp: { en: 'MY EYES', mr: 'माझे डोळे' },
  view_tp: { en: 'FROM BEHIND', mr: 'मागून' },
  sound: { en: 'SOUND', mr: 'आवाज' },
  quality: { en: 'GRAPHICS', mr: 'ग्राफिक्स' },
  on: { en: 'ON', mr: 'चालू' },
  off: { en: 'OFF', mr: 'बंद' },
  about: { en: 'The streets, lakes, rail lines and buildings come from OpenStreetMap. Ghosts send nothing about themselves. Members are seen while they are here. Messages are not secret and can be checked to keep people safe.', mr: 'रस्ते, तलाव, रेल्वे आणि इमारती OpenStreetMap मधून आहेत. भुतं स्वतःबद्दल काहीही पाठवत नाहीत. सदस्य इथे असेपर्यंत दिसतात. संदेश गुप्त नसतात आणि लोकांच्या सुरक्षिततेसाठी तपासले जाऊ शकतात.' },
  how_keys: { en: 'W A S D walks, Shift runs, drag to look, scroll to zoom. Enter types, M opens the map, P shows people, V changes the view.', mr: 'W A S D ने चाला, Shift ने धावा, ओढून बघा, स्क्रोलने झूम करा. Enter ने लिहा, M ने नकाशा, P ने माणसं, V ने दृश्य बदला.' },
  how_touch: { en: 'Left thumb walks, right thumb looks. Tap the round map to see the whole town.', mr: 'डावा अंगठा चालतो, उजवा बघतो. पूर्ण गाव बघायला गोल नकाशावर टॅप करा.' },
};

// English unless the visitor picks Marathi in the menu. The Marathi wording has not been checked by a
// native reader yet, so it is never chosen for anyone automatically.
let lang = store.get('lang') === 'mr' ? 'mr' : 'en';
const listeners = new Set();

export const getLang = () => lang;
export function setLang(l) {
  lang = l;
  store.set('lang', l);
  document.documentElement.lang = l;
  listeners.forEach((fn) => fn(l));
}
export const onLang = (fn) => (listeners.add(fn), () => listeners.delete(fn));

/** Translate a UI key, with {placeholders}. */
export function t(key, vars) {
  const e = S[key];
  let s = e ? e[lang] || e.en : key;
  if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
}
/** The English wording, whatever language is chosen. Used on the first screen, which is kept in English. */
export function en(key, vars) {
  let s = S[key] ? S[key].en : key;
  if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
}
/** Pick the current language from a { en, mr } object. */
export const L = (o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] || o.en || '');
