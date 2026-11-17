// "How to play" page content, per UI language.

const tiles = (cells) => `<span class="demo" lang="mr">${cells.map((c) => `<span>${c}</span>`).join('')}</span>`;

const HELP = {
  mr: `
    <h2>एका चौकटीत एक अक्षर</h2>
    <p>प्रत्येक चौकटीत एक पूर्ण अक्षर येते: मात्रा, अनुस्वार आणि जोडाक्षरांसह.</p>
    <p>${tiles(['म', 'हा', 'रा', 'ष्ट्र'])} महाराष्ट्र = ४ चौकटी</p>
    <p>आडवा आणि उभा शब्द जिथे एकमेकांना छेदतात, तिथे दोन्ही शब्दांचे अक्षर पूर्ण जुळले पाहिजे. <b>कि</b> आणि <b>क</b> वेगळे मानले जातात.</p>

    <h2>कीबोर्ड</h2>
    <ul>
      <li>व्यंजन किंवा स्वर दाबले की नवी चौकट सुरू होते.</li>
      <li>मात्रा चालू चौकटीतल्या अक्षराला लागते: क + ◌ि = कि. दुसरी मात्रा दाबली तर आधीची बदलते.</li>
      <li>जोडाक्षरासाठी ◌् वापरा: क + ◌् + ष = क्ष, एकाच चौकटीत.</li>
      <li>क्ष, ज्ञ, त्र, श्र असे नेहमीचे जोडाक्षर आणि सर्व स्वर <b>अ आ इ</b> बटणाखाली मिळतात.</li>
      <li><b>⌫</b> शेवटचे चिन्ह खोडते. <b>⇅</b> आडवे-उभे बदलते. <b>पुढे →</b> पुढच्या चौकटीत जाते.</li>
      <li>निवडलेल्या चौकटीवर पुन्हा टॅप केल्यानेही दिशा बदलते.</li>
      <li>वरच्या <b>⌨</b> बटणाने फोनचा कीबोर्ड (उदा. Gboard मराठी) वापरता येतो.</li>
    </ul>

    <h2>सूचक</h2>
    <p>कीबोर्डच्या वर चालू शब्दाचा सूचक दिसतो; कंसात अक्षरांची संख्या असते. ‹ › ने मागचा-पुढचा सूचक पाहा. सूचकावर टॅप केल्यास सर्व सूचकांची यादी उघडते.</p>

    <h2>उत्तरे सबमिट करा</h2>
    <p>वरच्या पट्टीत किती चौकटी भरल्या ते दिसते (उदा. <b>१८/२४</b>). सर्व चौकटी भरल्या की <b>सबमिट</b> बटण सुरू होते. सबमिट केल्यावर उत्तरे तपासली जातात: सर्व बरोबर असल्यास कोडे पूर्ण होते, नाहीतर चुकीच्या चौकटी लाल दिसतात. त्या दुरुस्त करून पुन्हा सबमिट करा.</p>
    <p>लहान लेखनचूक चालते: ह्रस्व-दीर्घ (कि/की, दु/दू), अनुस्वार किंवा चंद्रबिंदू, ॅ/ॉ, श/ष/स आणि न/ण. अशी चौकट बरोबर धरली जाते, पण तिच्या तळाशी <b>पिवळी खूण</b> येते. कोडे सुटल्यावर तिथे योग्य लेखन दिसते.</p>

    <h2>इशारा 💡</h2>
    <p>सूचकाच्या उजवीकडील <b>💡</b> बटण दाबले की निवडलेल्या चौकटीत योग्य अक्षर भरले जाते. प्रत्येक कोड्यात <b>३ इशारे</b> मिळतात; आकडा किती उरले ते दाखवतो. इशाऱ्याने भरलेल्या चौकटीच्या कोपऱ्यात जांभळी खूण येते.</p>

    <h2>मदत हवी?</h2>
    <p><b>⋮</b> मेनूमधून अक्षर, शब्द किंवा पूर्ण कोडे तपासा किंवा उत्तर पाहा. चुकीच्या चौकटींवर लाल रेघ येते; दाखवलेल्या चौकटींच्या कोपऱ्यात निळी खूण येते.</p>

    <h2>रोजचे कोडे</h2>
    <p>रोज नवे कोडे येते: सोमवार ते शनिवार लहान आणि रविवारी मोठे. जुनी कोडी मुख्य पानावर आहेत. वेळ आणि उत्तरे याच फोनवर जतन होतात.</p>

    <h2>आणखी कोडी</h2>
    <p>मुख्य पानावरील <b>आणखी कोडी</b> मध्ये विषयवार शेकडो कोडी आहेत, केव्हाही खेळता येतात. विषय आणि आकार निवडा किंवा <b>कोणतेही कोडे खेळा</b> दाबा. ही कोडी सलग दिवसांच्या मोजणीत धरली जात नाहीत.</p>

    <h2>इंटरनेटशिवाय खेळा</h2>
    <p>Chrome च्या मेनूमधून <b>Add to Home screen</b> किंवा <b>ॲप इन्स्टॉल करा</b> निवडा. एकदा उघडलेली कोडी इंटरनेटशिवायही खेळता येतात.</p>
  `,
  en: `
    <h2>One akshara per square</h2>
    <p>Each square holds one whole akshara (syllable), including its vowel sign, anusvara or conjunct.</p>
    <p>${tiles(['म', 'हा', 'रा', 'ष्ट्र'])} महाराष्ट्र = 4 squares</p>
    <p>Where an across and a down word cross, the akshara must match exactly. <b>कि</b> and <b>क</b> are different.</p>

    <h2>Keyboard</h2>
    <ul>
      <li>A consonant or vowel starts a new square.</li>
      <li>A vowel sign attaches to the current square: क + ◌ि = कि. Pressing another vowel sign replaces it.</li>
      <li>Use ◌् (halant) for conjuncts: क + ◌् + ष = क्ष, in one square.</li>
      <li>Common conjuncts (क्ष, ज्ञ, त्र, श्र…) and all vowels are under the <b>अ आ इ</b> key.</li>
      <li><b>⌫</b> deletes the last mark. <b>⇅</b> switches across/down. <b>Next →</b> moves to the next square.</li>
      <li>Tapping the selected square again also switches direction.</li>
      <li>The <b>⌨</b> button at the top lets you use your phone's keyboard (e.g. Gboard Marathi) instead.</li>
    </ul>

    <h2>Clues</h2>
    <p>The clue for the current word is shown above the keyboard; the number in brackets is how many squares it has. Use ‹ › to move between clues, or tap the clue to see them all.</p>

    <h2>Submitting</h2>
    <p>The top bar shows how many squares you've filled (e.g. <b>18/24</b>). Once every square is filled it becomes a <b>Submit</b> button. Submitting checks your answers: if they're all right the puzzle is done; otherwise the wrong squares turn red. Fix them and submit again.</p>
    <p>Small spelling slips are accepted: short or long vowels (कि/की, दु/दू), anusvara or chandrabindu, ॅ/ॉ, श/ष/स and न/ण. Such a square counts as right but gets a <b>yellow mark</b> along its bottom; once the puzzle is solved it shows the right spelling.</p>

    <h2>Hints 💡</h2>
    <p>The <b>💡</b> button to the right of the clue fills the selected square with the right akshara. You get <b>3 hints</b> per puzzle; the number shows how many are left. A square filled by a hint gets a violet corner mark.</p>

    <h2>Stuck?</h2>
    <p>The <b>⋮</b> menu lets you check or reveal a square, a word or the whole puzzle. Wrong squares get a red line; revealed squares get a blue corner mark.</p>

    <h2>Daily puzzles</h2>
    <p>A new puzzle every day: small Monday to Saturday, large on Sunday. Past puzzles are on the home screen. Your time and answers are saved on this phone.</p>

    <h2>More puzzles</h2>
    <p><b>More puzzles</b> on the home screen has hundreds of puzzles by theme, to play any time. Pick a theme and size, or tap <b>Play any puzzle</b>. They don't count toward your daily streak.</p>

    <h2>Play offline</h2>
    <p>In Chrome's menu choose <b>Add to Home screen</b> or <b>Install app</b>. Puzzles you've opened once also work without internet.</p>
  `,
};

export const helpHTML = (lang) => HELP[lang] ?? HELP.mr;
