// Two languages: English and Marathi. Missing Marathi falls back to English.

import { store } from './store.js';

const S = {
  tagline: { en: 'Wander. Meet. Find your katta.', mr: 'फिरा. भेटा. आपला कट्टा शोधा.' },
  intro_sub: { en: 'A walkable Panvel built from the town’s real streets and buildings.', mr: 'पनवेलच्या खऱ्या रस्त्यांवरून आणि इमारतींवरून उभं केलेलं, चालत फिरण्याजोगं पनवेल.' },
  intro_guest: { en: 'You arrive as a guest. Make your own character whenever you like.', mr: 'तुम्ही पाहुणे म्हणून येता. हवं तेव्हा स्वतःचं पात्र बनवा.' },
  enter: { en: 'CHALA PANVEL ▸', mr: 'चला पनवेल ▸' },
  open_source: { en: 'OPEN SOURCE · REAL MAP', mr: 'ओपन सोर्स · खरा नकाशा' },
  loading: { en: 'Building the town…', mr: 'गाव उभं करतोय…' },
  time_in: { en: 'Panvel time', mr: 'पनवेलची वेळ' },
  monsoon: { en: 'Monsoon', mr: 'पावसाळा' },
  clear: { en: 'Clear', mr: 'निरभ्र' },
  realtime: { en: 'Live', mr: 'आत्ता' },

  find: { en: 'FIND SOMEONE', mr: 'कुणाला शोधा' },
  travel: { en: 'RICKSHAW', mr: 'रिक्षा' },
  darshan: { en: 'DARSHAN CARD', mr: 'दर्शन कार्ड' },
  katta: { en: 'MY KATTA', mr: 'माझा कट्टा' },
  me: { en: 'ME', mr: 'मी' },
  help: { en: 'HELP', mr: 'मदत' },
  guest_title: { en: 'YOU’RE A GUEST', mr: 'तुम्ही पाहुणे आहात' },
  guest_sub: { en: 'Give yourself a name and a look.', mr: 'स्वतःला नाव आणि रूप द्या.' },
  make_me: { en: 'MAKE MY CHARACTER', mr: 'माझं पात्र बनवा' },
  people_count: { en: '{n} Panvelkars · met {m}', mr: '{n} पनवेलकर · भेटले {m}' },

  k_move: { en: 'MOVE', mr: 'चाला' },
  k_run: { en: 'RUN', mr: 'धावा' },
  k_look: { en: 'DRAG TO LOOK', mr: 'ओढून पाहा' },
  k_zoom: { en: 'ZOOM', mr: 'झूम' },
  k_use: { en: 'INTERACT', mr: 'वापरा' },
  k_close: { en: 'CLOSE', mr: 'बंद' },

  meet: { en: 'MEET {name}', mr: '{name} यांना भेटा' },
  drive: { en: 'DRIVE THE RICKSHAW', mr: 'रिक्षा चालवा' },
  leave_auto: { en: 'GET OUT', mr: 'खाली उतरा' },
  sit: { en: 'SIT DOWN', mr: 'बसा' },
  stand_up: { en: 'STAND UP', mr: 'उठा' },
  sit_chai: { en: 'SIT FOR A CUTTING', mr: 'कटिंग घ्यायला बसा' },
  read_wall: { en: 'READ THE NOTICE BOARD', mr: 'फलक वाचा' },
  catch_rick: { en: 'TAKE A SHARE RICKSHAW', mr: 'शेअर रिक्षा पकडा' },
  call_stray: { en: 'CALL {name} ALONG', mr: '{name}ला सोबत घ्या' },
  send_stray: { en: 'SEND {name} HOME', mr: '{name}ला घरी पाठवा' },

  say_namaskar: { en: 'SAY NAMASKAR', mr: 'नमस्कार करा' },
  add_katta: { en: 'ADD TO MY KATTA', mr: 'कट्ट्यात घ्या' },
  in_katta: { en: 'IN YOUR KATTA ✓', mr: 'कट्ट्यात आहेत ✓' },
  from: { en: 'FROM', mr: 'मूळ गाव' },
  since: { en: 'IN PANVEL SINCE', mr: 'पनवेलमध्ये' },
  spot: { en: 'FAVOURITE SPOT', mr: 'आवडती जागा' },
  speaks: { en: 'SPEAKS', mr: 'भाषा' },
  fictional: { en: 'A fictional resident, written for this project.', mr: 'हे एक काल्पनिक पात्र आहे, या प्रकल्पासाठी लिहिलेलं.' },
  met_toast: { en: 'You met {name}', mr: '{name} यांची भेट झाली' },

  stamp_toast: { en: 'PANVEL DARSHAN · stamp collected: {name}', mr: 'पनवेल दर्शन · शिक्का मिळाला: {name}' },
  darshan_title: { en: 'PANVEL DARSHAN', mr: 'पनवेल दर्शन' },
  darshan_sub: { en: 'Walk up to a landmark to stamp your card.', mr: 'एखाद्या ठिकाणी चालत जा, कार्डावर शिक्का मिळेल.' },
  stamps_n: { en: '{n} of {t} stamps', mr: '{t} पैकी {n} शिक्के' },
  locked: { en: 'Not visited yet', mr: 'अजून गेला नाहीत' },
  did_you_know: { en: 'DID YOU KNOW?', mr: 'माहीत आहे का?' },
  show_me: { en: 'SHOW ME', mr: 'दाखवा' },

  where_to: { en: 'WHERE TO?', mr: 'कुठे जायचं?' },
  travel_sub: { en: 'Share rickshaw, ₹20 a seat. Imaginary rupees.', mr: 'शेअर रिक्षा, सीटला ₹२०. काल्पनिक रुपये.' },
  you_are_here: { en: 'YOU ARE HERE', mr: 'तुम्ही इथे आहात' },
  coming_soon: { en: 'COMING SOON', mr: 'लवकरच' },
  go: { en: 'GO ▸', mr: 'चला ▸' },
  riding: { en: 'SHARE RICKSHAW TO', mr: 'शेअर रिक्षा →' },
  arrived: { en: 'You’re at {name}', mr: 'तुम्ही {name} इथे आलात' },

  find_ph: { en: 'Name, work, interest, area…', mr: 'नाव, काम, आवड, भाग…' },
  find_sub: { en: 'Search, and we’ll walk you over.', mr: 'शोधा, आम्ही तुम्हाला तिथे नेतो.' },
  take_me: { en: 'TAKE ME ▸', mr: 'तिथे न्या ▸' },
  nobody: { en: 'Nobody matches that yet.', mr: 'असं कुणी सापडलं नाही.' },
  away: { en: '{d} m away', mr: '{d} मी. दूर' },

  katta_title: { en: 'MY KATTA', mr: 'माझा कट्टा' },
  katta_empty: { en: 'Nobody here yet. Go say namaskar to someone.', mr: 'अजून कुणी नाही. कुणाला तरी नमस्कार करा.' },
  katta_met: { en: 'PEOPLE YOU’VE MET', mr: 'भेटलेली माणसं' },
  katta_fav: { en: 'YOUR KATTA', mr: 'तुमचा कट्टा' },

  me_title: { en: 'YOUR CHARACTER', mr: 'तुमचं पात्र' },
  me_sub: { en: 'A character is a vibe, not a job. Saved only in this browser.', mr: 'पात्र म्हणजे एक मूड, नोकरी नव्हे. फक्त याच ब्राउझरमध्ये साठवलं जातं.' },
  f_name: { en: 'NAME', mr: 'नाव' },
  f_name_ph: { en: 'A nickname is fine', mr: 'टोपणनाव चालेल' },
  f_status: { en: 'A LINE ABOVE YOUR HEAD', mr: 'डोक्यावरची ओळ' },
  f_status_ph: { en: 'Chaha ghenar ka?', mr: 'चहा घेणार का?' },
  f_garb: { en: 'CLOTHES', mr: 'कपडे' },
  f_top: { en: 'COLOUR', mr: 'रंग' },
  f_skin: { en: 'SKIN', mr: 'त्वचा' },
  f_hair: { en: 'HAIR', mr: 'केस' },
  save: { en: 'SAVE', mr: 'साठवा' },
  saved: { en: 'Saved. Welcome to Panvel, {name}.', mr: 'साठवलं. पनवेलमध्ये स्वागत, {name}.' },
  add_me: { en: 'ADD ME TO PANVEL FOR REAL', mr: 'मला खरोखर पनवेलमध्ये घ्या' },
  add_me_sub: { en: 'Opens a GitHub issue with your card, so a maintainer can add you to the town for everyone.', mr: 'तुमच्या कार्डासह GitHub issue उघडतो; मेंटेनर तुम्हाला सगळ्यांसाठी गावात घालू शकतो.' },

  wall_title: { en: 'KATTA BOARD', mr: 'कट्टा फलक' },
  wall_sub: { en: 'Plans in Panvel start with a notice on a wall.', mr: 'पनवेलमध्ये बेत फलकावरच्या सूचनेने सुरू होतात.' },
  pin: { en: 'PIN A NOTICE', mr: 'सूचना लावा' },
  pin_note: { en: 'Your notices are saved in this browser only.', mr: 'तुमच्या सूचना फक्त या ब्राउझरमध्ये राहतात.' },
  p_title: { en: 'WHAT', mr: 'काय' },
  p_when: { en: 'WHEN / WHERE', mr: 'केव्हा / कुठे' },
  p_by: { en: 'FROM', mr: 'कडून' },
  pinned: { en: 'Pinned to the board.', mr: 'फलकावर लावली.' },

  chai_title: { en: 'CUTTING CHAI', mr: 'कटिंग चहा' },
  chai_sub: { en: 'Sit a while. The katta talks.', mr: 'जरा बसा. कट्टा बोलतो.' },

  first_title: { en: 'FIRST TIME IN PANVEL?', mr: 'पनवेलमध्ये पहिल्यांदाच?' },
  first_sub: { en: 'Five small things. Pick one and we’ll point the way.', mr: 'पाच छोट्या गोष्टी. एक निवडा, आम्ही वाट दाखवतो.' },
  m_meet: { en: 'Say namaskar to someone', mr: 'कुणाला तरी नमस्कार करा' },
  m_chai: { en: 'Sit for a cutting chai', mr: 'कटिंग चहा घ्यायला बसा' },
  m_auto: { en: 'Drive a rickshaw', mr: 'रिक्षा चालवा' },
  m_wall: { en: 'Read a notice board', mr: 'फलक वाचा' },
  m_stamp: { en: 'Collect a Darshan stamp', mr: 'दर्शनाचा शिक्का मिळवा' },
  dont_show: { en: 'DON’T SHOW AGAIN', mr: 'पुन्हा दाखवू नका' },
  look_first: { en: 'LOOK AROUND FIRST', mr: 'आधी फिरून बघतो' },
  guide_set: { en: 'Follow the marker: {d} m', mr: 'खुणेकडे चला: {d} मी.' },

  help_title: { en: 'HOW TO GET AROUND', mr: 'कसं फिरायचं' },
  about: { en: 'The streets, lakes, rail lines and building footprints come from OpenStreetMap. The residents are fictional. Nothing you do here leaves your browser.', mr: 'रस्ते, तलाव, रेल्वे आणि इमारतींचे आराखडे OpenStreetMap मधून घेतले आहेत. रहिवासी काल्पनिक आहेत. तुम्ही इथे जे करता ते तुमच्या ब्राउझरबाहेर जात नाही.' },
  quality: { en: 'GRAPHICS', mr: 'ग्राफिक्स' },
  sound: { en: 'SOUND', mr: 'आवाज' },
  on: { en: 'ON', mr: 'चालू' },
  off: { en: 'OFF', mr: 'बंद' },
  reset: { en: 'RESET MY PROGRESS', mr: 'माझी प्रगती पुसा' },
  edge: { en: 'That’s as far as this map goes, for now.', mr: 'सध्या नकाशा इथपर्यंतच आहे.' },
  welcome: { en: 'You’re on the south bank of Vadale Talav. Walk the promenade, find the tea stall, and take a rickshaw when your feet give up.', mr: 'तुम्ही वडाळे तलावाच्या दक्षिण काठावर आहात. काठाने फिरा, चहाची टपरी शोधा आणि पाय दुखले की रिक्षा पकडा.' },
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
