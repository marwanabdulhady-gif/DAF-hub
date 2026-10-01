/**
 * ActivityEngine Pre-built Activity Presets
 */
window.ACTIVITY_PRESETS = {
  matching: {
    type: 'matching',
    title: 'Planets of the Solar System',
    instruction: 'Connect each planet with its distinctive astronomical characteristic.',
    theme: 'default',
    timer: { enabled: true, mode: 'countup' },
    lives: 3,
    data: [
      { left: 'Mercury', right: 'Closest planet to the Sun' },
      { left: 'Venus', right: 'Hottest planet with thick toxic clouds' },
      { left: 'Mars', right: 'The Red Planet with iron oxide soil' },
      { left: 'Jupiter', right: 'Largest gas giant with the Great Red Spot' },
      { left: 'Saturn', right: 'Famous for its prominent icy ring system' },
      { left: 'Neptune', right: 'Deep blue ice giant with supersonic winds' }
    ]
  },

  wordsearch: {
    type: 'wordsearch',
    title: 'Ecology & Environment Word Search',
    instruction: 'Find and drag across all 6 environmental science terms hidden in the letter grid.',
    theme: 'forest',
    timer: { enabled: true, mode: 'countdown', seconds: 120 },
    lives: null,
    data: {
      gridSize: 11,
      words: ['BIOME', 'HABITAT', 'CARBON', 'OXYGEN', 'ECOLOGY', 'CLIMATE']
    }
  },

  reading: {
    type: 'reading',
    title: 'The Architecture of the Human Heart',
    instruction: 'Read the passage on the left, use the Read Aloud tool if desired, and answer the comprehension questions.',
    theme: 'sunset',
    timer: { enabled: false },
    lives: 3,
    data: {
      passageTitle: 'The Architecture of the Human Heart',
      passageText: 'The human heart is an extraordinary muscular organ roughly the size of a clenched fist. It functions tirelessly as a double pump, beating approximately 100,000 times each day to circulate blood throughout the body.\n\nThe heart is divided into four chambers: two upper atria and two lower ventricles. The right atrium receives deoxygenated blood from bodily tissues and pumps it into the right ventricle, which subsequently propels it to the lungs for oxygenation.\n\nSimultaneously, the left atrium receives freshly oxygenated blood from the pulmonary veins, sending it to the left ventricle. The left ventricle is the thickest and most powerful chamber because it must generate enough hydraulic pressure to deliver oxygen-rich blood throughout the entire systemic circulation.',
      questions: [
        {
          question: 'Why is the left ventricle the thickest chamber of the heart?',
          options: [
            'It stores excess deoxygenated blood',
            'It must pump oxygenated blood throughout the entire body',
            'It receives blood directly from the coronary veins',
            'It regulates cardiac electrical pacemaking'
          ],
          answerIndex: 1,
          explanation: 'The left ventricle requires heavy muscle walls to overcome systemic circulatory resistance.'
        },
        {
          question: 'Where does the right ventricle pump deoxygenated blood?',
          options: ['To the brain', 'To the liver', 'To the lungs', 'To the kidneys'],
          answerIndex: 2,
          explanation: 'The right ventricle pumps blood into the pulmonary artery heading to the lungs.'
        },
        {
          question: 'Roughly how many times does the human heart beat in a single day?',
          options: ['10,000 times', '50,000 times', '100,000 times', '500,000 times'],
          answerIndex: 2,
          explanation: 'At an average resting rate of 70 bpm, the heart beats around 100,000 times daily.'
        }
      ]
    }
  },

  sorting: {
    type: 'sorting',
    title: 'States of Matter Classification',
    instruction: 'Drag each substance or state into its corresponding state of matter bucket, or tap an item then tap a bucket.',
    theme: 'chalkboard',
    timer: { enabled: true, mode: 'countup' },
    lives: 3,
    data: {
      categories: [
        { id: 'solid', title: 'Solid', color: '#3b82f6', icon: '🧊' },
        { id: 'liquid', title: 'Liquid', color: '#06b6d4', icon: '💧' },
        { id: 'gas', title: 'Gas', color: '#f59e0b', icon: '💨' }
      ],
      items: [
        { text: 'Diamond Crystal', categoryId: 'solid' },
        { text: 'Molten Lava', categoryId: 'liquid' },
        { text: 'Water Vapor', categoryId: 'gas' },
        { text: 'Steel Beam', categoryId: 'solid' },
        { text: 'Olive Oil', categoryId: 'liquid' },
        { text: 'Helium Gas', categoryId: 'gas' },
        { text: 'Ice Cube', categoryId: 'solid' },
        { text: 'Carbon Dioxide', categoryId: 'gas' }
      ]
    }
  },

  cloze: {
    type: 'cloze',
    title: 'Principles of Newton\'s Laws of Motion',
    instruction: 'Fill in the blanks by clicking a word chip below and then clicking the corresponding slot in the text.',
    theme: 'midnight',
    timer: { enabled: true, mode: 'countup' },
    lives: 3,
    data: {
      text: 'Newton\'s First Law states that an object at {rest} will remain at rest unless acted upon by an external {force}. His Second Law defines force as the product of {mass} and {acceleration}. His Third Law states that for every action, there is an equal and opposite {reaction}.',
      distractors: ['gravity', 'velocity', 'momentum', 'friction']
    }
  },

  diagram: {
    type: 'diagram',
    title: 'Anatomy of an Angiosperm Flower',
    instruction: 'Select a botanical label from the right panel, then click its corresponding pin on the flower diagram.',
    theme: 'forest',
    timer: { enabled: false },
    lives: null,
    data: {
      diagramType: 'flower',
      diagramSvg: `
        <svg viewBox="0 0 600 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="400" fill="#f0fdf4" rx="16"/>
          <!-- Stem -->
          <path d="M300,380 C300,280 290,200 300,160" stroke="#16a34a" stroke-width="16" fill="none" stroke-linecap="round"/>
          <!-- Leaves -->
          <path d="M295,290 C220,280 170,310 150,335 C190,355 260,320 295,300" fill="#22c55e" stroke="#15803d" stroke-width="3"/>
          <path d="M305,240 C380,230 430,260 450,285 C410,305 340,270 305,250" fill="#22c55e" stroke="#15803d" stroke-width="3"/>
          <!-- Sepal -->
          <path d="M275,190 C285,175 315,175 325,190 C310,210 290,210 275,190 Z" fill="#15803d"/>
          <!-- Petals (Corolla) -->
          <circle cx="300" cy="95" r="52" fill="#ec4899" opacity="0.85"/>
          <circle cx="235" cy="130" r="52" fill="#ec4899" opacity="0.85"/>
          <circle cx="365" cy="130" r="52" fill="#ec4899" opacity="0.85"/>
          <circle cx="255" cy="195" r="52" fill="#ec4899" opacity="0.85"/>
          <circle cx="345" cy="195" r="52" fill="#ec4899" opacity="0.85"/>
          <!-- Pistil / Stigma (Female) -->
          <path d="M300,150 L300,105" stroke="#15803d" stroke-width="6" stroke-linecap="round"/>
          <circle cx="300" cy="100" r="10" fill="#a855f7"/>
          <!-- Stamens (Male) -->
          <path d="M285,150 Q270,120 275,110" stroke="#eab308" stroke-width="3" fill="none"/>
          <ellipse cx="275" cy="108" rx="5" ry="3" fill="#ca8a04"/>
          <path d="M315,150 Q330,120 325,110" stroke="#eab308" stroke-width="3" fill="none"/>
          <ellipse cx="325" cy="108" rx="5" ry="3" fill="#ca8a04"/>
          <!-- Center Receptacle -->
          <circle cx="300" cy="155" r="32" fill="#fbbf24" stroke="#d97706" stroke-width="4"/>
          <!-- Soil Base -->
          <ellipse cx="300" cy="385" rx="90" ry="12" fill="#78350f" opacity="0.3"/>
        </svg>
      `,
      labels: [
        { id: 'p1', name: 'Petal (Corolla)', x: 230, y: 95 },
        { id: 'p2', name: 'Pistil (Stigma)', x: 300, y: 95 },
        { id: 'p3', name: 'Stamen (Anther)', x: 345, y: 110 },
        { id: 'p4', name: 'Receptacle', x: 300, y: 155 },
        { id: 'p5', name: 'Stem (Pedicel)', x: 300, y: 220 },
        { id: 'p6', name: 'Foliage Leaf', x: 200, y: 310 }
      ]
    }
  },

  quiz: {
    type: 'quiz',
    title: 'Ultimate Astronomy Gameshow Quiz',
    instruction: 'Choose the correct answer before the clock runs out! Use the 50:50 lifeline if you get stuck.',
    theme: 'arcade',
    timer: { enabled: true, mode: 'countdown', seconds: 90 },
    lives: 3,
    data: {
      questions: [
        {
          question: 'What is the closest spiral galaxy to the Milky Way?',
          options: ['Triangulum Galaxy', 'Andromeda Galaxy', 'Sombrero Galaxy', 'Centaurus A'],
          answerIndex: 1
        },
        {
          question: 'Which planet possesses the most extensive ring system in our Solar System?',
          options: ['Jupiter', 'Uranus', 'Saturn', 'Neptune'],
          answerIndex: 2
        },
        {
          question: 'What astronomical unit measures the distance light travels in one Julian year?',
          options: ['Astronomical Unit (AU)', 'Light-year', 'Parsec', 'Megaparsec'],
          answerIndex: 1
        },
        {
          question: 'Which stellar body is formed when a massive star collapses under gravity, allowing no light to escape?',
          options: ['White Dwarf', 'Neutron Star', 'Black Hole', 'Red Supergiant'],
          answerIndex: 2
        }
      ]
    }
  },

  wheel: {
    type: 'wheel',
    title: 'Classroom Random Student & Question Spinner',
    instruction: 'Click SPIN to rotate the wheel and select a candidate randomly with authentic physics & ticking sounds!',
    theme: 'kids',
    timer: { enabled: false },
    data: {
      items: ['Team Apollo', 'Team Voyager', 'Team Hubble', 'Team Artemis', 'Team Galileo', 'Team Orion', 'Team Cassini']
    }
  },

  anagram: {
    type: 'anagram',
    title: 'Biology Terminology Unjumble',
    instruction: 'Click the scrambled letters to spell out the target scientific term described in the clue.',
    theme: 'default',
    timer: { enabled: true, mode: 'countup' },
    lives: 3,
    data: {
      clue: 'The fundamental biological process of cell division in eukaryotic cells that produces two identical daughter cells.',
      word: 'MITOSIS'
    }
  },

  speedtap: {
    type: 'speedtap',
    title: 'Speed Reflex: Prime Numbers Whack-A-Mole',
    instruction: 'Quickly tap ONLY the Prime numbers popping up out of the grid. Avoid composite numbers!',
    theme: 'arcade',
    timer: { enabled: true, mode: 'countdown', seconds: 45 },
    lives: 3,
    data: {
      instruction: '⚡ Tap only PRIME numbers! (2, 3, 5, 7, 11, 13, 17, 19...)',
      targets: ['2', '3', '5', '7', '11', '13', '17', '19', '23', '29', '31'],
      distractors: ['4', '6', '8', '9', '10', '12', '14', '15', '16', '18', '20', '21', '25', '27']
    }
  },

  crossword: {
    type: 'crossword',
    title: 'Zoology Mini Crossword',
    instruction: 'Fill in the animal names according to the across and down clues.',
    theme: 'paper',
    timer: { enabled: true, mode: 'countup' },
    data: {
      grid: [
        ['C', 'A', 'T', '#', '#'],
        ['O', '#', 'E', '#', '#'],
        ['W', '#', 'A', 'P', 'E'],
        ['#', '#', 'C', '#', '#'],
        ['#', '#', 'H', '#', '#']
      ],
      clues: [
        { num: 1, dir: 'across', clue: 'Purring domestic feline', answer: 'CAT' },
        { num: 1, dir: 'down', clue: 'Milk-producing domestic bovine', answer: 'COW' },
        { num: 2, dir: 'down', clue: 'School instructor who imparts knowledge', answer: 'TEACH' },
        { num: 3, dir: 'across', clue: 'Intelligent primate (Chimp, Gorilla, etc.)', answer: 'APE' }
      ]
    }
  },

  memory: {
    type: 'memory',
    title: 'Chemical Elements & Symbols Memory Match',
    instruction: 'Flip the 3D cards to find matching pairs of chemical elements and their periodic table symbols.',
    theme: 'midnight',
    timer: { enabled: true, mode: 'countup' },
    data: {
      pairs: [
        { a: 'Hydrogen', b: 'H' },
        { a: 'Helium', b: 'He' },
        { a: 'Carbon', b: 'C' },
        { a: 'Oxygen', b: 'O' },
        { a: 'Gold', b: 'Au' },
        { a: 'Silver', b: 'Ag' }
      ]
    }
  },

  balloon: {
    type: 'balloon',
    title: 'Balloon Pop: Vocabulary Synonyms',
    instruction: 'Pop only the balloons displaying synonyms for "DELIGHTED" before they float off the screen!',
    theme: 'kids',
    timer: { enabled: true, mode: 'countup' },
    lives: 3,
    data: {
      instruction: '🎈 Pop Synonyms for "DELIGHTED"!',
      targets: ['Joyful', 'Ecstatic', 'Thrilled', 'Elated', 'Gleeful', 'Overjoyed'],
      distractors: ['Miserable', 'Gloomy', 'Furious', 'Sorrowful', 'Dreary', 'Tired']
    }
  },

  airplane: {
    type: 'airplane',
    title: 'Cloud Pilot: Mental Math Navigator',
    instruction: 'Steer the airplane with Arrow Keys / W-S or Touch to fly through clouds with the correct math answer!',
    theme: 'default',
    timer: { enabled: true, mode: 'countup' },
    lives: 3,
    data: {
      questions: [
        { question: '8 × 7 = ?', options: ['56', '54', '64'], answerIndex: 0 },
        { question: '9 × 6 = ?', options: ['45', '54', '63'], answerIndex: 1 },
        { question: '12 × 4 = ?', options: ['44', '36', '48'], answerIndex: 2 },
        { question: '15 × 3 = ?', options: ['45', '35', '55'], answerIndex: 0 }
      ]
    }
  },

  openthebox: {
    type: 'openthebox',
    title: 'Mystery Vault: Open the Box',
    instruction: 'Tap a mystery box to open it, reveal the hidden knowledge challenge, and answer correctly!',
    theme: 'arcade',
    timer: { enabled: false },
    data: {
      boxes: [
        { num: 1, title: 'Box 1', question: 'What is the powerhouse organelle of the cell?', options: ['Ribosome', 'Mitochondria', 'Nucleus'], answerIndex: 1 },
        { num: 2, title: 'Box 2', question: 'What is the chemical formula for water?', options: ['CO2', 'NaCl', 'H2O'], answerIndex: 2 },
        { num: 3, title: 'Box 3', question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter'], answerIndex: 1 },
        { num: 4, title: 'Box 4', question: 'What is the speed of light in vacuum?', options: ['300,000 km/s', '150,000 km/s', '3,000 km/s'], answerIndex: 0 }
      ]
    }
  },

  hangman: {
    type: 'hangman',
    title: 'Rocket Fuel: Hangman Word Guesser',
    instruction: 'Guess the letters of the secret term to keep the rocket fueled and blast into orbit!',
    theme: 'midnight',
    timer: { enabled: true, mode: 'countup' },
    data: {
      clue: 'The largest mammal on planet Earth.',
      word: 'BLUE WHALE'
    }
  },

  mazechase: {
    type: 'mazechase',
    title: 'Pac-Man Maze Chase: Parts of Speech',
    instruction: 'Navigate the maze corridors with Arrow Keys or On-Screen buttons. Eat only the NOUNS while escaping the patrolling monsters!',
    theme: 'arcade',
    timer: { enabled: true, mode: 'countdown', seconds: 90 },
    lives: 3,
    data: {
      instruction: '👾 Eat only the NOUNS! Avoid the roaming monsters.',
      targets: ['Apple', 'Ocean', 'Rocket', 'Library'],
      distractors: ['Quickly', 'Glowing', 'Run', 'Ancient']
    }
  },

  venn: {
    type: 'venn',
    title: 'Venn Diagram: Cellular Bioenergetics',
    instruction: 'Classify each biochemical characteristic into Photosynthesis, Cellular Respiration, or Both (Overlap Zone).',
    theme: 'forest',
    timer: { enabled: true, mode: 'countup' },
    lives: 3,
    data: {
      circleA: { title: 'Photosynthesis', color: '#10b981' },
      circleB: { title: 'Cellular Respiration', color: '#3b82f6' },
      items: [
        { text: 'Produces Oxygen (O2)', zone: 'a' },
        { text: 'Uses Chlorophyll', zone: 'a' },
        { text: 'Occurs in Mitochondria', zone: 'b' },
        { text: 'Releases Carbon Dioxide (CO2)', zone: 'b' },
        { text: 'Synthesizes ATP Energy', zone: 'both' },
        { text: 'Essential for Living Cells', zone: 'both' }
      ]
    }
  },

  timeline: {
    type: 'timeline',
    title: 'Chronology: Breakthroughs in Human History',
    instruction: 'Drag and place each historical invention onto the chronological timeline slots from earliest to latest.',
    theme: 'chalkboard',
    timer: { enabled: true, mode: 'countup' },
    lives: 3,
    data: {
      instruction: 'Arrange human technological milestones in chronological sequence:',
      events: [
        { year: '3000 BCE', title: 'Invention of Writing', desc: 'Sumerian Cuneiform in Mesopotamia' },
        { year: '1440 CE', title: 'Gutenberg Printing Press', desc: 'Movable type revolutionized book production' },
        { year: '1769 CE', title: 'Steam Engine Patent', desc: 'James Watt sparked the Industrial Revolution' },
        { year: '1969 CE', title: 'Apollo 11 Moon Landing', desc: 'First humans walked on lunar surface' },
        { year: '1989 CE', title: 'World Wide Web Created', desc: 'Tim Berners-Lee at CERN' }
      ]
    }
  },

  scratch: {
    type: 'scratch',
    title: 'Mystery Artifact: Scratch & Reveal',
    instruction: 'Use your cursor/touch to scratch off the shimmering silver metallic foil and identify the hidden historical artifact!',
    theme: 'sunset',
    timer: { enabled: false },
    data: {
      clue: 'Scratch away the metallic foil with your cursor/finger to reveal the ancient artifact!',
      secretName: 'The Rosetta Stone',
      secretSvg: `
        <svg viewBox="0 0 600 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="380" fill="#1e293b" rx="16"/>
          <path d="M120,40 L480,40 L500,340 L100,340 Z" fill="#334155" stroke="#64748b" stroke-width="4"/>
          <text x="300" y="90" fill="#facc15" font-size="24" font-weight="bold" text-anchor="middle">𓇋𓈖𓊪𓅱 𓃠 𓆣 𓇋𓏏𓈖</text>
          <text x="300" y="140" fill="#38bdf8" font-size="18" font-family="serif" text-anchor="middle">THE ROSETTA STONE (196 BCE)</text>
          <text x="300" y="190" fill="#cbd5e1" font-size="14" text-anchor="middle">Unlocked the decipherment of Ancient Egyptian Hieroglyphics</text>
          <text x="300" y="230" fill="#94a3b8" font-size="13" text-anchor="middle">Key decree inscribed in Hieroglyphic, Demotic, and Ancient Greek</text>
          <circle cx="300" cy="290" r="28" fill="#eab308" opacity="0.9"/>
          <text x="300" y="296" fill="#000" font-size="18" font-weight="bold" text-anchor="middle">★</text>
        </svg>
      `,
      options: ['Rosetta Stone', 'Code of Hammurabi', 'Dead Sea Scrolls', 'Magna Carta'],
      answerIndex: 0
    }
  },

  scramble: {
    type: 'scramble',
    title: 'Sentence Scramble: Biology Syntax',
    instruction: 'Tap word chips to construct a scientifically accurate sentence describing cellular respiration.',
    theme: 'default',
    timer: { enabled: true, mode: 'countup' },
    lives: 3,
    data: {
      clue: 'Assemble the words into a correct scientific sentence:',
      sentence: 'Mitochondria convert glucose and oxygen into cellular energy.'
    }
  },

  bubbleshooter: {
    type: 'bubbleshooter',
    title: 'Math Bubble Cannon: Multiples of 5',
    instruction: 'Aim the bottom turret with your cursor or finger and tap/click to blast only bubbles containing multiples of 5!',
    theme: 'arcade',
    timer: { enabled: true, mode: 'countup' },
    lives: 3,
    data: {
      targetInstruction: 'Shoot multiples of 5! (15, 25, 40, 50, 65...)',
      bubbles: [
        { val: '25', isTarget: true }, { val: '14', isTarget: false }, { val: '40', isTarget: true },
        { val: '33', isTarget: false }, { val: '50', isTarget: true }, { val: '18', isTarget: false },
        { val: '15', isTarget: true }, { val: '22', isTarget: false }, { val: '65', isTarget: true }
      ]
    }
  }
};
