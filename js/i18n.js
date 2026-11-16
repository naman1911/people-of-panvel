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
  people_none: { en: 'No one else here', mr: 'इथे दुसरं कुणी नाही' },
  people_one: { en: '1 person here', mr: 'इथे १ जण' },
  people_n: { en: '{n} people here', mr: 'इथे {n} जण' },
  people_near: { en: '{n} near', mr: '{n} जवळ' },
  people_title: { en: 'IN PANVEL NOW', mr: 'आत्ता पनवेलमध्ये' },
  people_sub: { en: 'Pick someone to go and meet them.', mr: 'कुणाला भेटायचं ते निवडा.' },
  people_empty: { en: 'Nobody else is here right now. Members show up here when they walk in.', mr: 'आत्ता इथे दुसरं कुणी नाही. सदस्य आत आले की इथे दिसतील.' },
  near_toast: { en: '{name} is nearby', mr: '{name} जवळच आहेत' },
  member_since: { en: 'Member since {when}', mr: '{when} पासून सदस्य' },
  away: { en: '{d} m away', mr: '{d} मी. दूर' },
  away_km: { en: '{d} km away', mr: '{d} किमी दूर' },
  go_to: { en: 'GO TO {name}', mr: '{name} कडे चला' },
  right_here: { en: 'They are right here. Say hello.', mr: 'ते इथेच आहेत. नमस्कार म्हणा.' },
  hide: { en: 'Hide this person', mr: 'ही व्यक्ती लपवा' },
  hide_sure: { en: 'Hide {name}? You will no longer see or hear them on this device.', mr: '{name} यांना लपवायचं? या डिव्हाइसवर ते तुम्हाला दिसणार किंवा ऐकू येणार नाहीत.' },
  hidden: { en: 'Hidden.', mr: 'लपवलं.' },
  report: { en: 'Report to the reviewer', mr: 'परीक्षकाला कळवा' },

  // talking
  you: { en: 'You', mr: 'तुम्ही' },
  say_ph: { en: 'Say something · {n} nearby', mr: 'काहीतरी बोला · {n} जवळ' },
  say_ph_one: { en: 'Say something · 1 nearby', mr: 'काहीतरी बोला · १ जवळ' },
  say_ph_none: { en: 'No one nearby yet', mr: 'अजून जवळ कुणी नाही' },
  slow_down: { en: 'One moment, then say it again.', mr: 'एक क्षण थांबा, मग पुन्हा बोला.' },
  connecting: { en: 'Walking you in…', mr: 'तुम्हाला आत आणतोय…' },
  reconnecting: { en: 'Lost the connection. Trying again…', mr: 'संपर्क तुटला. पुन्हा प्रयत्न करतोय…' },
  relay_down: { en: 'Cannot reach the others right now. Still trying.', mr: 'आत्ता इतरांपर्यंत पोहोचता येत नाही. प्रयत्न सुरू आहे.' },

  // ghosts and invites
  ghost_name: { en: 'GHOST', mr: 'भूत' },
  ghost_line: { en: 'You are a ghost. People cannot see you.', mr: 'तुम्ही भूत आहात. तुम्ही लोकांना दिसत नाही.' },
  come_in: { en: 'COME IN', mr: 'आत या' },
  invite_title: { en: 'COME IN', mr: 'आत या' },
  invite_sub: { en: 'Members are seen by others and can talk to people nearby. Every member is let in by a reviewer.', mr: 'सदस्य इतरांना दिसतात आणि जवळच्या लोकांशी बोलू शकतात. प्रत्येक सदस्याला परीक्षक आत घेतो.' },
  have_code: { en: 'I HAVE AN INVITE CODE', mr: 'माझ्याकडे आमंत्रण कोड आहे' },
  code_ph: { en: 'Paste the code or the link from your email', mr: 'ईमेलमधला कोड किंवा लिंक इथे चिकटवा' },
  code_shape: { en: 'That does not look like an invite code. Copy the whole code or link from the email.', mr: 'हा आमंत्रण कोड वाटत नाही. ईमेलमधला पूर्ण कोड किंवा लिंक कॉपी करा.' },
  code_pubkey: { en: 'That is a reviewer key, not an invite code. Invites are made on the reviewer page and arrive by email.', mr: 'ही परीक्षकाची की आहे, आमंत्रण कोड नाही. आमंत्रणं परीक्षकाच्या पानावर बनतात आणि ईमेलने येतात.' },
  code_unknown: { en: 'This code was not made by a reviewer of this town.', mr: 'हा कोड या गावाच्या परीक्षकाने दिलेला नाही.' },
  code_revoked: { en: 'This invite has been withdrawn.', mr: 'हे आमंत्रण मागे घेतलं आहे.' },
  link_bad: { en: 'That invite link did not work. Ask the reviewer for a new one.', mr: 'ती आमंत्रण लिंक चालली नाही. परीक्षकाकडून नवी मागा.' },
  link_revoked: { en: 'That invite has been withdrawn.', mr: 'ते आमंत्रण मागे घेतलं आहे.' },
  no_code: { en: 'I DO NOT HAVE ONE YET', mr: 'माझ्याकडे अजून नाही' },
  ask_sub: { en: 'A reviewer reads every request. If you are let in, a personal code arrives by email.', mr: 'परीक्षक प्रत्येक विनंती वाचतो. प्रवेश मिळाल्यास तुमचा स्वतःचा कोड ईमेलने येतो.' },
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
  rule_2: { en: 'What you type is heard by people within about 60 metres. Nothing is saved. When you leave, it is gone.', mr: 'तुम्ही जे लिहिता ते सुमारे ६० मीटरमधल्या लोकांना ऐकू जातं. काहीही साठवलं जात नाही. तुम्ही गेलात की ते जातं.' },
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
  about: { en: 'The streets, lakes, rail lines and buildings come from OpenStreetMap. Ghosts send nothing about themselves. Members are seen and heard only while they are here, and nothing is kept.', mr: 'रस्ते, तलाव, रेल्वे आणि इमारती OpenStreetMap मधून आहेत. भुतं स्वतःबद्दल काहीही पाठवत नाहीत. सदस्य इथे असेपर्यंतच दिसतात आणि ऐकू येतात, आणि काहीही ठेवलं जात नाही.' },
  how_keys: { en: 'W A S D walks, Shift runs, drag to look, scroll to zoom. Enter types, M opens the map, P shows people, V changes the view.', mr: 'W A S D ने चाला, Shift ने धावा, ओढून बघा, स्क्रोलने झूम करा. Enter ने लिहा, M ने नकाशा, P ने माणसं, V ने दृश्य बदला.' },
  how_touch: { en: 'Left thumb walks, right thumb looks. Tap the round map to see the whole town.', mr: 'डावा अंगठा चालतो, उजवा बघतो. पूर्ण गाव बघायला गोल नकाशावर टॅप करा.' },
};

let lang = store.get('lang') || ((navigator.language || 'en').startsWith('mr') ? 'mr' : 'en');
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
/** Pick the current language from a { en, mr } object. */
export const L = (o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] || o.en || '');
