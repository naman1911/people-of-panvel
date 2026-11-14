// The residents. Every one of them is FICTIONAL: a composite written for this
// project, not a portrait of a real person. To add a real Panvelkar (with
// their consent), see the README.
//
// at: [x, z] in map metres (snapped to the nearest free spot at load).
// mode: 'stand' | 'wander' (within r metres) | 'sit'.

const P = (id, o) => ({ id, r: 6, mode: 'stand', ...o });

export const PEOPLE = [
  P('baban', {
    name: { en: 'Baban Kaka', mr: 'बबन काका' }, role: { en: 'The Tapri Philosopher', mr: 'टपरीवरचा तत्त्वज्ञ' },
    at: [-322, -158], zone: 'talav', look: { woman: false, garb: 'shirt', top: '#f2efe6', bottom: '#5d6d7e', hairStyle: 'short', hair: '#8a8a88', acc: ['moustache', 'apron'], skin: '#a4683f' },
    status: { en: '☕ Cutting or full?', mr: '☕ कटिंग की फुल?' },
    tagline: { en: 'Every problem is half its size after one cutting.', mr: 'एका कटिंगनंतर प्रत्येक प्रश्न अर्धा होतो.' },
    from: { en: 'Panvel, born and brewed', mr: 'पनवेलचाच' }, since: { en: 'Always', mr: 'जन्मापासून' }, spot: { en: 'His own bench, obviously', mr: 'स्वतःचाच बाक' }, speaks: 'मराठी · हिंदी',
    story: {
      en: 'My father ran this stall when the lake had no railing and the road had no name. I have poured tea for three generations of morning walkers. I know who is getting married before the family does.',
      mr: 'तलावाला कठडा नव्हता आणि रस्त्याला नाव नव्हतं, तेव्हापासून वडिलांची ही टपरी. सकाळी फिरायला येणाऱ्यांच्या तीन पिढ्यांना मी चहा पाजलाय. कुणाचं लग्न ठरतंय ते घरच्यांच्या आधी मला कळतं.',
    },
    lines: [
      { en: 'Sit. The tea decides when you leave.', mr: 'बसा. केव्हा उठायचं ते चहा ठरवतो.' },
      { en: 'Less sugar? Then why come to me?', mr: 'साखर कमी? मग माझ्याकडे कशाला आलात?' },
      { en: 'Rain is coming. My knee says so.', mr: 'पाऊस येणार. माझा गुडघा सांगतोय.' },
    ],
    tags: 'tea chai tapri lake gossip',
  }),
  P('meera', {
    name: { en: 'Meera Iyer', mr: 'मीरा अय्यर' }, role: { en: 'The Talav Walker', mr: 'तलावाची फेरीवाली' },
    at: [-300, -150], mode: 'wander', r: 40, zone: 'talav', look: { woman: true, garb: 'salwar', top: '#00897b', bottom: '#f5f5f0', accent: '#f9a825', hairStyle: 'bun', hair: '#6b6b6b', acc: ['specs'] },
    status: { en: '🚶 Five rounds, then filter coffee', mr: '🚶 पाच फेऱ्या, मग फिल्टर कॉफी' },
    tagline: { en: 'Retired from the bank, not from counting.', mr: 'बँकेतून निवृत्त, मोजण्यातून नाही.' },
    from: { en: 'Palakkad, via Matunga', mr: 'पालक्काड, माटुंगामार्गे' }, since: '1994', spot: { en: 'The bench facing the temple', mr: 'देवळासमोरचा बाक' }, speaks: 'தமிழ் · मराठी · English',
    story: {
      en: 'We bought the flat here because Mumbai was too costly and Panvel had a lake. Thirty years on I speak Marathi to the vegetable seller and Tamil to my sister, and I count my rounds out loud so I cannot cheat.',
      mr: 'मुंबई परवडत नव्हती आणि पनवेलला तलाव होता, म्हणून इथे घर घेतलं. तीस वर्षांनंतर भाजीवाल्याशी मराठीत आणि बहिणीशी तमिळमध्ये बोलते. फसवणूक होऊ नये म्हणून फेऱ्या मोठ्याने मोजते.',
    },
    lines: [
      { en: 'That is round three. Or four. Walk with me.', mr: 'ही तिसरी फेरी. की चौथी? चला माझ्याबरोबर.' },
      { en: 'The egrets come at six. Be on time.', mr: 'बगळे सहाला येतात. वेळेवर या.' },
      { en: 'This lake has seen more of my thinking than my husband has.', mr: 'माझे विचार नवऱ्यापेक्षा या तलावाने जास्त ऐकलेत.' },
    ],
    tags: 'walk morning lake retired bank coffee tamil',
  }),
  P('kiran', {
    name: { en: 'Kiran Mhatre', mr: 'किरण म्हात्रे' }, role: { en: 'The Lakeside Photographer', mr: 'तलावाकाठचा फोटोग्राफर' },
    at: [-262, -210], zone: 'talav', look: { woman: false, garb: 'tee', top: '#4e6a8f', bottom: '#263238', hairStyle: 'short', acc: ['binoculars', 'cap'], accent: '#3a5a40' },
    status: { en: '📷 Waiting for the kingfisher', mr: '📷 खंड्याची वाट बघतोय' },
    tagline: { en: 'Wedding shoots pay the rent. Birds pay the rest.', mr: 'लग्नाच्या शूटने भाडं निघतं. पक्ष्यांनी बाकीचं.' },
    from: { en: 'Panvel', mr: 'पनवेल' }, since: { en: 'Always', mr: 'जन्मापासून' }, spot: { en: 'East bank at sunrise', mr: 'पहाटेचा पूर्व काठ' }, speaks: 'मराठी · English',
    story: {
      en: 'People drive to Karnala to see birds and walk past forty species on this lake. I have photographed a kingfisher on that railing every winter for six years. I like to think it is the same one.',
      mr: 'लोक पक्षी बघायला कर्नाळ्याला जातात आणि या तलावावरच्या चाळीस जाती ओलांडून जातात. त्या कठड्यावर मी सहा हिवाळे खंड्याचा फोटो काढलाय. तोच पक्षी आहे असं मानायला मला आवडतं.',
    },
    lines: [
      { en: 'Shh. Left of the third lamp post.', mr: 'श्श. तिसऱ्या दिव्याच्या डावीकडे.' },
      { en: 'Golden hour is free. Everything else I charge for.', mr: 'गोल्डन अवर फुकट. बाकी सगळ्याचे पैसे.' },
      { en: 'Come back in December. The lake changes.', mr: 'डिसेंबरमध्ये या. तलाव बदलतो.' },
    ],
    tags: 'photo camera birds lake karnala nature',
  }),
  P('aaji', {
    name: { en: 'Sindhu Aaji', mr: 'सिंधू आजी' }, role: { en: 'The Temple Regular', mr: 'देवळातली रोजची भक्त' },
    at: [-462, -196], mode: 'wander', r: 10, zone: 'talav', look: { woman: true, garb: 'saree', top: '#7b1f3a', accent: '#f2efe6', hairStyle: 'bun', hair: '#d8d8d4', h: 0.88, skin: '#b97c52' },
    status: { en: '🌼 Pradakshina number eleven', mr: '🌼 अकरावी प्रदक्षिणा' },
    tagline: { en: 'Seventy years, same temple, new knees.', mr: 'सत्तर वर्षं, तेच देऊळ, नवे गुडघे.' },
    from: { en: 'Pen', mr: 'पेण' }, since: '1961', spot: { en: 'The temple steps', mr: 'देवळाच्या पायऱ्या' }, speaks: 'मराठी',
    story: {
      en: 'I came to Panvel as a bride of sixteen, on a bullock cart from Pen. The cart makers of this town were famous then. Now my grandson books a cab on his phone to go two lanes. I still walk.',
      mr: 'सोळाव्या वर्षी नवरी म्हणून पेणहून बैलगाडीने पनवेलला आले. तेव्हा इथले गाडीवान नावाजलेले होते. आता माझा नातू दोन गल्ल्या जायला फोनवरून गाडी बोलावतो. मी अजून चालतच जाते.',
    },
    lines: [
      { en: 'Have you eaten? You look like you have not eaten.', mr: 'जेवलास का? जेवल्यासारखा दिसत नाहीस.' },
      { en: 'Take prasad. Both hands, bala.', mr: 'प्रसाद घे. दोन्ही हात पुढे कर, बाळा.' },
      { en: 'In my day this lake came up to that tree.', mr: 'आमच्या वेळी तलाव त्या झाडापर्यंत होता.' },
    ],
    tags: 'temple mandir aaji grandmother old stories pen',
  }),
  P('ganpat', {
    name: { en: 'Ganpat Patil', mr: 'गणपत पाटील' }, role: { en: 'The Rickshaw Dada', mr: 'रिक्षावाले दादा' },
    at: [142, -78], zone: 'stand', look: { woman: false, garb: 'shirt', top: '#a1887f', bottom: '#6d5f4b', hairStyle: 'short', acc: ['moustache'], skin: '#8d5a3b' },
    status: { en: '🛺 New Panvel? Three seats, let’s go', mr: '🛺 नवीन पनवेल? तीन सीट, चला' },
    tagline: { en: 'Knows every pothole by its first name.', mr: 'प्रत्येक खड्ड्याला नावाने ओळखतो.' },
    from: { en: 'Nere, Panvel taluka', mr: 'नेरे, ता. पनवेल' }, since: '1998', spot: { en: 'The stand outside the depot', mr: 'डेपोबाहेरचा स्टँड' }, speaks: 'मराठी · हिंदी',
    story: {
      en: 'Twenty-seven years on these roads. I have taken women to hospital at three in the morning and students to exams with four minutes to spare. The meter is honest. The traffic is not.',
      mr: 'सत्तावीस वर्षं याच रस्त्यांवर. रात्री तीनला बाळंतिणींना दवाखान्यात सोडलंय आणि चार मिनिटं बाकी असताना पोरांना परीक्षेला पोचवलंय. मीटर प्रामाणिक आहे. ट्रॅफिक नाही.',
    },
    lines: [
      { en: 'Sharing or special? Decide quickly, the bus is honking.', mr: 'शेअर की स्पेशल? लवकर सांगा, मागे बस हॉर्न देतेय.' },
      { en: 'Change nahi? Nobody ever has change.', mr: 'सुट्टे नाहीत? कुणाकडेच कधी नसतात.' },
      { en: 'Go on, drive one yourself. See how easy it looks.', mr: 'जा, स्वतः चालवून बघा. किती सोपं वाटतं ते.' },
    ],
    tags: 'rickshaw auto driver stand road traffic',
  }),
  P('imran', {
    name: { en: 'Imran Shaikh', mr: 'इम्रान शेख' }, role: { en: 'The Vada Pav King', mr: 'वडापावचा बादशाह' },
    at: [168, -92], zone: 'stand', look: { woman: false, garb: 'tee', top: '#c62828', bottom: '#37474f', hairStyle: 'short', acc: ['apron', 'beard'] },
    status: { en: '🔥 Hot batch in two minutes', mr: '🔥 दोन मिनिटांत गरम घाणा' },
    tagline: { en: 'The chutney recipe goes to the grave. Maybe to my daughter.', mr: 'चटणीची कृती माझ्याबरोबर जाणार. किंवा माझ्या लेकीकडे.' },
    from: { en: 'Panvel', mr: 'पनवेल' }, since: { en: 'Always', mr: 'जन्मापासून' }, spot: { en: 'Right here, 6 am to 10 pm', mr: 'इथेच, सकाळी ६ ते रात्री १०' }, speaks: 'हिंदी · मराठी · कोकणी',
    story: {
      en: 'Every bus to the Konkan stops here for ten minutes, and in ten minutes I can feed forty people. Drivers tell me the highway news, passengers tell me their troubles. I only tell them: eat it while it is hot.',
      mr: 'कोकणात जाणारी प्रत्येक गाडी इथे दहा मिनिटं थांबते, आणि दहा मिनिटांत मी चाळीस जणांना खाऊ घालतो. ड्रायव्हर हायवेच्या बातम्या सांगतात, प्रवासी त्यांची दुःखं. मी एवढंच सांगतो: गरम आहे तोवर खा.',
    },
    lines: [
      { en: 'Teekha? Medium? Speak up, the kadhai is loud.', mr: 'तिखट? मीडियम? मोठ्याने बोला, कढई गाजतेय.' },
      { en: 'One more. You came all this way.', mr: 'आणखी एक घ्या. एवढ्या लांबून आलात.' },
      { en: 'Mahad bus is late. So you have time for a second.', mr: 'महाड गाडी लेट आहे. म्हणजे दुसरा खायला वेळ आहे.' },
    ],
    tags: 'vada pav food stall snack bus stand',
  }),
  P('sunil', {
    name: { en: 'Sunil Yadav', mr: 'सुनील यादव' }, role: { en: 'The Lal Pari Conductor', mr: 'लाल परीचे कंडक्टर' },
    at: [176, -128], mode: 'wander', r: 14, zone: 'stand', look: { woman: false, garb: 'shirt', top: '#8d6e63', bottom: '#5d4037', hairStyle: 'short', acc: ['sling', 'moustache'] },
    status: { en: '🎫 Pen! Alibag! Mahad!', mr: '🎫 पेण! अलिबाग! महाड!' },
    tagline: { en: 'Can make change for five hundred on a moving bus.', mr: 'धावत्या गाडीत पाचशेचे सुट्टे देतो.' },
    from: { en: 'Satara', mr: 'सातारा' }, since: '2009', spot: { en: 'Platform 4, the Konkan side', mr: 'फलाट ४, कोकणची बाजू' }, speaks: 'मराठी · हिंदी',
    story: {
      en: 'People say the ST is slow. The ST goes where nothing else goes. In the monsoon when the ghat road slides, we are the ones who still turn up at the village stop with the newspapers and the doctor.',
      mr: 'लोक म्हणतात एसटी हळू आहे. पण जिथे काहीच जात नाही तिथे एसटी जाते. पावसाळ्यात घाट खचला तरी पेपर आणि डॉक्टरला घेऊन गावाच्या थांब्यावर आम्हीच पोचतो.',
    },
    lines: [
      { en: 'Move in, move in, there is room at the back.', mr: 'पुढे सरका, पुढे सरका, मागे जागा आहे.' },
      { en: 'Ticket? Half or full?', mr: 'तिकीट? हाफ की फुल?' },
      { en: 'Window seat costs the same. Run for it.', mr: 'खिडकीची सीट त्याच भावात. पळा.' },
    ],
    tags: 'bus st conductor konkan travel lal pari',
  }),
  P('rohan', {
    name: { en: 'Rohan Thakur', mr: 'रोहन ठाकूर' }, role: { en: 'The Harbour Line Regular', mr: 'हार्बर लाईनचा रोजचा प्रवासी' },
    at: [668, 44], mode: 'wander', r: 12, zone: 'junction', look: { woman: false, garb: 'shirt', top: '#90caf9', bottom: '#263238', hairStyle: 'short', acc: ['bag', 'specs'], accent: '#263238' },
    status: { en: '🚆 8:02 slow or 8:17 fast?', mr: '🚆 ८:०२ स्लो की ८:१७ फास्ट?' },
    tagline: { en: 'Ninety minutes each way. Has read forty books on the train.', mr: 'एका बाजूला नव्वद मिनिटं. ट्रेनमध्ये चाळीस पुस्तकं वाचून झाली.' },
    from: { en: 'New Panvel, Sector 12', mr: 'नवीन पनवेल, सेक्टर १२' }, since: '2001', spot: { en: 'Fourth coach, door side', mr: 'चौथा डबा, दाराजवळ' }, speaks: 'मराठी · English · हिंदी',
    story: {
      en: 'The best thing about living at the last station is that you always get a seat. The worst is everything else. I have train friends I have known for six years. I do not know where any of them live.',
      mr: 'शेवटच्या स्टेशनवर राहण्याचा एकच फायदा: सीट नक्की मिळते. बाकी सगळा तोटा. सहा वर्षांपासूनचे माझे ट्रेन-मित्र आहेत. त्यांपैकी एकाचंही घर मला माहीत नाही.',
    },
    lines: [
      { en: 'If the indicator says two minutes, it means seven.', mr: 'इंडिकेटर दोन मिनिटं म्हणाला की समजा सात.' },
      { en: 'Belapur people take my seat every day. Every day.', mr: 'बेलापूरवाले रोज माझी सीट घेतात. रोज.' },
      { en: 'Once the airport opens fully, this place will not know itself.', mr: 'विमानतळ पूर्ण सुरू झाला की हे गाव स्वतःला ओळखणार नाही.' },
    ],
    tags: 'train local commute office mumbai harbour station',
  }),
  P('ramesh', {
    name: { en: 'Ramesh Kamble', mr: 'रमेश कांबळे' }, role: { en: 'Porter No. 27', mr: 'हमाल क्र. २७' },
    at: [702, 30], zone: 'junction', look: { woman: false, garb: 'kurta', top: '#b71c1c', bottom: '#4e342e', hairStyle: 'short', hair: '#555', skin: '#7a4a2f' },
    status: { en: '🧳 Konkan Kanya, platform five', mr: '🧳 कोकणकन्या, फलाट पाच' },
    tagline: { en: 'Has carried half of Ratnagiri’s mangoes on his head.', mr: 'रत्नागिरीचे निम्मे आंबे डोक्यावरून वाहिलेत.' },
    from: { en: 'Khed, Ratnagiri', mr: 'खेड, रत्नागिरी' }, since: '1996', spot: { en: 'The bench under the clock', mr: 'घड्याळाखालचा बाक' }, speaks: 'मराठी · कोकणी · हिंदी',
    story: {
      en: 'When the Konkan line opened, my village got closer by a whole day. Before Ganpati this platform is a river of people going home. I carry their bags and remember that I am going home too, one day.',
      mr: 'कोकण रेल्वे सुरू झाली तेव्हा माझं गाव एक अख्खा दिवस जवळ आलं. गणपतीच्या आधी हा फलाट घरी निघालेल्या माणसांची नदी होतो. मी त्यांचं सामान उचलतो आणि आठवतो, की एक दिवस मलाही घरी जायचंय.',
    },
    lines: [
      { en: 'Two bags, one box, sixty rupees. No arguing.', mr: 'दोन बॅगा, एक खोका, साठ रुपये. घासाघीस नाही.' },
      { en: 'S4 stops near the tea stall. Stand there.', mr: 'एस-४ चहाच्या स्टॉलजवळ थांबतो. तिथे उभे राहा.' },
      { en: 'Going to the village? Take me along.', mr: 'गावाला निघालात? मला पण घेऊन चला.' },
    ],
    tags: 'station porter coolie konkan railway luggage',
  }),
  P('lakshmi', {
    name: { en: 'Lakshmi Amma', mr: 'लक्ष्मी अम्मा' }, role: { en: 'The Idli Cart', mr: 'इडलीची गाडी' },
    at: [850, -66], zone: 'junction', look: { woman: true, garb: 'saree', top: '#2e7d32', accent: '#f9a825', hairStyle: 'plait', skin: '#8d5a3b' },
    status: { en: '🥥 Idli hot, chutney fresh', mr: '🥥 इडली गरम, चटणी ताजी' },
    tagline: { en: 'Feeds the 6:40 local before it feeds the city.', mr: '६:४० च्या लोकलला आधी तीच खाऊ घालते.' },
    from: { en: 'Tirunelveli', mr: 'तिरुनेलवेली' }, since: '2006', spot: { en: 'East side, near the scooter parking', mr: 'पूर्व बाजू, दुचाकी पार्किंगजवळ' }, speaks: 'தமிழ் · हिंदी · मराठी',
    story: {
      en: 'I wake at three to grind the batter. By half past nine I am sold out and the office people are in Mumbai with my breakfast inside them. My son is studying engineering here. The cart paid for all of it.',
      mr: 'पीठ वाटायला मी पहाटे तीनला उठते. साडेनऊला सगळं संपतं आणि ऑफिसवाले माझा नाश्ता पोटात घेऊन मुंबईत पोचलेले असतात. माझा मुलगा इथेच इंजिनिअरिंग शिकतोय. सगळा खर्च या गाडीने काढला.',
    },
    lines: [
      { en: 'Plate or parcel? Train time, I know, I know.', mr: 'प्लेट की पार्सल? ट्रेनची घाई, माहीत आहे.' },
      { en: 'Extra sambar is free. Extra idli is not.', mr: 'जास्तीचं सांबार फुकट. जास्तीची इडली नाही.' },
      { en: 'Marathi I learned from customers. Scolding I already knew.', mr: 'मराठी गिऱ्हाइकांकडून शिकले. ओरडणं आधीच येत होतं.' },
    ],
    tags: 'idli food breakfast cart station south indian',
  }),
  P('tukaram', {
    name: { en: 'Tukaram Bhoir', mr: 'तुकाराम भोईर' }, role: { en: 'The Chowk Parliament', mr: 'चौकातली संसद' },
    at: [-292, 350], mode: 'sit', zone: 'chowk', look: { woman: false, garb: 'kurta', top: '#f5f5f0', bottom: '#f5f5f0', hairStyle: 'bald', acc: ['topi', 'specs'], h: 0.93 },
    status: { en: '📰 Paper, politics, and one opinion on each', mr: '📰 पेपर, राजकारण आणि प्रत्येकावर एक मत' },
    tagline: { en: 'Has solved the country’s problems daily since retirement.', mr: 'निवृत्तीपासून रोज देशाचे प्रश्न सोडवतोय.' },
    from: { en: 'Vadghar, across the creek', mr: 'वडघर, खाडीपलीकडे' }, since: '1972', spot: { en: 'The bench by the statue', mr: 'पुतळ्याजवळचा बाक' }, speaks: 'मराठी · आगरी',
    story: {
      en: 'Our family farmed rice where the towers stand now. The land went for the new city, the money went for my daughters’ education, and both are doctors. So I do not complain. I only comment.',
      mr: 'आज जिथे टॉवर आहेत तिथे आमची भातशेती होती. जमीन नव्या शहरासाठी गेली, पैसा मुलींच्या शिक्षणात गेला, आणि दोघी डॉक्टर झाल्या. म्हणून मी तक्रार करत नाही. फक्त मत देतो.',
    },
    lines: [
      { en: 'Sit, sit. Tell me, who will win this time?', mr: 'बसा बसा. सांगा, यंदा कोण येणार?' },
      { en: 'In my time this chowk had one bulb and it was enough.', mr: 'आमच्या वेळी चौकात एकच बल्ब होता आणि तो पुरायचा.' },
      { en: 'Agri people gave the land for Navi Mumbai. Write that down.', mr: 'नवी मुंबईसाठी जमीन आगऱ्यांनी दिली. हे लिहून ठेवा.' },
    ],
    tags: 'chowk retired farmer agri politics newspaper old',
  }),
  P('kavita', {
    name: { en: 'Kavita Deshmukh', mr: 'कविता देशमुख' }, role: { en: 'The Natak Lover', mr: 'नाटकवेडी' },
    at: [-456, 392], mode: 'wander', r: 9, zone: 'bazaar', look: { woman: true, garb: 'saree', top: '#5e35b1', accent: '#f5f5f0', hairStyle: 'bun', acc: ['specs', 'sling'] },
    status: { en: '🎭 Third bell at 9:30', mr: '🎭 साडेनऊला तिसरी घंटा' },
    tagline: { en: 'Teaches Marathi by day, sits in row C by night.', mr: 'दिवसा मराठी शिकवते, रात्री ‘सी’ रांगेत बसते.' },
    from: { en: 'Kolhapur', mr: 'कोल्हापूर' }, since: '2003', spot: { en: 'Row C, seat 14', mr: 'रांग सी, खुर्ची १४' }, speaks: 'मराठी · English',
    story: {
      en: 'I tell my students that a town with a natyagruha is a town that thinks. We get the Mumbai productions here a month late and I do not mind at all. The actors are more relaxed by then.',
      mr: 'ज्या गावात नाट्यगृह आहे ते गाव विचार करतं, असं मी विद्यार्थ्यांना सांगते. मुंबईची नाटकं इथे महिनाभर उशिरा येतात, पण मला त्याचं काही वाटत नाही. तोपर्यंत नट जरा निवांत झालेले असतात.',
    },
    lines: [
      { en: 'Phones off. I will check.', mr: 'फोन बंद. मी तपासणार आहे.' },
      { en: 'You have not seen a play here? What have you been doing?', mr: 'इथे नाटक नाही पाहिलंत? मग करत काय होतात?' },
      { en: 'Homework: one poem by heart, by Monday.', mr: 'गृहपाठ: सोमवारपर्यंत एक कविता तोंडपाठ.' },
    ],
    tags: 'theatre natak teacher marathi school drama poetry',
  }),
  P('surekha', {
    name: { en: 'Surekha Koli', mr: 'सुरेखा कोळी' }, role: { en: 'The Fish Market Mavshi', mr: 'मासळी बाजारातली मावशी' },
    at: [-438, 548], zone: 'bazaar', look: { woman: true, garb: 'saree', top: '#d81b60', accent: '#00838f', hairStyle: 'bun', acc: ['basket'], skin: '#a4683f' },
    status: { en: '🐟 Bombil came in at five', mr: '🐟 बोंबील पाचला आलेत' },
    tagline: { en: 'Can tell today’s catch from yesterday’s at ten paces.', mr: 'दहा पावलांवरून आजची आणि कालची मासळी ओळखते.' },
    from: { en: 'Panvel Koliwada', mr: 'पनवेल कोळीवाडा' }, since: { en: 'Before the town was', mr: 'गाव व्हायच्या आधीपासून' }, spot: { en: 'Her corner of the market', mr: 'बाजारातला तिचा कोपरा' }, speaks: 'कोळी · मराठी',
    story: {
      en: 'We were here when Panvel was a port and boats came up the creek. My grandmother sold from this same corner. The fish come by tempo now, not by boat, but the bargaining has not changed one word.',
      mr: 'पनवेल बंदर होतं आणि खाडीतून होड्या यायच्या, तेव्हापासून आम्ही इथे आहोत. माझी आजी याच कोपऱ्यात बसायची. आता मासळी होडीने नाही, टेम्पोने येते, पण घासाघीस शब्दभरही बदलली नाही.',
    },
    lines: [
      { en: 'Two hundred. For you, one-eighty. Final.', mr: 'दोनशे. तुमच्यासाठी एकशे ऐंशी. शेवटचा भाव.' },
      { en: 'Touch it, smell it, then talk.', mr: 'हात लावा, वास घ्या, मग बोला.' },
      { en: 'Surmai on Sunday. Come early or cry later.', mr: 'रविवारी सुरमई. लवकर या, नाहीतर रडत बसा.' },
    ],
    tags: 'fish koli market bazaar seafood bombil',
  }),
  P('asha', {
    name: { en: 'Asha Mokal', mr: 'आशा मोकल' }, role: { en: 'The Bhajiwali', mr: 'भाजीवाली' },
    at: [-452, 534], zone: 'bazaar', look: { woman: true, garb: 'saree', top: '#ef6c00', accent: '#2e7d32', hairStyle: 'bun' },
    status: { en: '🥬 Methi twenty, kothimbir free', mr: '🥬 मेथी वीस, कोथिंबीर फुकट' },
    tagline: { en: 'Her farm is forty minutes away. Her prices are not negotiable. They are.', mr: 'शेत चाळीस मिनिटांवर. भाव ठरलेला. तरीही होतो.' },
    from: { en: 'Shirdhon', mr: 'शिरढोण' }, since: '1999', spot: { en: 'Third stall from the circle', mr: 'सर्कलपासून तिसरा गाळा' }, speaks: 'मराठी',
    story: {
      en: 'I leave the village at four with whatever the field gave. Shirdhon is Phadke’s village, you know. We grew up hearing that a boy from our lanes frightened the British. It makes you sit a little straighter.',
      mr: 'शेताने जे दिलं ते घेऊन मी चारला गाव सोडते. शिरढोण म्हणजे फडक्यांचं गाव बरं का. आमच्याच गल्लीतल्या पोराने इंग्रजांना घाम फोडला, हे ऐकतच आम्ही मोठे झालो. त्याने पाठ जरा ताठ होते.',
    },
    lines: [
      { en: 'This is this morning’s. Look at the root.', mr: 'ही आज सकाळची आहे. मूळ बघा.' },
      { en: 'Chillies I will add. Do not ask twice.', mr: 'मिरच्या घालते. पुन्हा मागू नका.' },
      { en: 'No bag? Next time bring a bag.', mr: 'पिशवी नाही? पुढच्या वेळी पिशवी आणा.' },
    ],
    tags: 'vegetables bhaji market farm village shirdhon',
  }),
  P('fatima', {
    name: { en: 'Fatima Khan', mr: 'फातिमा खान' }, role: { en: 'The Tailor of Tilak Road', mr: 'टिळक रोडवरची शिंपीण' },
    at: [-395, 455], zone: 'bazaar', look: { woman: true, garb: 'salwar', top: '#1e88e5', bottom: '#f5f5f0', accent: '#f5f5f0', hairStyle: 'scarf' },
    status: { en: '🧵 Blouse by Friday, I promise', mr: '🧵 ब्लाउज शुक्रवारपर्यंत, शब्द आहे' },
    tagline: { en: 'Friday means Friday. Mostly.', mr: 'शुक्रवार म्हणजे शुक्रवार. बहुतेक.' },
    from: { en: 'Panvel, Momin Pada', mr: 'पनवेल, मोमीन पाडा' }, since: { en: 'Always', mr: 'जन्मापासून' }, spot: { en: 'Behind the sewing machine', mr: 'शिलाई मशीनमागे' }, speaks: 'हिंदी · मराठी · कोकणी',
    story: {
      en: 'I have stitched wedding blouses for girls whose mothers I stitched for. Before Diwali and Eid and Ganpati the whole town wants its clothes on the same day. That is when you learn who your patient customers are.',
      mr: 'ज्यांच्या आयांचे ब्लाउज शिवले त्यांच्याच लेकींचे लग्नाचे ब्लाउज मी शिवलेत. दिवाळी, ईद आणि गणपतीआधी अख्ख्या गावाला एकाच दिवशी कपडे हवे असतात. तेव्हाच कळतं कोणतं गिऱ्हाईक समजूतदार आहे.',
    },
    lines: [
      { en: 'Stand straight. Breathe normally. Normally!', mr: 'सरळ उभ्या राहा. नेहमीसारखा श्वास घ्या. नेहमीसारखा!' },
      { en: 'This cloth? For this design? No. Trust me.', mr: 'हे कापड? या डिझाइनला? नाही. माझं ऐका.' },
      { en: 'Come Friday. Evening. Late evening.', mr: 'शुक्रवारी या. संध्याकाळी. जरा उशिरा.' },
    ],
    tags: 'tailor clothes stitching bazaar festival wedding',
  }),
  P('hatim', {
    name: { en: 'Hatim Lokhandwala', mr: 'हातिम लोखंडवाला' }, role: { en: 'The Hardware Uncle', mr: 'हार्डवेअरवाले काका' },
    at: [-548, 632], zone: 'bazaar', look: { woman: false, garb: 'kurta', top: '#f5f5f0', bottom: '#f5f5f0', hairStyle: 'bald', acc: ['topi', 'beard', 'specs'], hair: '#dcdcdc' },
    status: { en: '🔩 Same shop since my grandfather', mr: '🔩 आजोबांपासूनचं तेच दुकान' },
    tagline: { en: 'If he does not stock it, you do not need it.', mr: 'त्यांच्याकडे नसेल तर तुम्हाला त्याची गरजच नाही.' },
    from: { en: 'Panvel, Bohri Mohalla', mr: 'पनवेल, बोहरी मोहल्ला' }, since: { en: 'Four generations', mr: 'चार पिढ्या' }, spot: { en: 'The ledger desk', mr: 'खतावणीचं टेबल' }, speaks: 'गुजराती · मराठी · हिंदी',
    story: {
      en: 'Farmers, builders, plumbers, they all come through this door. I keep the accounts in a red cloth book the way my grandfather did, and also on a computer because my son insists. The book has never crashed.',
      mr: 'शेतकरी, बिल्डर, प्लंबर, सगळे याच दारातून येतात. आजोबांसारखा मी हिशेब लाल कापडी चोपडीत ठेवतो, आणि मुलाच्या हट्टामुळे कॉम्प्युटरवरही. चोपडी कधी बंद पडली नाही.',
    },
    lines: [
      { en: 'Half inch or three-quarter? Bring the old piece.', mr: 'अर्धा इंच की पाऊण? जुना तुकडा आणा.' },
      { en: 'Pay next week. I know your father.', mr: 'पुढच्या आठवड्यात द्या. मी तुमच्या वडिलांना ओळखतो.' },
      { en: 'This lane has a mosque, a temple and a synagogue. We share the parking.', mr: 'या गल्लीत मशीद, देऊळ आणि सिनेगॉग आहे. पार्किंग आम्ही वाटून घेतो.' },
    ],
    tags: 'hardware shop trader bohra bazaar tools',
  }),
  P('samuel', {
    name: { en: 'Samuel Penkar', mr: 'सॅम्युअल पेणकर' }, role: { en: 'Keeper of the Keys', mr: 'किल्ल्यांचा राखणदार' },
    at: [-436, 684], zone: 'bazaar', look: { woman: false, garb: 'shirt', top: '#eceff1', bottom: '#37474f', hairStyle: 'short', hair: '#9a9a98', acc: ['specs', 'cap'], accent: '#37474f' },
    status: { en: '🕯️ Opening up for Shabbat', mr: '🕯️ शब्बाथसाठी दार उघडतोय' },
    tagline: { en: 'Prays in Hebrew, argues in Marathi.', mr: 'प्रार्थना हिब्रूत, वाद मराठीत.' },
    from: { en: 'Pen, as the surname says', mr: 'पेण, आडनावच सांगतं' }, since: '1968', spot: { en: 'The synagogue courtyard', mr: 'सिनेगॉगचं अंगण' }, speaks: 'मराठी · English',
    story: {
      en: 'We Bene Israel have been in the Konkan longer than anyone wrote it down. Our surnames are our villages: Penkar, Kehimkar, Ashtamkar. Many families left for Israel. I stayed, somebody has to know where the keys are.',
      mr: 'आम्ही बेने इस्रायली कोकणात कधीपासून आहोत हे कुणी लिहूनही ठेवलं नाही, इतके जुने. आमची आडनावं म्हणजे आमची गावं: पेणकर, किहीमकर, अष्टमकर. बरीच घरं इस्रायलला गेली. मी राहिलो; किल्ल्या कुठे आहेत हे कुणालातरी माहीत हवं.',
    },
    lines: [
      { en: 'Come in, come in. Shoes there, please.', mr: 'या, आत या. चपला तिथे ठेवा.' },
      { en: 'My mother’s puranpoli was kosher. Think about that.', mr: 'माझ्या आईची पुरणपोळी कोशर होती. विचार करा.' },
      { en: 'Shalom. Ani namaskar.', mr: 'शालोम. आणि नमस्कार.' },
    ],
    tags: 'synagogue bene israel jewish heritage history keys',
  }),
  P('shubhangi', {
    name: { en: 'Shubhangi Patil', mr: 'शुभांगी पाटील' }, role: { en: 'The Murtikar', mr: 'मूर्तिकार' },
    at: [-530, 470], zone: 'bazaar', look: { woman: true, garb: 'kurta', top: '#f9a825', bottom: '#4e342e', hairStyle: 'plait', acc: ['apron'] },
    status: { en: '🐘 Shadu clay only, no PoP', mr: '🐘 फक्त शाडू माती, पीओपी नाही' },
    tagline: { en: 'Paints the eyes last, and alone.', mr: 'डोळे सर्वांत शेवटी रंगवते, आणि एकटीच.' },
    from: { en: 'Pen', mr: 'पेण' }, since: '2015', spot: { en: 'Her workshop by Krishnale Talav', mr: 'कृष्णाळे तलावाजवळची कार्यशाळा' }, speaks: 'मराठी · English',
    story: {
      en: 'My family has made Ganesh idols in Pen for five generations. I brought the work to Panvel and switched to shadu clay, because the idol should return to the water and leave the water clean. Orders start in March.',
      mr: 'पेणमध्ये आमच्या घरात पाच पिढ्या गणपती बनवतात. मी ते काम पनवेलला आणलं आणि शाडू मातीकडे वळले, कारण मूर्ती पाण्यात परत जावी आणि पाणी स्वच्छ राहावं. ऑर्डर मार्चपासून सुरू होतात.',
    },
    lines: [
      { en: 'Do not touch. It is drying.', mr: 'हात लावू नका. वाळतेय.' },
      { en: 'Two feet, shadu, sitting pose. Book now.', mr: 'दोन फूट, शाडू, बैठी मूर्ती. आत्ताच नोंदवा.' },
      { en: 'The eyes decide everything.', mr: 'सगळं डोळ्यांवर ठरतं.' },
    ],
    tags: 'ganpati idol murti artist clay pen festival art',
  }),
  P('mangesh', {
    name: { en: 'Mangesh Jadhav', mr: 'मंगेश जाधव' }, role: { en: 'The First One Awake', mr: 'सर्वांत आधी जागा होणारा' },
    at: [-722, 214], mode: 'wander', r: 14, zone: 'palika', look: { woman: false, garb: 'shirt', top: '#ef6c00', bottom: '#37474f', hairStyle: 'short', acc: ['cap'], accent: '#ef6c00', skin: '#7a4a2f' },
    status: { en: '🧹 The town wakes up after us', mr: '🧹 गाव आमच्यानंतर जागं होतं' },
    tagline: { en: 'Sweeps the road you will not notice is clean.', mr: 'तुमच्या लक्षातही येणार नाही असा स्वच्छ रस्ता झाडतो.' },
    from: { en: 'Panvel', mr: 'पनवेल' }, since: { en: 'Always', mr: 'जन्मापासून' }, spot: { en: 'Gandhi Garden, before sunrise', mr: 'गांधी उद्यान, सूर्योदयापूर्वी' }, speaks: 'मराठी · हिंदी',
    story: {
      en: 'My shift starts at five. By the time the walkers come, the market road is done. Nobody thanks a clean road, they only notice a dirty one. My daughter says she will be a municipal officer. Then I will salute her.',
      mr: 'माझी पाळी पाचला सुरू होते. फिरणारे येईपर्यंत बाजाराचा रस्ता झालेला असतो. स्वच्छ रस्त्याचे आभार कुणी मानत नाही; घाण दिसली की मात्र लगेच बोलतात. माझी लेक म्हणते ती पालिकेत अधिकारी होणार. मग मी तिला सलाम ठोकेन.',
    },
    lines: [
      { en: 'Wet and dry, separate. It is not hard.', mr: 'ओला आणि सुका वेगळा. अवघड नाही.' },
      { en: 'Oldest municipality in Maharashtra. We try to look it.', mr: 'महाराष्ट्रातली सर्वांत जुनी पालिका. तशी दिसावी म्हणून झटतो.' },
      { en: 'Bin is right there. Right there.', mr: 'कचरापेटी तिथेच आहे. अगदी तिथेच.' },
    ],
    tags: 'municipal sanitation worker clean palika morning',
  }),
  P('chintu', {
    name: { en: 'Chintu', mr: 'चिंटू' }, role: { en: 'The Gully Cricketer', mr: 'गल्ली क्रिकेटर' },
    at: [-728, 268], mode: 'wander', r: 16, zone: 'palika', look: { woman: false, garb: 'tee', top: '#1565c0', bottom: '#263238', hairStyle: 'short', h: 0.74, acc: ['cap'], accent: '#1565c0' },
    status: { en: '🏏 One tip one hand, out', mr: '🏏 एक टप्पा एक हात, आऊट' },
    tagline: { en: 'Opens the batting, owns the bat, makes the rules.', mr: 'ओपनिंग त्याची, बॅट त्याची, नियमही त्याचेच.' },
    from: { en: 'Panvel', mr: 'पनवेल' }, since: { en: 'Eleven years ago', mr: 'अकरा वर्षांपूर्वी' }, spot: { en: 'The municipal ground', mr: 'पालिकेचं मैदान' }, speaks: 'मराठी · हिंदी · English',
    story: {
      en: 'If the ball goes into the garden it is two runs. If it goes on the road it is out. If it breaks a window we all run and nobody was playing. Homework is done. Almost done.',
      mr: 'बॉल बागेत गेला तर दोन रन. रस्त्यावर गेला तर आऊट. काच फुटली तर सगळे पळतो आणि कुणीच खेळत नव्हतं. गृहपाठ झालाय. जवळजवळ झालाय.',
    },
    lines: [
      { en: 'You can field. Fielding only.', mr: 'तुम्ही फिल्डिंग करा. फक्त फिल्डिंग.' },
      { en: 'That was not out! Ask anyone!', mr: 'तो आऊट नव्हता! कुणालाही विचारा!' },
      { en: 'Last over. Then one more last over.', mr: 'शेवटची ओव्हर. मग आणखी एक शेवटची.' },
    ],
    tags: 'cricket kid children play ground sport',
  }),
  P('anand', {
    name: { en: 'Dr. Anand Kulkarni', mr: 'डॉ. आनंद कुलकर्णी' }, role: { en: 'The Family Doctor', mr: 'घरचे डॉक्टर' },
    at: [34, 318], zone: 'mcch', look: { woman: false, garb: 'shirt', top: '#f5f5f0', bottom: '#37474f', hairStyle: 'short', hair: '#7a7a78', acc: ['specs'] },
    status: { en: '🩺 OPD till nine, then I am human again', mr: '🩺 नऊपर्यंत ओपीडी, मग मी पुन्हा माणूस' },
    tagline: { en: 'Has treated three generations of the same cough.', mr: 'एकाच खोकल्याच्या तीन पिढ्यांवर उपचार केलेत.' },
    from: { en: 'Pune', mr: 'पुणे' }, since: '1989', spot: { en: 'The clinic verandah', mr: 'दवाखान्याचा व्हरांडा' }, speaks: 'मराठी · English · हिंदी',
    story: {
      en: 'I came for two years of rural service and never went back to Pune. Panvel then was a town where everyone knew my scooter. Now there are super-speciality hospitals, and people still call me first to ask if they should go.',
      mr: 'दोन वर्षांच्या ग्रामीण सेवेसाठी आलो आणि पुण्याला परत गेलोच नाही. तेव्हाच्या पनवेलमध्ये माझी स्कूटर सगळे ओळखायचे. आता मोठमोठी हॉस्पिटलं आहेत, तरी “तिथे जाऊ का?” हे विचारायला लोक आधी मलाच फोन करतात.',
    },
    lines: [
      { en: 'Stop searching your symptoms online. Sit.', mr: 'लक्षणं नेटवर शोधणं थांबवा. बसा.' },
      { en: 'Monsoon is here. Boil the water.', mr: 'पावसाळा आलाय. पाणी उकळून प्या.' },
      { en: 'It is acidity. It is always acidity.', mr: 'ॲसिडिटी आहे. नेहमी ॲसिडिटीच असते.' },
    ],
    tags: 'doctor clinic health hospital medicine',
  }),
  P('zoya', {
    name: { en: 'Zoya Shaikh', mr: 'झोया शेख' }, role: { en: 'The Exam Warrior', mr: 'परीक्षेची योद्धा' },
    at: [262, 250], mode: 'wander', r: 10, zone: 'mcch', look: { woman: true, garb: 'kurta', top: '#00838f', bottom: '#263238', hairStyle: 'plait', acc: ['bag'], accent: '#ad1457' },
    status: { en: '📚 Paper on Monday. Do not ask.', mr: '📚 सोमवारी पेपर. विचारू नका.' },
    tagline: { en: 'First in her family to go to college. Plans to be the first teacher too.', mr: 'घरातली पहिली कॉलेजला गेलेली. पहिली शिक्षिकाही व्हायचंय.' },
    from: { en: 'Taloja', mr: 'तळोजा' }, since: '2023', spot: { en: 'The library steps', mr: 'ग्रंथालयाच्या पायऱ्या' }, speaks: 'हिंदी · मराठी · English',
    story: {
      en: 'I take two rickshaws and a bus to reach college, so I am not going to waste the day once I am here. I am training to teach. My old school in Taloja has forty children to a class and I want to go back to it.',
      mr: 'कॉलेजला यायला दोन रिक्षा आणि एक बस लागते, म्हणून इथे आल्यावर दिवस वाया घालवत नाही. मी शिक्षिका व्हायचं प्रशिक्षण घेतेय. तळोज्यातल्या माझ्या जुन्या शाळेत एका वर्गात चाळीस मुलं आहेत; मला तिथेच परत जायचंय.',
    },
    lines: [
      { en: 'Do you have last year’s question paper?', mr: 'मागच्या वर्षीचा पेपर आहे का तुमच्याकडे?' },
      { en: 'Five minutes break. Five. I am timing it.', mr: 'पाच मिनिटांचा ब्रेक. पाच. मी वेळ लावलीय.' },
      { en: 'After the exam I will sleep for two days.', mr: 'परीक्षेनंतर मी दोन दिवस झोपणार.' },
    ],
    tags: 'student college exam study teacher education',
  }),
  P('arjun', {
    name: { en: 'Arjun Singh', mr: 'अर्जुन सिंग' }, role: { en: 'The Night Watch', mr: 'रात्रीचा पहारा' },
    at: [120, -238], zone: 'stand', look: { woman: false, garb: 'shirt', top: '#37474f', bottom: '#263238', hairStyle: 'short', acc: ['cap', 'moustache'], accent: '#263238' },
    status: { en: '🌙 Night shift. Day dreams.', mr: '🌙 रात्रपाळी. दिवसा स्वप्नं.' },
    tagline: { en: 'Sends home more than he keeps.', mr: 'स्वतःकडे ठेवतो त्यापेक्षा जास्त घरी पाठवतो.' },
    from: { en: 'Jaunpur, Uttar Pradesh', mr: 'जौनपूर, उत्तर प्रदेश' }, since: '2017', spot: { en: 'The mall gate, 10 pm to 6 am', mr: 'मॉलचं गेट, रात्री १० ते सकाळी ६' }, speaks: 'हिंदी · भोजपुरी · थोडी मराठी',
    story: {
      en: 'Eight of us share a room in Kalamboli and sleep in shifts, like the job. I video-call my daughter when she wakes for school and I am finishing work. She thinks I live inside a shopping mall. I let her think it.',
      mr: 'कळंबोलीत आम्ही आठ जण एका खोलीत राहतो आणि नोकरीसारखंच पाळीपाळीने झोपतो. माझी लेक शाळेसाठी उठते तेव्हा माझी ड्युटी संपत असते; तेव्हा व्हिडिओ कॉल करतो. तिला वाटतं मी मॉलमध्येच राहतो. मी तिला तसंच वाटू देतो.',
    },
    lines: [
      { en: 'Bag check, please. Thank you.', mr: 'बॅग दाखवा. धन्यवाद.' },
      { en: 'Parking is that side. Yes, that side.', mr: 'पार्किंग त्या बाजूला. हो, त्याच बाजूला.' },
      { en: 'I have learned Marathi. “Chalel”, “nako”, “kay mhanta”.', mr: 'मराठी शिकलोय. “चालेल”, “नको”, “काय म्हणता”.' },
    ],
    tags: 'security guard mall migrant night work',
  }),
  P('priya', {
    name: { en: 'Priya Naik', mr: 'प्रिया नाईक' }, role: { en: 'The Sector Regular', mr: 'सेक्टरमधली रोजची' },
    at: [436, -668], mode: 'wander', r: 12, zone: 'newpanvel', look: { woman: true, garb: 'shirt', top: '#ad1457', bottom: '#263238', hairStyle: 'long', acc: ['sling', 'specs'] },
    status: { en: '💻 WFH, but the chai is outside', mr: '💻 घरून काम, पण चहा बाहेरच' },
    tagline: { en: 'Has a Mumbai salary and a Panvel balcony.', mr: 'पगार मुंबईचा, बाल्कनी पनवेलची.' },
    from: { en: 'Goa', mr: 'गोवा' }, since: '2019', spot: { en: 'The corner table at the Udupi place', mr: 'उडपी हॉटेलातलं कोपऱ्यातलं टेबल' }, speaks: 'कोंकणी · English · मराठी',
    story: {
      en: 'I moved here because I could afford two bedrooms and a view of the hills. On a clear morning you can see Prabalgad from my balcony. Then a call starts and I close the curtain. But I know it is there.',
      mr: 'दोन बेडरूम आणि डोंगरांचं दृश्य परवडलं म्हणून इथे आले. निरभ्र सकाळी माझ्या बाल्कनीतून प्रबळगड दिसतो. मग कॉल सुरू होतो आणि मी पडदा ओढते. पण तो तिथे आहे हे मला माहीत असतं.',
    },
    lines: [
      { en: 'I am on mute. I am always on mute.', mr: 'मी म्यूटवर आहे. मी नेहमी म्यूटवरच असते.' },
      { en: 'Which sector? Everyone asks which sector.', mr: 'कोणता सेक्टर? सगळे हेच विचारतात.' },
      { en: 'Sunday trek to Kalavantin. You coming?', mr: 'रविवारी कलावंतीण ट्रेक. येताय?' },
    ],
    tags: 'it software office work from home trek new panvel',
  }),
  P('raju', {
    name: { en: 'Raju Gupta', mr: 'राजू गुप्ता' }, role: { en: 'The Pani Puri Scientist', mr: 'पाणीपुरीचा शास्त्रज्ञ' },
    at: [470, -640], zone: 'newpanvel', look: { woman: false, garb: 'shirt', top: '#fff59d', bottom: '#5d6d7e', hairStyle: 'short', acc: ['apron'] },
    status: { en: '😋 How spicy? Be honest.', mr: '😋 तिखट किती? खरं सांगा.' },
    tagline: { en: 'Six puris a plate. The seventh is on the house and on his honour.', mr: 'प्लेटला सहा पुऱ्या. सातवी त्याच्याकडून, इज्जतीची.' },
    from: { en: 'Prayagraj', mr: 'प्रयागराज' }, since: '2011', spot: { en: 'His cart, 5 pm sharp', mr: 'त्याची गाडी, बरोबर पाचला' }, speaks: 'हिंदी · मराठी',
    story: {
      en: 'Pani is chemistry. Too much mint and it is medicine, too little and it is water. I adjust it for the weather. In the monsoon people want it hotter. Software people want it hottest and then they cry.',
      mr: 'पाणी म्हणजे रसायनशास्त्र. पुदिना जास्त झाला की औषध, कमी झाला की नुसतं पाणी. हवामान बघून मी ते बदलतो. पावसाळ्यात लोकांना जास्त तिखट लागतं. सॉफ्टवेअरवाल्यांना सर्वांत तिखट हवं असतं आणि मग ते रडतात.',
    },
    lines: [
      { en: 'Open your mouth before I serve, not after.', mr: 'पुरी द्यायच्या आधी तोंड उघडा, नंतर नाही.' },
      { en: 'Sukha puri at the end. That is the law.', mr: 'शेवटी सुकी पुरी. तोच कायदा.' },
      { en: 'Medium for you. I can tell.', mr: 'तुम्हाला मीडियम. मला कळतं.' },
    ],
    tags: 'pani puri chaat food street snack new panvel',
  }),
  P('nikhil', {
    name: { en: 'Nikhil Pawar', mr: 'निखिल पवार' }, role: { en: 'The Property Consultant', mr: 'प्रॉपर्टी कन्सल्टंट' },
    at: [-52, -420], mode: 'wander', r: 10, zone: 'panvel', look: { woman: false, garb: 'shirt', top: '#eceff1', bottom: '#1f2a44', hairStyle: 'short', acc: ['sling'] },
    status: { en: '🏢 1 BHK, airport touch, last two flats', mr: '🏢 १ बीएचके, एअरपोर्ट टच, शेवटचे दोन फ्लॅट' },
    tagline: { en: 'Everything is ten minutes from the airport.', mr: 'सगळं काही विमानतळापासून दहा मिनिटांवर.' },
    from: { en: 'Panvel', mr: 'पनवेल' }, since: { en: 'Always', mr: 'जन्मापासून' }, spot: { en: 'Any site office with AC', mr: 'एसी असलेलं कुठलंही साइट ऑफिस' }, speaks: 'मराठी · हिंदी · English',
    story: {
      en: 'My grandfather sold rice. My father sold the rice field. I sell the flats that stand on it. People laugh at brokers until they need one. The airport across the creek changed every number in this town.',
      mr: 'आजोबांनी तांदूळ विकला. वडिलांनी भातशेत विकलं. त्यावर उभे राहिलेले फ्लॅट मी विकतो. गरज पडेपर्यंत लोक एजंटला हसतात. खाडीपलीकडच्या विमानतळाने या गावातला प्रत्येक भाव बदलला.',
    },
    lines: [
      { en: 'Sir, madam, only see the sample flat. No pressure.', mr: 'साहेब, मॅडम, फक्त सॅम्पल फ्लॅट बघा. जबरदस्ती नाही.' },
      { en: 'Rate will go up after the monsoon. Guaranteed.', mr: 'पावसाळ्यानंतर भाव वाढणार. गॅरंटी.' },
      { en: 'Garden view. If you lean out a little.', mr: 'गार्डन व्ह्यू. जरा वाकून बघितलं तर.' },
    ],
    tags: 'property real estate broker flat airport',
  }),
];

/** Snippets overheard at the tea stall. */
export const KATTA_TALK = [
  { en: '“Water cut tomorrow, they say. They always say.”', mr: '“उद्या पाणी नाही म्हणे. रोजच म्हणतात.”' },
  { en: '“My son says Kharghar. I said, what is wrong with Panvel?”', mr: '“मुलगा म्हणतो खारघर. मी म्हटलं, पनवेलला काय झालंय?”' },
  { en: '“The 8:02 was cancelled again. I took it as a sign and went home.”', mr: '“८:०२ पुन्हा रद्द. मी तो संकेत समजून घरी गेलो.”' },
  { en: '“Prabalgad was clear this morning. Rain by evening, then.”', mr: '“सकाळी प्रबळगड स्वच्छ दिसत होता. म्हणजे संध्याकाळी पाऊस.”' },
  { en: '“Ganpati is in six weeks and the murti is not even booked.”', mr: '“गणपती सहा आठवड्यांवर आणि मूर्तीची नोंदणी पण नाही.”' },
  { en: '“They widened the road. Now the traffic jam is wider.”', mr: '“रस्ता रुंद केला. आता ट्रॅफिक जाम रुंद झाला.”' },
  { en: '“One cutting more. No, I am not counting.”', mr: '“आणखी एक कटिंग. नाही, मी मोजत नाही.”' },
  { en: '“When I was small you could hear the temple bell from the station.”', mr: '“लहानपणी स्टेशनवरून देवळाची घंटा ऐकू यायची.”' },
  { en: '“Misal at the old place or the new place? Choose carefully, friendships depend on it.”', mr: '“मिसळ जुन्या ठिकाणी की नव्या? जपून सांग, मैत्री पणाला लागलीय.”' },
  { en: '“Flight from the new airport, and still two hours to reach it. Explain this to me.”', mr: '“नव्या विमानतळावरून फ्लाइट, तरी तिथे पोचायला दोन तास. समजावा मला.”' },
];

/** Notices already pinned on the town's boards. */
export const POSTERS = [
  { kind: '🏏', title: { en: 'Sunday gully cricket', mr: 'रविवारचं गल्ली क्रिकेट' }, when: { en: 'Sun 7 am · Municipal ground · bring a ball', mr: 'रवि. स. ७ · पालिका मैदान · बॉल आणा' }, by: 'Chintu & Co.' },
  { kind: '🎭', title: { en: 'Natak: “Varyavarchi Varat”', mr: 'नाटक: “वाऱ्यावरची वरात”' }, when: { en: 'Sat 9:30 pm · Phadke Natyagruha', mr: 'शनि. रात्री ९:३० · फडके नाट्यगृह' }, by: 'Kavita tai' },
  { kind: '🥾', title: { en: 'Monsoon trek to Kalavantin', mr: 'कलावंतीण पावसाळी ट्रेक' }, when: { en: 'Sun 5:30 am · meet at ST stand', mr: 'रवि. पहाटे ५:३० · एसटी स्टँडवर भेटू' }, by: 'Priya' },
  { kind: '📚', title: { en: 'Free tuition, 8th to 10th', mr: 'मोफत शिकवणी, ८वी ते १०वी' }, when: { en: 'Mon–Fri 6 pm · college library', mr: 'सोम–शुक्र सं. ६ · कॉलेज ग्रंथालय' }, by: 'Zoya' },
  { kind: '🐘', title: { en: 'Shadu clay Ganpati workshop', mr: 'शाडू मातीची गणपती कार्यशाळा' }, when: { en: 'Every Sat in July · Krishnale Talav', mr: 'जुलैमधला प्रत्येक शनिवार · कृष्णाळे तलाव' }, by: 'Shubhangi' },
  { kind: '🧹', title: { en: 'Talav clean-up drive', mr: 'तलाव स्वच्छता मोहीम' }, when: { en: '1st Sunday · 6:30 am · south bank', mr: 'पहिला रविवार · स. ६:३० · दक्षिण काठ' }, by: 'Mangesh & the walkers' },
  { kind: '📷', title: { en: 'Bird walk around the lake', mr: 'तलावाभोवती पक्षीनिरीक्षण' }, when: { en: 'Sat 6 am · east bank · carry binoculars', mr: 'शनि. स. ६ · पूर्व काठ · दुर्बीण आणा' }, by: 'Kiran' },
  { kind: '🩺', title: { en: 'Free BP and sugar check', mr: 'मोफत बीपी व शुगर तपासणी' }, when: { en: 'Thu 8–10 am · Gandhi Garden', mr: 'गुरु. स. ८–१० · गांधी उद्यान' }, by: 'Dr. Kulkarni' },
];
